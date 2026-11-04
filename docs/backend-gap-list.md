# Backend gap list: what the clinician app needs that the backend doesn't have yet

**From:** the frontend side · **Date:** 4 Nov 2026
**Checked against:** `SCDBackend`, branch `security-hotfix`, commit `f8b8738`

## Where things stand

The clinician app is built and tested on branch `clinician-app` in the SCDMobile repo. Right now it runs against a temporary mock server. To use real data, it needs the endpoints below. The app already calls the exact paths and shapes in `backend-api-requirements.md` (v2). Once these exist, switching to your server is one setting (`EXPO_PUBLIC_API_BASE_URL`), with no frontend code change.

Today the backend is still the patient app. The user model and serializers carry patient fields (`patient_id`, `genotype`, `date_of_birth`, `gender`). There are no patient records owned by doctors, no facilities, and no safety flags.

Full request and response shapes are in **`backend-api-requirements.md` (v2)**, with section numbers below. Prediction details are in **`multi-model-prediction.md` (v2)**.

---

## A. Exists, but needs changing (3)

| Endpoint | What's there now | What the app needs, and why |
|---|---|---|
| `POST /auth/users/` (sign-up) | `RegisterSerializer` takes patient fields: `date_of_birth`, `gender`, `genotype`. It has no licence or facility. | Doctor fields: `full_name`, `email`, `phone_number`, `license_number`, `facility_id`, `password`, `password2`. The account is active straight away (no approval step). Without this, doctors can't create accounts. §1 |
| `GET/PATCH /auth/users/me/` | `UserSerializer` returns patient fields. | Doctor profile, including `facility: { id, name, prediction_enabled }`. The app shows or hides every prediction screen based on `facility.prediction_enabled`, and limits all data to that facility. §1 |
| `POST /auth/login/` | Returns only `access` and `refresh`. This **works**: the app then calls `/me/`. | Optional: also return `user` (same shape as `/me/`) to save one request. A deactivated account should give a 403 with `code: "account_deactivated"`, so the app can explain it. §1 |

`/auth/refresh/` and `/auth/logout/` work as they are. ✅

## B. Missing completely (16)

### Account and setup
| # | Endpoint | Why the app needs it | Doc |
|---|---|---|---|
| 1 | `POST /auth/password/change/` | Account → Change password screen. Body: `old_password`, `new_password`. | §1 |
| 2 | Password reset page | The "Forgot password" link opens it in the browser. The app currently assumes `/accounts/password_reset/` (Django's built-in). **Please confirm the path.** | §1 |
| 3 | `GET /facilities/` | The facility dropdown on sign-up. It must work **without login**. | §1 |
| 4 | `GET /clinicians/` | Doctors at my facility, for the "primary clinician" picker on a patient. | §1 |
| 5 | `GET /config/` | Lab units and normal ranges, flag thresholds, and the list of prediction models (with which is default). Used for lab entry, unit checks, chart reference lines and the prediction screen. | §1 |

### Patients
| # | Endpoint | Why the app needs it | Doc |
|---|---|---|---|
| 6 | `GET /patients/` and `POST /patients/` | The Patients tab (search by name or folder number, filters) and Add patient. Duplicate folder numbers should return a 409 so the app can warn. | §2 |
| 7 | `GET /patients/{id}/` and `PATCH /patients/{id}/` | The patient profile: details, active flags, latest visit, latest prediction, observed response, and the `analytics` block with `?period=6m\|12m\|all`. This drives the profile **and** the new per-patient Analytics page. Edit patient uses `PATCH`. | §2 |
| 8 | `GET/PUT /patients/{id}/hu-baseline/` | HU baseline screen (baseline Hb, source, HU start date). Needed for response tracking and prediction eligibility. | §3 |
| 9 | `GET /patients/{id}/hu-baseline/history/` | Shows earlier baseline values when one is changed. | §3 |

### Visits, history and trends
| # | Endpoint | Why the app needs it | Doc |
|---|---|---|---|
| 10 | `GET /patients/{id}/visits/` and `POST /patients/{id}/visits/` | Visit history list, and New visit (labs in canonical units, weight, dose, adherence, symptoms, transfusion, pregnancy). **The server must compute safety flags on save** and return them in the response. | §4 |
| 11 | `GET/PATCH /visits/{id}/` | Visit detail, and editing a visit. Edits need an `edit_reason`, and flags are recomputed. | §4 |
| 12 | `GET /patients/{id}/trends/?labs=&from=` | Every chart (profile, Trends and Analytics pages): series per lab, reference lines, and events (dose changes, transfusions). The Analytics page sends `from=` for the 6- or 12-month view. | §4 |

### Safety flags
| # | Endpoint | Why the app needs it | Doc |
|---|---|---|---|
| 13 | `GET /flags/?status=open` | The Today tab: open flags across my facility's patients, critical first. Also drives the tab badge. | §5 |
| 14 | `POST /flags/{id}/acknowledge/` | A doctor records what they did (hold HU, repeat FBC, refer, no action, other) and a note. | §5 |

### Prediction
| # | Endpoint | Why the app needs it | Doc |
|---|---|---|---|
| 15 | `GET /visits/{id}/prediction-eligibility/` | Before predicting, the app shows whether the visit is eligible and why not. Rules: 90 or more days on HU, baseline set, no recent transfusion, not pregnant, research consent. | §6 |
| 16 | `POST /visits/{id}/predict/` and `GET /patients/{id}/predictions/` | Run **all three models** (XGBoost, SVM, Logistic Regression) every time and return each result; the app's single/compare toggle is display only. Prediction history uses the list endpoint. The existing `/ml/predict-hu-response/` is patient-scoped and single-model, so it can't be reused as is. | §6, multi-model doc |

## C. Old endpoints the app doesn't use
`/visits/` (the patient version), `/ml/*`, `/symptoms/` and `/medications/` were for patients. They can be removed in the rewrite (§8). Note that the new `/visits/{id}/` replaces the old `/visits/` router.

## D. Not endpoints, but required
- **Scope everything to the doctor's facility.** A patient, visit or flag from another facility should return a 404.
- **Start from a fresh database** (already agreed). The user table changes from patients to doctors.
- **Errors in one shape:** `{ "detail": "...", "code": "...", "fields": { ... } }`, so the app can show field errors under inputs (§0).
- **Deploy to a public HTTPS URL.** The app can't reach `localhost` from a real phone. Send me the URL when it's up, and I'll switch the app over and test every screen.

## E. Nice to have (not blocking)
- `max_flag_severity` on each row of the patient list (lets the list show a red or amber dot without extra calls).
- `visit_id` on each flag in the patient summary (lets the app open the right visit).

If anything here doesn't fit how you're building it, tell me. I'd rather change the app than have you bend the backend around a bad choice.
