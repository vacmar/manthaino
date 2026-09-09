import math
import pytest
from app.models.domain import LearnerSkill, EvidenceSource, PathNode, NodeStatus, ProficiencyLevel
from app.services.verification import VerificationEngine
from app.services.progression_service import process_verification
from app.core import config
from app.repository import state_repo
from pydantic import ValidationError

def get_base_learner():
    return LearnerSkill(
        learner_id="u1",
        skill_id="s1",
        claimed_score=0.50
    )

def setup_function():
    state_repo.db["nodes"].clear()
    state_repo.db["prerequisites"].clear()
    node = PathNode(node_id="n1", path_id="p1", course_id="c1", sequence_order=1, status=NodeStatus.IN_PROGRESS)
    state_repo.update_node(node)

# 1. No evidence
def test_no_evidence():
    skill = get_base_learner()
    res = VerificationEngine.verify_skill(skill, [])
    assert res["verified_score"] == 0.0
    assert res["coverage"] == 0.0

# 2. Assessment only
def test_assessment_only():
    skill = get_base_learner()
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.90)]
    res = VerificationEngine.verify_skill(skill, ev)
    assert res["coverage"] == 0.45
    assert res["verified_score"] == 0.9

# 3. Assessment + Practical
def test_assessment_practical():
    skill = get_base_learner()
    ev = [
        EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.90),
        EvidenceSource(evidence_id="p1", attempt_id="at2", source_type="PRACTICAL", score=0.8, weight=0.30, reliability=0.85)
    ]
    res = VerificationEngine.verify_skill(skill, ev)
    assert res["coverage"] == 0.75
    assert res["verified_score"] > 0.8 # Weighted fusion

# 4. External Evidence
def test_external_only():
    skill = get_base_learner()
    ev = [EvidenceSource(evidence_id="e1", attempt_id="at1", source_type="EXTERNAL", score=1.0, weight=0.15, reliability=0.70)]
    res = VerificationEngine.verify_skill(skill, ev)
    assert res["coverage"] == 0.15
    assert res["verified_score"] == 1.0

# 5. Coursework
def test_coursework_only():
    skill = get_base_learner()
    ev = [EvidenceSource(evidence_id="c1", attempt_id="at1", source_type="COURSEWORK", score=1.0, weight=0.10, reliability=0.60)]
    res = VerificationEngine.verify_skill(skill, ev)
    assert res["coverage"] == 0.10

# 6. All evidence categories
def test_all_evidence():
    skill = get_base_learner()
    ev = [
        EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=1.0, weight=0.45, reliability=0.90),
        EvidenceSource(evidence_id="p1", attempt_id="at2", source_type="PRACTICAL", score=1.0, weight=0.30, reliability=0.85),
        EvidenceSource(evidence_id="e1", attempt_id="at3", source_type="EXTERNAL", score=1.0, weight=0.15, reliability=0.70),
        EvidenceSource(evidence_id="c1", attempt_id="at4", source_type="COURSEWORK", score=1.0, weight=0.10, reliability=0.60)
    ]
    res = VerificationEngine.verify_skill(skill, ev)
    assert res["coverage"] == 1.0
    assert res["verified_score"] == 1.0

# 7. Repeated Identical API Request (Idempotency)
def test_repeated_api_request():
    skill = get_base_learner()
    ev1 = EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.5, weight=0.45, reliability=0.90)
    VerificationEngine.verify_skill(skill, [ev1])
    assert len(skill.evidence_sources) == 1
    
    # Resubmit exact same attempt_id
    ev2 = EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.90)
    VerificationEngine.verify_skill(skill, [ev2])
    
    # Still 1 because attempt_id is identical
    assert len(skill.evidence_sources) == 1
    assert skill.verified_score == 0.5 # Kept original

