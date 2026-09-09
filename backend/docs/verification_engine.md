# Psychometric Verification Engine

The Manthaino Verification Engine verifies learner proficiency by combining multiple evidence sources using a **reliability-adjusted weighted evidence fusion model**.

Rather than relying on a single assessment score, the engine:

1. Aggregates available learner evidence.
2. Adjusts evidence importance by its reliability.
3. Produces a verified proficiency score.
4. Measures evidence coverage across distinct evidence categories.
5. Compares verified proficiency against the learner's self-assessed claim.
6. Classifies the learner as **overestimated, aligned, or underestimated**.
7. Routes the learner to remediation, the normal path, or a fast-track path.
8. Delegates actual node progression to the existing Manthaino progression state machine.

The verification engine operates at the **skill/evidence level**. It does not replace the existing node completion or prerequisite logic.

---

## 1. Mathematical Model

Each evidence source is represented by three primary quantities:

* \(s_i\) — normalized evidence score in \([0,1]\)
* \(w_i\) — importance weight of the evidence category
* \(r_i\) — reliability factor representing the assumed trustworthiness of the measurement source

### 1.1 Effective Evidence Weight

The effective weight of an evidence source is:

$$
q_i = w_i \times r_i
$$

This prevents a high-importance evidence category from receiving its full influence when its measurement reliability is lower.

### 1.2 Verified Score

The verified proficiency score is the reliability-adjusted weighted mean:

$$
V =
\frac{\sum_i(q_i \times s_i)}
{\sum_i q_i}
$$

where:

* \(V \in [0,1]\)
* \(q_i\) is the effective evidence weight
* \(s_i\) is the normalized score for the contributing evidence source

The resulting score represents the engine's current estimate of demonstrated proficiency.

---

## 2. Evidence Source Configuration

The current configuration is defined centrally in:

```text
app/core/config.py
```

The values below are **MVP operational priors**, not empirically validated psychometric constants.

| Source Type  | Importance \(w_i\) | Reliability \(r_i\) | Effective Weight \(q_i\) |
| ------------ | -----------------: | ------------------: | -----------------------: |
| `ASSESSMENT` |               0.45 |                0.90 |                    0.405 |
| `PRACTICAL`  |               0.30 |                0.85 |                    0.255 |
| `PORTFOLIO`  |               0.15 |                0.70 |                    0.105 |
| `COURSEWORK` |               0.10 |                0.60 |                    0.060 |

The importance weights sum to:

$$
0.45 + 0.30 + 0.15 + 0.10 = 1.00
$$

The reliability factors modify the influence of each category but do not themselves represent statistical confidence intervals.

### 2.1 Calibration Policy

These values are intended to provide a defensible starting point for the MVP.

They should eventually be calibrated against Manthaino outcome data, such as:

* subsequent assessment performance
* practical-task performance
* successful node completion
* downstream skill performance
* false-positive and false-negative verification decisions

The configuration should therefore be treated as **calibratable model parameters**, not permanent constants.

---

## 3. Evidence Identity and Attempt Handling

The engine distinguishes between an **evidence instrument** and an individual **attempt**.

### `evidence_id`

Identifies the underlying evidence instrument or assessment scope.

Examples:

```text
python-basics-assessment
python-loops-practical
portfolio-project-01
```

### `attempt_id`

Identifies one unique submission/attempt against that evidence instrument.

This distinction allows the system to preserve historical learner activity without allowing repeated submissions to artificially increase the influence of an evidence category.

---

## 4. Historical Evidence and High-Water Mark

All valid attempts remain available for historical/audit purposes.

However, the current verification calculation uses a **high-water mark strategy** for each `evidence_id`.

For a given evidence instrument:

$$
s_{current} = \max(s_1,s_2,\ldots,s_n)
$$

Only the highest valid score for that `evidence_id` contributes to the current fusion calculation.

### Example

Suppose the learner submits:

| Evidence ID         | Attempt | Score |
| ------------------- | ------- | ----: |
| `python-assessment` | A1      |  0.60 |
| `python-assessment` | A2      |  0.72 |
| `python-assessment` | A3      |  0.65 |

All three attempts remain in history.

The current contribution is:

```text
python-assessment → 0.72
```

The learner therefore cannot increase the influence of the assessment category simply by submitting the same instrument repeatedly.

### 4.1 Idempotency

Repeated requests with the same `attempt_id` are treated as the same submission.

The engine must not create duplicate effective evidence from an identical API request.

This provides protection against:

* client retries
* network retries
* accidental duplicate submissions
* repeated API calls

---

## 5. Evidence Coverage

Evidence coverage measures whether the learner has demonstrated the skill across **different evidence categories**.

Coverage is calculated from the importance weights of uniquely represented source types:

$$
Coverage =
\min\left(
1.0,
\sum_{\text{unique source types}} w_i
\right)
$$

For example:

### Assessment only

$$
Coverage = 0.45
$$

### Assessment + Practical

$$
Coverage = 0.45 + 0.30 = 0.75
$$

### Assessment + Practical + Portfolio

