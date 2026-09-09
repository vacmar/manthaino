from datetime import datetime
from typing import Dict, Any, List, Tuple
from app.models.domain import LearnerSkill, EvidenceSource, ProficiencyLevel
from app.core import config

class VerificationEngine:

    @staticmethod
    def get_proficiency_level(score: float) -> ProficiencyLevel:
        if score < 0.20:
            return ProficiencyLevel.NONE
        elif score < 0.40:
            return ProficiencyLevel.BEGINNER
        elif score < 0.60:
            return ProficiencyLevel.BASIC
        elif score < 0.75:
            return ProficiencyLevel.INTERMEDIATE
        elif score < 0.90:
            return ProficiencyLevel.ADVANCED
        else:
            return ProficiencyLevel.EXPERT

    @staticmethod
    def fuse_evidence(sources: List[EvidenceSource]) -> Tuple[float, float]:
        if not sources:
            return 0.0, 0.0

        # Filter for highest score per evidence_id
        best_sources = {}
        for s in sources:
            if s.evidence_id not in best_sources:
                best_sources[s.evidence_id] = s
            else:
                if s.score > best_sources[s.evidence_id].score:
                    best_sources[s.evidence_id] = s

        sum_q = 0.0
        sum_q_s = 0.0
        
        represented_categories = {}

        for s in best_sources.values():
            q = s.weight * s.reliability
            sum_q += q
            sum_q_s += (q * s.score)
            
            if s.source_type not in represented_categories:
                represented_categories[s.source_type] = s.weight

        if sum_q == 0:
            return 0.0, 0.0

        fused_score = sum_q_s / sum_q
        total_coverage = sum(represented_categories.values())
        return fused_score, min(total_coverage, 1.0)

    @staticmethod
    def verify_skill(learner_skill: LearnerSkill, new_evidence: List[EvidenceSource]) -> Dict[str, Any]:
        # Idempotency check: Don't append if attempt_id is already present
        existing_attempt_ids = {s.attempt_id for s in learner_skill.evidence_sources}
        for s in new_evidence:
            if s.attempt_id not in existing_attempt_ids:
                learner_skill.evidence_sources.append(s)

        learner_skill.last_assessed = datetime.utcnow()

        fused_score, coverage = VerificationEngine.fuse_evidence(learner_skill.evidence_sources)
        learner_skill.verified_score = fused_score
        learner_skill.coverage = coverage

        signed_discrepancy = learner_skill.verified_score - learner_skill.claimed_score
        
        result = {
            "verified_score": learner_skill.verified_score,
            "coverage": learner_skill.coverage,
            "proficiency_level": VerificationEngine.get_proficiency_level(learner_skill.verified_score).value,
            "calibration": "ALIGNED",
            "action": None,
            "signed_discrepancy": signed_discrepancy,
            "message": "Self-assessment aligns with verified evidence."
        }

        if signed_discrepancy < -config.DISCREPANCY_THRESHOLD:
            result["calibration"] = "OVERESTIMATED"
            result["action"] = "REMEDIATION"
            result["message"] = f"Claimed {learner_skill.claimed_score:.2f} but verified at {learner_skill.verified_score:.2f}. Adaptive remediation triggered."
        
        elif signed_discrepancy > config.DISCREPANCY_THRESHOLD:
            result["calibration"] = "UNDERESTIMATED"
            if learner_skill.coverage >= config.FAST_TRACK_COVERAGE_GATE:
                result["action"] = "FAST_TRACK_FULL"
                result["message"] = f"Verified at {learner_skill.verified_score:.2f}, exceeding claimed {learner_skill.claimed_score:.2f}. Full fast-track unlocked."
            else:
                result["action"] = "FAST_TRACK_PARTIAL"
                result["message"] = f"Verified at {learner_skill.verified_score:.2f}, exceeding claimed {learner_skill.claimed_score:.2f}. Partial fast-track eligible, but more evidence coverage (currently {learner_skill.coverage:.2f}) required for full unlock."
            
        return result