# 8. Best-Score Retention / High Water Mark
def test_best_score_retention():
    skill = get_base_learner()
    ev1 = EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.5, weight=0.45, reliability=0.90)
    VerificationEngine.verify_skill(skill, [ev1])
    
    ev2 = EvidenceSource(evidence_id="a1", attempt_id="at2", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.90)
    res = VerificationEngine.verify_skill(skill, [ev2])
    
    # History preserved, but coverage remains capped, and score fuses only the 0.9
    assert len(skill.evidence_sources) == 2
    assert res["coverage"] == 0.45
    assert res["verified_score"] == 0.9
    
    # Submit a worse one
    ev3 = EvidenceSource(evidence_id="a1", attempt_id="at3", source_type="ASSESSMENT", score=0.2, weight=0.45, reliability=0.90)
    res = VerificationEngine.verify_skill(skill, [ev3])
    
    assert len(skill.evidence_sources) == 3
    assert res["verified_score"] == 0.9 # High water mark used

# 9. Different Assessment Scopes
def test_different_assessment_scopes():
    skill = get_base_learner()
    ev1 = EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.5, weight=0.45, reliability=0.90)
    VerificationEngine.verify_skill(skill, [ev1])
    
    ev2 = EvidenceSource(evidence_id="a2", attempt_id="at2", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.90)
    res = VerificationEngine.verify_skill(skill, [ev2])
    
    # Coverage is capped at 0.45 for ASSESSMENT, but both independent instruments fuse
    assert len(skill.evidence_sources) == 2
    assert res["coverage"] == 0.45
    assert math.isclose(res["verified_score"], 0.7) # (0.5 + 0.9) / 2

# 10. Overestimation (Remediation)
def test_overestimation():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.9)
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.4, weight=0.45, reliability=0.9)]
    res = VerificationEngine.verify_skill(skill, ev)
    
    assert res["calibration"] == "OVERESTIMATED"
    assert res["action"] == "REMEDIATION"

# 11. Underestimation (Fast-track partial)
def test_underestimation_partial():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.1)
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.9)]
    res = VerificationEngine.verify_skill(skill, ev)
    
    assert res["calibration"] == "UNDERESTIMATED"
    assert res["action"] == "FAST_TRACK_PARTIAL" # Because coverage is 0.45 < 0.70

# 12. Underestimation (Fast-track full)
def test_underestimation_full():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.1)
    ev = [
        EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.9),
        EvidenceSource(evidence_id="p1", attempt_id="at2", source_type="PRACTICAL", score=0.9, weight=0.30, reliability=0.85)
    ]
    res = VerificationEngine.verify_skill(skill, ev)
    
    assert res["calibration"] == "UNDERESTIMATED"
    assert res["action"] == "FAST_TRACK_FULL" # Coverage is 0.75 >= 0.70

# 13. Exact Discrepancy boundary
def test_exact_discrepancy_boundary():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.5)
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.7, weight=0.45, reliability=0.9)]
    res = VerificationEngine.verify_skill(skill, ev)
    
    # 0.7 - 0.5 = 0.2, which is <= 0.20, so ALIGNED
    assert res["calibration"] == "ALIGNED"

# 14. Zero Reliability / Weight
def test_zero_reliability_weight():
    skill = get_base_learner()
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.0, reliability=0.0)]
    res = VerificationEngine.verify_skill(skill, ev)
    assert res["verified_score"] == 0.0

# 15. Invalid node (Error Handling)
def test_invalid_node():
    skill = get_base_learner()
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.90)]
    res = VerificationEngine.verify_skill(skill, ev)
    
    with pytest.raises(ValueError):
        process_verification("invalid_node", res, assessment_score=0.9)

# 16. State Mutation - Remediation
def test_state_mutation_remediation():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.9)
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.2, weight=0.45, reliability=0.9)]
    res = VerificationEngine.verify_skill(skill, ev)
    
    process_verification("n1", res, assessment_score=0.2)
    assert state_repo.get_node("n1").status == NodeStatus.REMEDIATION

# 17. State Mutation - Standard progression threshold failure
def test_state_mutation_aligned_but_failed_assessment():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.5)
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.6, weight=0.45, reliability=0.9)]
    res = VerificationEngine.verify_skill(skill, ev) # Aligned
    
    # Aligned, but attempt_completion requires 80%, so it should remediate
    process_verification("n1", res, assessment_score=0.6)
    assert state_repo.get_node("n1").status == NodeStatus.REMEDIATION

# 18. State Mutation - Standard progression success
def test_state_mutation_aligned_success():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.8)
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.9)]
    res = VerificationEngine.verify_skill(skill, ev) # Aligned
    
    process_verification("n1", res, assessment_score=0.9, practical_score=1.0) # Assume practical passed
    assert state_repo.get_node("n1").status == NodeStatus.COMPLETED