$$
Coverage = 0.45 + 0.30 + 0.15 = 0.90
$$

### All four categories

$$
Coverage = 1.00
$$

### Important distinction

**Coverage is not statistical confidence.**

It does not mean that a learner with 75% coverage has a 75% probability of being correctly assessed.

Instead, coverage is an operational measure of **evidence diversity**.

A learner demonstrated through multiple evidence modalities has broader supporting evidence than a learner represented by only one modality.

---

## 6. Proficiency Classification

The verified score \(V\) is mapped to an operational proficiency band.

| Verified Score | Proficiency    |
| -------------: | -------------- |
|      0.00–0.19 | `NONE`         |
|      0.20–0.39 | `BEGINNER`     |
|      0.40–0.59 | `BASIC`        |
|      0.60–0.74 | `INTERMEDIATE` |
|      0.75–0.89 | `ADVANCED`     |
|      0.90–1.00 | `EXPERT`       |

These bands are an application-level representation of the continuous verified score.

They should not be interpreted as independently validated psychometric cut scores.

---

## 7. Self-Assessment Calibration

The learner's claimed proficiency is represented by:

$$
C \in [0,1]
$$

The engine compares the verified score with the learner's claim using a **signed discrepancy**:

$$
D = V - C
$$

The sign is important because it identifies the direction of the mismatch.

### 7.1 Overestimated

$$
D < -0.20
$$

The learner's claim is substantially higher than the verified evidence.

```text
Action = REMEDIATION
```

Example:

```text
Claimed  = 0.90
Verified = 0.40

D = 0.40 - 0.90
D = -0.50
```

The learner is classified as:

```text
OVERESTIMATED
```

and routed to remediation.

### 7.2 Aligned

$$
|D| \leq 0.20
$$

The learner's claim is sufficiently close to the verified evidence.

```text
Action = NORMAL_PATH
```

Example:

```text
Claimed  = 0.55
Verified = 0.70

D = 0.70 - 0.55
D = +0.15
```

The learner is classified as:

```text
ALIGNED
```

### 7.3 Underestimated

$$
D > +0.20
$$

The learner's demonstrated proficiency substantially exceeds their self-assessment.

```text
Action = FAST_TRACK
```

The fast-track action is further divided using the evidence coverage gate.

---

## 8. Fast-Track Coverage Gate

The current fast-track coverage gate is:

$$
Coverage_{gate} = 0.70
$$

This is defined centrally in:

```text
app/core/config.py
```

For an underestimated learner:

### Partial Fast-Track

$$
D > 0.20
\quad\text{and}\quad
Coverage < 0.70
$$

Result:

```text
FAST_TRACK_PARTIAL
```

The learner has evidence indicating stronger-than-claimed proficiency, but the evidence does not cover enough distinct categories for a full fast-track decision.

### Full Fast-Track

$$
D > 0.20
\quad\text{and}\quad
Coverage \geq 0.70
$$

Result:

```text
FAST_TRACK_FULL
```

The learner has both:

* substantially stronger verified proficiency than claimed, and
* sufficient evidence diversity for the full fast-track decision.

---

## 9. Decision Matrix

| Condition                      | Classification   | Verification Action  |
| ------------------------------ | ---------------- | -------------------- |
| \(D < -0.20\)                  | `OVERESTIMATED`  | `REMEDIATION`        |
| \(-0.20 \leq D \leq +0.20\)    | `ALIGNED`        | `NORMAL_PATH`        |
| \(D > +0.20\), Coverage < 0.70 | `UNDERESTIMATED` | `FAST_TRACK_PARTIAL` |
| \(D > +0.20\), Coverage ≥ 0.70 | `UNDERESTIMATED` | `FAST_TRACK_FULL`    |

The exact boundary is intentionally inclusive on the aligned side:

$$
D = -0.20 \Rightarrow ALIGNED
$$

$$
D = +0.20 \Rightarrow ALIGNED
$$

---

## 10. Progression Integration

The verification engine does **not** independently implement the learner's complete progression graph.

Progression is delegated to:

```text
app/services/progression_service.py
```

which remains responsible for the existing node state machine and prerequisite architecture.

This separation is intentional:

```text
Verification Engine
        │
        │ skill-level decision
        ▼
Progression Service
        │
        │ state transition
        ▼
Node State Machine
        │
        │ prerequisite evaluation
        ▼
Unlock Logic
```

### 10.1 Remediation

When verification returns:

```text
REMEDIATION
```

the active node is transitioned to:

```text
NodeStatus.REMEDIATION
```

This indicates that the learner requires remediation before continuing through the normal progression path.

### 10.2 Aligned Path

When verification returns:

```text
ALIGNED
```

the learner remains on the standard progression path.

The verification engine does not automatically mark the node complete merely because the learner is aligned.

The existing assessment completion rules remain authoritative.

### 10.3 Fast-Track

When verification returns:

```text
FAST_TRACK_PARTIAL
```

or:

```text
FAST_TRACK_FULL
```

the progression service routes the learner through the existing completion and unlock logic.

The existing node completion requirement remains in force.

