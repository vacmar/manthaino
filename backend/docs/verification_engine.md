# Psychometric Verification Engine

The Manthaino Verification Engine uses a reliability-adjusted evidence fusion model to verify learner proficiency. It goes beyond simple scoring by evaluating evidence against statistical reliability, measuring coverage, and computing discrepancy to route learners dynamically (Fast-Track vs. Remediation).

## 1. Mathematical Formula

The engine fuses multiple evidence submissions into a single **Verified Score (V)**.

- $s_i$ = Normalized evidence score in [0,1]
- $w_i$ = Evidence importance weight
- $r_i$ = Reliability factor (trust in the measurement instrument)

### Effective Weight ($q_i$)
The effective weight of any piece of evidence is scaled by its reliability:
$$q_i = w_i \times r_i$$

### Verified Score ($V$)
The final verified score is the weighted average of the evidence scores, using the effective weights:
$$V = \frac{\sum (q_i \times s_i)}{\sum q_i}$$

## 2. Operational Priors (MVP Configuration)

Current weights and reliabilities are defined in `app/core/config.py` as **MVP Operational Priors**. These are initial assumptions designed to be empirically calibrated against future learner outcome data.

| Source Type | Importance Weight ($w_i$) | Reliability Prior ($r_i$) |
|-------------|---------------------------|---------------------------|
| ASSESSMENT  | 0.45                      | 0.90                      |
| PRACTICAL   | 0.30                      | 0.85                      |
| PORTFOLIO   | 0.15                      | 0.70                      |
| COURSEWORK  | 0.10                      | 0.60                      |

## 3. Evidence Identity and Duplicate Attempts

To prevent artificial inflation of an instrument's weight through repeated attempts, the engine implements a **High-Water Mark Strategy**.

- **Identity**: Every submission has an `evidence_id` (the instrument) and an `attempt_id` (the unique submission).
- **Auditability**: All attempts are saved historically in `LearnerSkill.evidence_sources`.
- **Score Aggregation**: Before mathematical fusion, the engine clusters evidence by `evidence_id` and selects ONLY the attempt with the highest valid score ($s_i$).

## 4. Evidence Coverage

Coverage ensures the learner has demonstrated proficiency across diverse contexts (e.g., theory vs. practical). 
Coverage is **not** statistical confidence. It is the sum of importance weights for uniquely represented evidence categories.

$$Coverage = \sum_{\text{unique categories}} w_i$$
*(Capped at 1.0)*

## 5. Calibration and Discrepancy

The verification engine calculates a signed discrepancy ($D$) to identify how well the learner's self-assessed claims map to reality.

- $V$ = Verified Score
- $C$ = Claimed Score
- $D = V - C$

### Decision Boundaries
(Threshold = 0.20)

1. **$D < -0.20$ (OVERESTIMATED)**
   - Learner claimed high proficiency but verified low.
   - **Action**: `REMEDIATION`

2. **$|D| \le 0.20$ (ALIGNED)**
   - Learner accurately assessed their ability.
   - **Action**: `NORMAL_PATH`

3. **$D > +0.20$ (UNDERESTIMATED)**
   - Learner claimed low proficiency but verified high.
   - **Action**: `FAST_TRACK_PARTIAL` or `FAST_TRACK_FULL` (Depends on Coverage Gate).

## 6. Path Progression Integration

The verification engine acts strictly on the *skill* level. Progression mapping delegates back to the core node state machine (`app/services/progression_service.py`).

- **Remediation**: Forcefully transitions the active path node to `NodeStatus.REMEDIATION`.
- **Fast-Track / Aligned**: The calculated assessment score is routed through the existing `attempt_completion()` logic. The node will transition to `NodeStatus.COMPLETED` **only if** it satisfies the standard 80% passing threshold, thereby strictly preserving prerequisite architecture and standard node semantics.
