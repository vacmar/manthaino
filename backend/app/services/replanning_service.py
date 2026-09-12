import uuid
from datetime import UTC, datetime
from typing import Any

from app.models.domain import LearningPath, NodeStatus, PathNode
from app.repository import state_repo


def _get_target_role_requirements(learner_id: str) -> dict[str, float]:
    profile = state_repo.db.get("learner_profiles", {}).get(learner_id)
    if not profile:
        return {}
    role = state_repo.db.get("target_roles", {}).get(profile["target_role"])
    return role.get("required_skills", {}) if role else {}

def _get_available_course_for_skill(skill_id: str) -> dict[str, Any]:
    # In MVP, assume 1 course maps to 1 skill primarily for replanning simplicity
    for course_id, course in state_repo.db.get("courses", {}).items():
        if skill_id in course.get("taught_skills", []):
            return course
    return None

def _resolve_prerequisites_recursively(
    learner_id: str, 
    required_courses: set, 
    resolved_courses: set,
    proficiencies: dict[str, float]
):
    """
    Recursively pulls in prerequisite courses if their skills aren't mastered.
    """
    added_new = True
    while added_new:
        added_new = False
        current_reqs = list(required_courses)
        for course_id in current_reqs:
            prereqs = state_repo.get_prerequisites(course_id)
            for prereq in prereqs:
                req_skill = prereq["skill_id"]
                req_thresh = prereq["required_proficiency"]
                
                if proficiencies.get(req_skill, 0.0) < req_thresh:
                    prereq_course = _get_available_course_for_skill(req_skill)
                    if prereq_course and prereq_course["course_id"] not in required_courses:
                        required_courses.add(prereq_course["course_id"])
                        added_new = True

def _rank_courses(courses: list[dict[str, Any]], proficiencies: dict[str, float], target_reqs: dict[str, float]) -> list[str]:
    """
    Ranks courses using the Phase 8 ranking logic.
    For dependencies, a simple topological sort or relying on 'prerequisite validity'
    can be used. Since the prompt asks to use Phase 8 weights:
    0.35 gap reduction, 0.25 career relevance, 0.15 prereq validity, 0.15 time eff, 0.10 diff fit
    """
    scored = []
    for course in courses:
        course_id = course["course_id"]
        
        # 1. Gap reduction (max gap of taught skills)
        max_gap = 0.0
        for skill in course.get("taught_skills", []):
            target = target_reqs.get(skill, 0.0)
            current = proficiencies.get(skill, 0.0)
            gap = max(0.0, target - current)
            max_gap = max(max_gap, gap)
            
        score = 0.35 * max_gap
        score += 0.25 * course.get("career_relevance", 0.5)
        
        # Prerequisite validity (are its prereqs met among already mastered skills?)
        # For simplicity, if prereqs are met, validity is 1.0, else 0.0
        prereqs = state_repo.get_prerequisites(course_id)
        prereqs_met = all(proficiencies.get(p["skill_id"], 0.0) >= p["required_proficiency"] for p in prereqs)
        score += 0.15 * (1.0 if prereqs_met else 0.0)
        
        score += 0.15 * course.get("time_efficiency", 0.5)
        score += 0.10 * course.get("difficulty_fit", 0.5)
        
        scored.append((course_id, score))
        
    # Sort descending by score. To ensure prerequisites come first if tied or close, 
    # we do a stable dependency-aware sort.
    scored.sort(key=lambda x: x[1], reverse=True)
    
    # Topological sort enforcement: prereqs must appear before dependents.
    # We iteratively pull courses whose prereqs are either met by proficiencies OR already in the sorted_result.
    final_sequence = []
    remaining = [c[0] for c in scored]
    
    # Track skills we conceptually 'gain' as we go through the sequence
    simulated_prof = proficiencies.copy()
    
    while remaining:
        moved_any = False
        for cid in list(remaining):
            prereqs = state_repo.get_prerequisites(cid)
            can_take = all(simulated_prof.get(p["skill_id"], 0.0) >= p["required_proficiency"] for p in prereqs)
            
            if can_take:
                final_sequence.append(cid)
                remaining.remove(cid)
                course = state_repo.db["courses"][cid]
                for skill in course.get("taught_skills", []):
                    # Simulate mastering the skill to 1.0
                    simulated_prof[skill] = 1.0
                moved_any = True
                break
                
        if not moved_any:
            # Cycle or unresolved prereq. Just append the first remaining one to break the deadlock.
            final_sequence.append(remaining.pop(0))
            
    return final_sequence