In particular, the current assessment completion rule requires the relevant assessment score to satisfy the existing **80% passing threshold** before the node transitions to:

```text
NodeStatus.COMPLETED
```

Therefore:

> `FAST_TRACK_FULL` is a verification decision. It does not mean that every downstream node is automatically unlocked.

Actual progression remains constrained by the existing prerequisite and state-machine rules.

---

## 11. Separation of Verification and Completion

The system intentionally distinguishes between:

### Verified proficiency

A continuous estimate:

```text
V ∈ [0,1]
```

representing the learner's demonstrated skill level.

### Node completion

A state-machine transition:

```text
NodeStatus → COMPLETED
```

that occurs only when the existing node completion requirements are satisfied.

These concepts must not be conflated.

For example, a learner can have:

```text
Verified proficiency = 0.92
```

while still not having a particular node marked:

```text
COMPLETED
```

if the node's required completion conditions have not been satisfied.

This preserves the integrity of Manthaino's prerequisite graph.

---

## 12. Evidence Fusion Example

Consider a learner with three evidence categories:

| Source     | Score \(s_i\) | Weight \(w_i\) | Reliability \(r_i\) | Effective Weight \(q_i\) |
| ---------- | ------------: | -------------: | ------------------: | -----------------------: |
| Assessment |          0.90 |           0.45 |                0.90 |                    0.405 |
| Practical  |          0.80 |           0.30 |                0.85 |                    0.255 |
| Portfolio  |          0.70 |           0.15 |                0.70 |                    0.105 |

The verified score is:

$$
V =
\frac{
(0.405)(0.90) +
(0.255)(0.80) +
(0.105)(0.70)
}{
0.405 + 0.255 + 0.105
}
$$

$$
V \approx 0.836
$$

Therefore:

```text
Verified score ≈ 0.836
Proficiency    = ADVANCED
```

Coverage is:

$$
0.45 + 0.30 + 0.15 = 0.90
$$

Therefore:

```text
Coverage = 0.90
```

If the learner claimed:

```text
C = 0.50
```

then:

$$
D = 0.836 - 0.50 = 0.336
$$

Since:

$$
D > 0.20
$$

and:

$$
Coverage \geq 0.70
$$

the verification decision is:

```text
UNDERESTIMATED
FAST_TRACK_FULL
```

The subsequent node transition is still governed by the existing progression service.

---

## 13. Configuration

Verification parameters are centralized in:

```text
app/core/config.py
```

This includes:

* evidence importance weights
* reliability priors
* discrepancy threshold
* fast-track coverage gate
* proficiency boundaries

Centralizing these parameters prevents mathematical rules from being scattered across API and service implementations and allows future calibration without changing the verification architecture.

---

## 14. Implementation Components

The primary implementation components are:

```text
app/core/config.py
    Verification configuration and operational priors

app/models/domain.py
    Evidence and learner-skill domain models

app/services/verification.py
    Evidence aggregation, score fusion, coverage,
    discrepancy calculation, and verification decisions

app/api/assessments.py
    Assessment submission/API integration

app/services/progression_service.py
    Mapping verification decisions into the existing
    progression state machine
```

---

## 15. Validation

The verification engine is covered by a dedicated test suite:

```text
tests/test_verification_engine.py
```

Current validation:

```text
26 passed
0 failed
```

The test suite covers:

* no evidence
* individual evidence categories
* multi-source evidence fusion
* duplicate API requests
* high-water mark retention
* different assessment scopes
* overestimation
* underestimation
* partial fast-track
* full fast-track
* discrepancy boundaries
* zero reliability
* invalid nodes
* remediation state mutation
* aligned progression behavior
* successful assessment completion
* proficiency boundaries
* zero and maximum scores
* historical attempt preservation
* missing practical progression
* progression state mutation
* fast-track state mutation

The test suite therefore validates both the **verification mathematics** and its **integration with progression state**.

---

## 16. Design Principles

The Verification Engine follows five core principles:

### 1. Evidence over self-claim

Learner self-assessment is treated as a calibration signal, not as the primary measure of proficiency.

### 2. Reliability-adjusted evidence

Evidence influence depends on both its configured importance and reliability.

### 3. Evidence diversity

Coverage rewards demonstrations across distinct evidence modalities rather than repeated submissions of the same type.

### 4. Historical auditability

All attempts remain historically available while only the highest valid attempt per evidence instrument contributes to the current verification calculation.

### 5. Verification does not bypass progression rules

Verification determines the appropriate learning-path treatment. The existing progression state machine remains authoritative for node completion and prerequisite-based unlocking.

---

## 17. Current MVP Scope

The current implementation is intentionally deterministic and configuration-driven.

It does **not** attempt to estimate:

* confidence intervals
* Bayesian posterior probabilities
* individual measurement error
* item-response-theory parameters
* statistically learned reliability coefficients

Those mechanisms can be introduced later if sufficient Manthaino learner outcome data becomes available.

For the MVP, the reliability-adjusted fusion model provides a transparent, explainable, and testable mechanism for combining heterogeneous evidence and adapting learner progression.
