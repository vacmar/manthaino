# MVP Operational Priors for Verification Engine
# These are default parameters pending empirical calibration against actual learner outcome data.

VERIFICATION_WEIGHTS = {
    "ASSESSMENT": 0.45,
    "PRACTICAL": 0.30,
    "COURSEWORK": 0.10,
    "EXTERNAL": 0.15
}

VERIFICATION_RELIABILITIES = {
    "ASSESSMENT": 0.90,
    "PRACTICAL": 0.85,
    "COURSEWORK": 0.60,
    "EXTERNAL": 0.70
}

DISCREPANCY_THRESHOLD = 0.20
FAST_TRACK_COVERAGE_GATE = 0.70