def regenerate_path(learner_id: str, current_path_id: str) -> dict[str, Any]:
    active_path = state_repo.get_active_path(learner_id)
    if not active_path:
        raise ValueError("No active path found for learner")
        
    if active_path.path_id != current_path_id:
        raise ValueError("Supplied path_id is not the active path")
        
    nodes = state_repo.get_nodes_for_path(current_path_id)
    nodes.sort(key=lambda n: n.sequence_order)
    
    # 1. Preserve History (COMPLETED and IN_PROGRESS)
    preserved_nodes = []
    preserved_course_ids = set()
    for n in nodes:
        if n.status in [NodeStatus.COMPLETED, NodeStatus.IN_PROGRESS]:
            preserved_nodes.append(n)
            preserved_course_ids.add(n.course_id)
            
    # 2. Get Proficiencies & Gaps
    proficiencies = {}
    for skill_id in state_repo.db.get("skills", {}).keys():
        prof = state_repo.get_learner_proficiency(learner_id, skill_id)
        proficiencies[skill_id] = prof["proficiency"]
        
    target_reqs = _get_target_role_requirements(learner_id)
    
    # 3. Identify required courses
    required_courses = set()
    for skill, target in target_reqs.items():
        if proficiencies.get(skill, 0.0) < target:
            course = _get_available_course_for_skill(skill)
            if course and course["course_id"] not in preserved_course_ids:
                required_courses.add(course["course_id"])
                
    # 4. Resolve Prerequisites Recursively
    _resolve_prerequisites_recursively(learner_id, required_courses, preserved_course_ids, proficiencies)
    
    # Remove any required_courses that are already in preserved_course_ids
    required_courses = required_courses - preserved_course_ids
    
    # 5. Rank & Sequence remaining
    course_objects = [state_repo.db["courses"][cid] for cid in required_courses]
    new_course_sequence = _rank_courses(course_objects, proficiencies, target_reqs)
    
    # 6. Check if effective plan changed
    old_future_courses = [n.course_id for n in nodes if n.status not in [NodeStatus.COMPLETED, NodeStatus.IN_PROGRESS]]
    
    if new_course_sequence == old_future_courses:
        return {
            "path_id": current_path_id,
            "version": active_path.version,
            "previous_path_id": active_path.previous_path_id,
            "changed": False,
            "nodes": [n.model_dump() for n in nodes],
            "changes": [],
            "proficiency_changes": []
        }
        
    # 7. Create New Path Version
    new_path_id = uuid.uuid4().hex
    new_version = active_path.version + 1
    
    new_path = LearningPath(
        path_id=new_path_id,
        learner_id=learner_id,
        version=new_version,
        previous_path_id=current_path_id,
        created_at=datetime.now(UTC).isoformat(),
        is_active=True
    )
    
    # Deactivate old
    active_path.is_active = False
    
    # Create new nodes
    new_nodes = []
    seq = 1
    for p_node in preserved_nodes:
        # Clone it with new path_id
        cloned = PathNode(
            node_id=p_node.node_id, # Keep node_id or generate new? Keep same node_id means it's the exact same node instance history
            path_id=new_path_id,
            course_id=p_node.course_id,
            sequence_order=seq,
            status=p_node.status
        )
        new_nodes.append(cloned)
        seq += 1
        
    for cid in new_course_sequence:
        new_node_id = uuid.uuid4().hex
        new_node = PathNode(
            node_id=new_node_id,
            path_id=new_path_id,
            course_id=cid,
            sequence_order=seq,
            status=NodeStatus.LOCKED
        )
        new_nodes.append(new_node)
        seq += 1
        
    # Persist
    state_repo.save_path(new_path)
    for n in new_nodes:
        state_repo.update_node(n)
        
    # Generate structured facts
    changes = []
    old_set = set(old_future_courses)
    new_set = set(new_course_sequence)
    
    for c in old_set - new_set:
        changes.append({
            "type": "NODE_REMOVED",
            "course_id": c,
            "reason": "PREREQUISITE_MASTERY" # Or no longer required
        })
        
    for c in new_set - old_set:
        changes.append({
            "type": "NODE_ADDED",
            "course_id": c,
            "reason": "NEWLY_ELIGIBLE" # Or newly required
        })
        
    # We could also add PROFICIENCY_CHANGE facts if we track the delta since last replan, 
    # but for MVP we can just list current proficiencies.
    prof_changes = []
    
    return {
        "path_id": new_path_id,
        "version": new_version,
        "previous_path_id": current_path_id,
        "changed": True,
        "nodes": [n.model_dump() for n in new_nodes],
        "changes": changes,
        "proficiency_changes": prof_changes
    }