# 19. Proficiency boundaries
def test_proficiency_boundaries():
    assert VerificationEngine.get_proficiency_level(0.19) == ProficiencyLevel.NONE
    assert VerificationEngine.get_proficiency_level(0.39) == ProficiencyLevel.BEGINNER
    assert VerificationEngine.get_proficiency_level(0.59) == ProficiencyLevel.BASIC
    assert VerificationEngine.get_proficiency_level(0.74) == ProficiencyLevel.INTERMEDIATE
    assert VerificationEngine.get_proficiency_level(0.89) == ProficiencyLevel.ADVANCED
    assert VerificationEngine.get_proficiency_level(0.95) == ProficiencyLevel.EXPERT

# 20. 0.0 scores
def test_zero_scores():
    skill = get_base_learner()
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.0, weight=0.45, reliability=0.90)]
    res = VerificationEngine.verify_skill(skill, ev)
    assert res["verified_score"] == 0.0

# 21. 1.0 scores
def test_one_scores():
    skill = get_base_learner()
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=1.0, weight=0.45, reliability=0.90)]
    res = VerificationEngine.verify_skill(skill, ev)
    assert res["verified_score"] == 1.0

# 22. Historical attempt preservation (Length grows, coverage doesn't)
def test_historical_attempt_preservation():
    skill = get_base_learner()
    VerificationEngine.verify_skill(skill, [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.5, weight=0.45, reliability=0.90)])
    VerificationEngine.verify_skill(skill, [EvidenceSource(evidence_id="a1", attempt_id="at2", source_type="ASSESSMENT", score=0.6, weight=0.45, reliability=0.90)])
    VerificationEngine.verify_skill(skill, [EvidenceSource(evidence_id="a1", attempt_id="at3", source_type="ASSESSMENT", score=0.7, weight=0.45, reliability=0.90)])
    
    assert len(skill.evidence_sources) == 3
    assert skill.coverage == 0.45 # Does not inflate
    
# 23. Missing practical score in API progression
def test_missing_practical_progression():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.8)
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.90)]
    res = VerificationEngine.verify_skill(skill, ev)
    
    # Passing no practical_score (None) means attempt_completion fails the 80% practical rule
    process_verification("n1", res, assessment_score=0.9, practical_score=None)
    assert state_repo.get_node("n1").status == NodeStatus.REMEDIATION

# 24. Progression state mutation (Explicit)
def test_progression_state_mutation():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.8)
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.85, weight=0.45, reliability=0.90)]
    res = VerificationEngine.verify_skill(skill, ev) # Aligned
    
    process_verification("n1", res, assessment_score=0.85, practical_score=1.0)
    assert state_repo.get_node("n1").status == NodeStatus.COMPLETED

# 25. Remediation state mutation (Explicit)
def test_remediation_state_mutation():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.9) # claims expert
    ev = [EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.3, weight=0.45, reliability=0.90)]
    res = VerificationEngine.verify_skill(skill, ev) # OVERESTIMATED -> Remediation
    
    process_verification("n1", res, assessment_score=0.3, practical_score=0.3)
    assert state_repo.get_node("n1").status == NodeStatus.REMEDIATION

# 26. Fast-track state mutation (Explicit)
def test_fast_track_state_mutation():
    skill = LearnerSkill(learner_id="u1", skill_id="s1", claimed_score=0.1) # claims beginner
    ev = [
        EvidenceSource(evidence_id="a1", attempt_id="at1", source_type="ASSESSMENT", score=0.9, weight=0.45, reliability=0.90),
        EvidenceSource(evidence_id="p1", attempt_id="at2", source_type="PRACTICAL", score=0.9, weight=0.30, reliability=0.85)
    ]
    res = VerificationEngine.verify_skill(skill, ev) # UNDERESTIMATED -> Fast-Track Full
    
    # Process with the real scores
    process_verification("n1", res, assessment_score=0.9, practical_score=0.9)
    # The fast-track succeeds because the assessment_score >= 80% and practical >= 80%
    assert state_repo.get_node("n1").status == NodeStatus.COMPLETED

