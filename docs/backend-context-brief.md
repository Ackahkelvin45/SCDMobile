# SickleCare: Moving from a Patient App to a Clinician-Only App

**Context brief for the backend developer**

Read this first. Then use `backend-api-requirements.md` for the endpoint detail and `clinician-app-spec.md` for the full product spec (user stories, flows, rules).

> **Update:** the §7 questions have been answered and agreed. The outcomes are in the "Decisions log" at the end of `backend-api-requirements.md` (v2).

**This brief is a proposal, not an order.** You know the backend best. If something doesn't sit right (a model design, an endpoint shape, a rule you think is clinically or technically wrong, or scope you think is too big), push back. Section 7 lists the places I most want your opinion.

---

## 1. What changed and why

**Before.** SickleCare was built for **patients**:

- The person who logged in *was* the patient. `CustomUser` holds `patient_id`, genotype, DOB and gender.
- The patient logged their own symptoms and daily HU dose, entered their own labs, and asked for their own prediction.

**Now.** The owner has decided the app is for **medical practitioners only**:

- Doctors manage **many patients**. They register them, record each clinic visit's labs, monitor for HU toxicity, review history and trends, and request the HU-response prediction.
- **Patients never log in.**

**Why it matters for the backend.** Almost every table hangs off `request.user`, assuming that user is the patient:

| Today | Problem |
|---|---|
| `HUBaseline.patient` → OneToOne to the user | A doctor has many patients |
| `Visit.patient` → FK to the user | Same |
| `Prediction.patient` → FK to the user | Same |
| `MedicationLog.user`, `SymptomLog.user` | Patient-diary features that no longer exist |
| `CustomUser.patient_id/genotype/DOB` | These belong on a Patient record, not on the login account |

So the core change is: **one login = one patient** becomes **one doctor → many patients, grouped by facility.**

---

## 2. The new shape, in one picture

```
Facility ──< Clinician (login account)
   │
   └──< Patient ──── HUBaseline (versioned)
            │
            ├──< Visit ──< SafetyFlag
            │      └──── Prediction (with outcome)
            └──< (AuditLog on everything)
```

- **Facility:** a clinic or hospital. All approved doctors at a facility can see its patients. *(Assumption; see §7.)*
- **Clinician:** the auth user. Signs up as `pending`, and an admin approves them in Django admin after checking their licence number.
- **Patient:** a plain record created by a doctor. Has a folder number (unique per facility), demographics, two consents, and a primary clinician.
- **HUBaseline:** moves under Patient and is **versioned**. It is never overwritten, because predictions must remember which baseline they used.
- **Visit:** under Patient. Adds lab sample date, weight, dose, adherence, transfusion, pregnancy and next appointment.
- **SafetyFlag:** new. The server creates flags when a visit is saved (e.g. ANC < 1.0).
- **Prediction:** linked to a visit. Records which baseline version and model file were used, and later whether it came true.
- **AuditLog:** new. Every change and export is recorded. This is patient health data.

---

## 3. What the doctor does in the app (so the endpoints make sense)

1. **Sign up → wait for approval → sign in.**
2. **Today tab:** dangerous lab results that haven't been handled yet. Fed by `GET /flags/?acknowledged=false`.
3. **Patients tab:** search by name or folder number. Open a patient profile, which loads in one call via `GET /patients/{id}/`.
4. **Patient profile:** details, days on HU, Hb change since baseline, active flags, plus:
   - **History:** everything that happened, in date order (`/timeline/`)
   - **Trends:** lab charts over time (`/trends/`)
   - **Analytics:** a summary card (`/analytics/`)
5. **New visit:** one fast form → server saves it, evaluates flags, returns changes since the last visit.
6. **Prediction**, if eligible: the server checks the rules → runs the model → the result is shown with a disclaimer.

---

## 4. Rules the server must own, not the app

Put these in the backend so they can't be bypassed and stay consistent.

1. **Facility scoping on every query.** A patient from another facility returns **404**.
2. **Safety flags** are computed on the server when a visit is saved or edited. Keep thresholds in **settings**, because a haematologist still has to confirm them.
3. **Prediction eligibility** (full list in the API doc, §6). Main rules:
   - ≥ 90 days on HU at the **lab sample date**
   - baseline known
   - Hb present
   - no transfusion in the last 3 months
   - not pregnant
   - research consent given
   - genotype and age inside the training population
   - only the patient's latest visit
4. **One threshold only:** 0.5721 (Best F1). The "Sens ≥90%" threshold (0.0188) labels almost everyone a responder, so remove it.
5. **Edits make predictions outdated.** Editing a visit, the baseline, or the patient's DOB/sex/genotype marks related predictions `outdated`.
6. **Outcome check.** When the next visit is saved, record whether the previous prediction came true. Score it against the baseline version it used; mark it "not assessable" if the patient was transfused.
7. **Canonical units.** The server stores one unit per lab and rejects implausible values unless the client confirms them.
8. **Feature flag.** `Facility.prediction_enabled`, default **off**. It stays off until the two blockers in §6 are cleared.

---

## 5. What to remove

- The `symptoms` and `medications` apps and their endpoints. Dose and adherence now live on the visit.
- `Visit.status` (STABLE/MONITOR/ELEVATED). It mixes "is the patient responding" with "is the patient in danger": any Hb ≥ 9 counts as "stable". Safety flags and observed response replace it.
- `Visit.toxicity_neutropenia` tick box. Derive it from ANC.
- `Visit.predicted_class`. It lives on Prediction.
- The old `/ml/*` endpoints and `/visits/latest/`, `/visits/trends/`.
- A hard-coded `model_version = "1.0"`. Store a hash of the model file instead.
- `str(exc)` in 500 responses.

---

## 6. Known problems found while reviewing the ML side

Not your job to fix alone, but you should know about them.

1. **ARC units are unclear in the training data.** The median is ~4, which looks like reticulocyte %, not ×10⁹/L. The ML owner must confirm what scale the model expects **before prediction is switched on**.
2. **Mixed units in training.** Some ANC rows are in cells/µL (thousands), and some Hct rows are fractions (0.23) instead of %. The app will convert inputs, but the model's behaviour on clean inputs should be sanity-checked.
3. **`GENOTYPE_MAP` maps `HbSβ+` and `not_sure` to the same code (3).** HbSβ⁺ never appears in the training data. Is that intended?

---

## 7. Where I most want your pushback

Please challenge any of these, and anything else.

1. **Facility-shared patients versus private per doctor.** I assumed shared, with a primary clinician. Is facility a good tenant boundary for your setup?
2. **Migration versus reset.** Migrate existing patient-users into `Patient` records under a default facility, or wipe the database (it's a research build)? Which is less painful for you?
3. **Baseline versioning.** I proposed new rows per edit. Would you prefer `django-simple-history` (or similar) for both the audit log and versioning, instead of hand-rolled tables?
4. **Profile summary in one call** (`GET /patients/{id}/` returning flags, latest prediction and eligibility). Too heavy? Would you rather split it?
5. **Timeline, trends, analytics:** computed on the fly, or cached or denormalised? Patients have few visits, so I assumed on the fly is fine.
6. **Flags stored as rows versus computed on read.** I chose rows, because doctors must acknowledge them and that needs state. Do you agree?
7. **Error shape and status codes:** 409 for duplicates and ineligible prediction, 404 across facilities. Happy with these?
8. **Anything that's over-scoped for a first release.** Tell me what you'd cut.

Reply with your objections or alternatives per point, or "agree", and we'll settle it before anyone writes code.
