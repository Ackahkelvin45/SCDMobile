# SickleCare Clinician: Backend API Requirements (MVP, v2)

This is for the backend developer. It lists the endpoints the mobile app needs for the clinician-only MVP. The full product reasoning is in `clinician-app-spec.md`; section references (§) point there.

**v2** includes the agreed outcome of the backend review:
- the database will be reset;
- `django-simple-history` is used for the audit log and baseline versions;
- timeline and analytics are folded into existing endpoints;
- the duplicate check is a 409 on patient create;
- password reset uses Django's built-in views;
- ranges and thresholds are served from `/config/`.

**Legend:** 🟢 keep as is · 🟡 change existing · 🔵 new · 🔴 remove

---

## ⚠️ Do now, on the current live build (before the rewrite)

1. **Security hole.** `UserViewSet` uses `User.objects.all()` with only `IsAuthenticated`, so any signed-in user can list, read and edit every account. Scope the queryset to `request.user`.
2. **`DEBUG=False`** on the server.
3. **Database persistence.** Point `DATABASE_URL` at a dedicated SickleCare database on the server's Postgres. Take a dump of the current data first.

---

## 0. Global conventions

1. **Tenant scoping.** Every query is filtered on `patient.facility == request.user.facility`. Anything from another facility returns **404**.
2. **Audit and versioning** use **`django-simple-history`** on every model:
   - It records who changed what, old → new, and when.
   - The required `reason` / `edit_reason` fields go into `history_change_reason`.
   - Exports and deletes also get an explicit log row (in the admin action).
3. **Errors** use one shape, set once in a DRF exception handler: `{"detail": "...", "code": "machine_code", "fields": {"field": ["msg"]}}`.
   - Never return `str(exc)` on a 500.
4. **Pagination:** `?limit=&offset=` returning `{count, next, previous, results}`.
5. **Units.** The server stores **canonical units** only (spec §5):
   - Hb g/dL; WBC, ANC, platelets, ARC ×10⁹/L; RBC ×10¹²/L; MCV fL; Hct %.
   - The app converts cells/µL, fractions and retic% → ARC **before sending**.
   - The server rejects values outside the plausible ranges unless `confirm_out_of_range: true` is sent.
   - Ranges come from settings and are served by `/config/`, so the app and server use the **same table**.
6. **Dates:** ISO `YYYY-MM-DD` for clinical dates; ISO 8601 UTC for timestamps.
7. **JWT:** keep the current settings (30 min access, 7 day refresh, rotation and blacklist). Deactivating a clinician makes their next refresh fail.

---

## 1. Auth, clinician and config

| | Method & path | Purpose |
|---|---|---|
| 🟡 | `POST /auth/users/` | **Clinician sign-up.** Body: `full_name, email, phone_number, license_number, facility_id, password, password2`. Creates the account with `status=active`; there is no approval step, and the app signs in straight after with `POST /auth/login/`. No patient fields. |
| 🟡 | `POST /auth/login/` | Returns **403** with `code: "account_deactivated"` for a deactivated account. Response includes `user` (the `/me` shape). |
| 🟢 | `POST /auth/refresh/` | Unchanged. |
| 🟢 | `POST /auth/logout/` | Unchanged. |
| 🟡 | `GET /auth/users/me/` | `id, full_name, email, phone_number, license_number, status, facility {id, name, prediction_enabled}` |
| 🔵 | `PATCH /auth/users/me/` | Edit own `full_name`, `phone_number`. |
| 🔵 | `POST /auth/password/change/` | Body `{old_password, new_password, new_password2}`. |
| 🟡 | Password reset | **Django's built-in reset views** plus email. The app's "Forgot password" opens the reset page in the browser. |
| 🔵 | `GET /config/` | Authenticated. Returns `lab_ranges {lab: {min, max, unit}}` and `flag_thresholds {rule: value}` from settings. The app caches it. |
| 🔵 | `GET /facilities/` | **Public** list `{id, name, region}` for the sign-up picker. |
| 🔵 | `GET /clinicians/` | Active clinicians in my facility, `{id, full_name}`. |

Deactivation, licence audit and patient reassignment happen in **Django admin**. There is no approval step.

---

## 2. Patients 🔵

| Method & path | Purpose |
|---|---|
| `GET /patients/` | List. Query: `search` (name or folder no.), `has_flags=true`, `baseline_missing=true`, `ordering=-last_visit_date\|full_name`, `limit`, `offset`. |
| `POST /patients/` | Create. Returns **409** `folder_number_taken` if the folder no. already exists in the facility, or **409** `possible_duplicate` with `matches: [{id, full_name, folder_number}]` when the **same full name and DOB** already exist (unless `confirm_duplicate: true` is sent). |
| `GET /patients/{id}/` | Patient detail plus the **summary block**, which includes the analytics (below). This is the profile hub. |
| `PATCH /patients/{id}/` | Edit. If DOB, sex or genotype changes, mark the patient's current predictions `outdated`. |

**Patient fields:**
- `id`, `folder_number` (unique per facility), `full_name`, `date_of_birth`
- `sex`: `male | female`
- `genotype`: `HbSS | HbSC | HbSβ0 | HbSβ+ | other | unknown`
- `phone_number`, `next_of_kin_name`, `next_of_kin_phone`, `primary_clinician_id`
- `data_consent` (**required true**), `data_consent_date`
- `research_consent`, `research_consent_date`
- `anc_flag_floor`: 2.0 or 1.25; `anc_flag_floor_reason` required when 1.25
- `archived`

**Summary block in `GET /patients/{id}/`.** It includes the analytics, so no separate analytics endpoint is needed.
- Query: `period=6m|12m|all` (default `all`) applies to the `analytics` part.
- Response:
```json
{
  "age_years": 14,
  "hu": { "baseline_hgb": 7.2, "baseline_source": "measured_pre_hu", "hu_start_date": "2026-03-01", "days_on_hu": 247, "baseline_version_id": 3 },
  "latest_visit": { "id": "...", "lab_sample_date": "...", "hgb": 8.6 },
  "next_appointment_date": "2026-12-15",
  "overdue": false,
  "observed_response": { "delta_hgb": 1.4, "meets_criterion": true },
  "active_flags": [ { "id": "...", "rule": "anc_low", "severity": "warning", "message": "..." } ],
  "latest_prediction": { "...": "see §6, or null" },
  "prediction_eligibility": { "eligible": false, "reasons": [ { "code": "days_on_hu", "message": "...", "eligible_from": "2027-02-12" } ] },
  "analytics": {
    "visit_count": 6,
    "hgb": { "min": 6.9, "max": 8.8, "mean": 7.9, "visits_meeting_criterion": 3, "visits_assessed": 5 },
    "mcv": { "first": 82, "latest": 96, "change": 14 },
    "dose": { "current_mg": 750, "current_mg_per_kg": 27.8, "changes": 2 },
    "adherence": { "good": 4, "partial": 1, "poor": 1 },
    "toxicity": { "flags_total": 3, "critical": 1, "by_rule": { "anc_low": 2, "anc_critical": 1 } },
    "pain_episodes": { "total": 7, "per_visit_avg": 1.2 },
    "transfusions_reported": 1
  }
}
```
- `visits_assessed` excludes visits that were transfused or fell before day 90 on HU.
- ~~`analytics.predictions`~~ **Removed** (see `multi-model-prediction.md` v2). A single patient has too few predictions for a per-patient track record to mean anything; model comparison happens only in the research CSV export.

---

## 3. HU baseline 🟡

The baseline moves under the patient. Each edit is versioned via simple-history.

| Method & path | Purpose |
|---|---|
| `GET /patients/{id}/hu-baseline/` | The current baseline plus `version_id`, or 404 if none. |
| `PUT /patients/{id}/hu-baseline/` | Create or update. Body: `baseline_hgb` (3–15), `baseline_source` (`measured_pre_hu \| from_folder \| unknown`), `hu_start_date` (≤ today), `reason` (required when updating; stored as `history_change_reason`). On update, mark the patient's existing predictions `outdated`. |
| `GET /patients/{id}/hu-baseline/history/` | Versions, newest first: `{version_id, baseline_hgb, baseline_source, hu_start_date, changed_by, changed_at, reason}`. The app's History screen merges these with visits. |

🔴 Remove `/ml/hu-baseline/`.

---

## 4. Visits, history and trends 🟡

| Method & path | Purpose |
|---|---|
| `GET /patients/{id}/visits/` | **The patient's history.** Newest first, one row per visit with everything the History screen needs (row shape below). |
| `POST /patients/{id}/visits/` | Create. Returns the visit with **flags evaluated** and **deltas vs the previous visit**. Returns 409 `code: "duplicate_visit_date"` unless `confirm_duplicate: true` is sent. |
| `GET /visits/{id}/` | Detail: all fields, `flags`, `deltas`, `observed_response`, `prediction` (or null). |
| `PATCH /visits/{id}/` | Edit. **`edit_reason` is required.** Re-evaluate flags (see §5) and mark this visit's prediction `outdated`. |
| `GET /patients/{id}/trends/` | Chart series (below). |

**History row** (`GET /patients/{id}/visits/`):
```json
{
  "id": "...", "lab_sample_date": "2026-10-20",
  "hgb": 8.6, "anc": 3.1, "platelet_count": 210,
  "delta_hgb_vs_previous": 0.4, "delta_hgb_vs_baseline": 1.4,
  "dose_mg": 750, "dose_mg_per_kg": 27.8, "dose_changed": true, "previous_dose_mg": 500,
  "adherence": "good", "transfused_last_3_months": "no", "pain_episodes": 2,
  "flags": [ { "rule": "anc_low", "severity": "warning", "acknowledged": true, "action": "repeat_fbc" } ],
  "prediction": { "predicted_class": "responder", "response_probability": 0.70, "status": "current", "outcome": "confirmed" },
  "edited": false, "created_by": { "id": "...", "full_name": "..." }
}
```

**Visit fields (create/edit):**

| Group | Fields |
|---|---|
| Dates | `lab_sample_date` (≤ today; used for model timing), `consult_date` |
| Labs (canonical units) | `hgb`, `wbc`, `anc`, `platelet_count`, `rbc`, `mcv`, `hct`, `arc` |
| Treatment | `weight_kg`, `dose_mg` (server computes `dose_mg_per_kg`), `adherence` (`good \| partial \| poor`) |
| Prediction gates | `transfused_last_3_months` (`yes \| no \| unknown`), `pregnancy_status` (`not_pregnant \| pregnant \| planning \| unknown`; required when female and age 12–50), `contraception_counselled` |
| Clinical | `toxicity_nausea`, `toxicity_vomiting`, `toxicity_rash`, `toxicity_fatigue`, `toxicity_headache`, `pain_episodes`, `next_appointment_date`, `note` |
| Flags | `confirm_out_of_range`, `confirm_duplicate` |

**Trends** (`GET /patients/{id}/trends/`):
- Query: `labs=hgb,anc,platelet_count,wbc,mcv,arc,hct,rbc,weight_kg,dose_mg_per_kg,pain_episodes` (default `hgb`), `from`, `to`.
- Response:
```json
{
  "series": { "hgb": [ { "date": "2026-05-01", "value": 7.4, "visit_id": "..." } ] },
  "reference_lines": {
    "hgb": [ { "label": "Baseline", "value": 7.2 }, { "label": "Target (+1.0)", "value": 8.2 } ],
    "anc": [ { "label": "Flag floor", "value": 2.0 } ],
    "platelet_count": [ { "label": "Flag", "value": 80 } ]
  },
  "events": [ { "date": "...", "type": "dose_change|baseline_change|transfusion|flag", "label": "..." } ]
}
```

**Model changes:**
- Remove `toxicity_neutropenia` (derive it from ANC).
- Remove `status` (STABLE/MONITOR/ELEVATED).
- Remove `predicted_class` from the visit.

🔴 Remove `/visits/latest/`, `/visits/trends/`, and the top-level `/visits/` list and create.

---

## 5. Safety flags 🔵

Flags are stored as rows and **created on the server** when a visit is saved or edited: `SafetyFlag {id, visit_id, patient_id, rule, severity, message, status, acknowledged_at, acknowledged_by, action, note}`.

**When a visit is edited:**
- Replace the visit's **unacknowledged** flags with freshly computed ones.
- Keep **acknowledged** flags. If their rule no longer fires, set `status = "resolved_by_edit"` so the history stays honest.

| Method & path | Purpose |
|---|---|
| `GET /flags/?acknowledged=false` | All unacknowledged flags in my facility, critical first: `{id, severity, message, patient {id, full_name, folder_number}, visit_id, created_at}`. **This powers the Today tab.** |
| `POST /flags/{id}/acknowledge/` | Body: `action` (`hold_hu \| repeat_fbc \| refer \| no_action \| other`), `note`. |

**MVP rules.** Thresholds live in settings, served via `/config/`, and must be confirmed by a haematologist.

| Rule code | Condition | Severity |
|---|---|---|
| `anc_critical` | ANC < 1.0 | critical |
| `hgb_critical` | Hb < 4.5 | critical |
| `pregnant` | pregnancy_status = pregnant | critical |
| `anc_low` | ANC < patient's `anc_flag_floor` | warning |
| `platelets_low` | platelets < 80 | warning |
| `arc_low` | ARC < 80 **and** Hb < 9 | warning |
| `hgb_drop` | Hb fall ≥ 2.0 vs previous visit (only from the second visit) | warning |
| `pregnancy_planning` | pregnancy_status = planning | info |

---

## 6. Prediction 🟡

> **Superseded in part by `multi-model-prediction.md` §4–5:** every predict request runs **all** registered models (there is no `models` field), the response returns a `results` list (one entry per model, each with its own threshold), predictions carry `model` and `run_id`, and `/config/` serves `prediction_models`. Eligibility below is unchanged.

| Method & path | Purpose |
|---|---|
| `GET /visits/{id}/prediction-eligibility/` | `{eligible, reasons: [{code, message, eligible_from?}], reliability_note?, imputed_lab_count}` |
| `POST /visits/{id}/predict/` | Runs the model. Returns **409** if not eligible (same `reasons` shape) and **403** `code: "prediction_disabled"` if the facility flag is off. Optional `override_reason` for missing core labs. |
| `GET /patients/{id}/predictions/` | History with `status` and `outcome`. |

**Eligibility rules, enforced on the server.** Each failing rule returns a reason code:

| Reason code | Blocks when |
|---|---|
| `feature_disabled` | Facility prediction flag is off |
| `no_research_consent` | Patient has no research consent |
| `baseline_missing` / `baseline_unknown` | No baseline, or its source is `unknown` |
| `days_on_hu` | Fewer than 90 days on HU at `lab_sample_date` (return `eligible_from`) |
| `hgb_missing` | No Hb |
| `core_labs_missing` | ANC, platelets or WBC missing, unless `override_reason` is sent |
| `transfused` | `transfused_last_3_months` is `yes` or `unknown` |
| `pregnant` | `pregnancy_status` is `pregnant` or `unknown` |
| `age_out_of_range` | Age under 2 at the visit |
| `genotype_unsupported` | Genotype is `other` or `unknown` |
| `not_latest_visit` | A later visit exists |

The response also carries a `reliability_note`:
- `"lower_reliability"` for HbSC, HbSβ0, HbSβ+, or age 18–50;
- `"outside_training_age"` for age over 50.

**Predict response:**
```json
{
  "id": "...", "visit_id": "...",
  "response_probability": 0.72, "predicted_class": "responder",
  "threshold": 0.5721, "model_hash": "sha256:...",
  "baseline_version_id": 3, "imputed_lab_count": 2,
  "reliability_note": null, "status": "current",
  "observed_response": { "delta_hgb": 0.6, "meets_criterion": false },
  "created_at": "...", "created_by": "..."
}
```

**Model rules:**
- **One threshold only:** Best F1 (0.5721), set on the server. Remove `threshold_type`.
- Store `model_hash` (a hash of the model file), not `"1.0"`.
- `baseline_version_id` is the simple-history id of the baseline used.

**Outcome check** (automatic): when a later visit is saved, set `outcome` on the previous current prediction:
- `confirmed` / `not_confirmed` if Hb ≥ (the baseline version the prediction used) + 1.0;
- `not_assessable` if that next visit has transfused `yes` or `unknown`.

🔴 Remove `/ml/predict-hu-response/` and `/ml/predictions/latest/`.

---

## 7. Feature flag and admin

- `Facility.prediction_enabled` (default **false**), toggled in Django admin.
- Django admin needs:
  - clinician deactivate and licence fields;
  - patient reassignment;
  - a CSV export of predictions and outcomes for the research team (with an explicit log row for each export).

---

## 8. Remove 🔴

- `POST /symptoms/` and the `symptoms` app.
- `POST /medications/log/`, `GET /medications/today/` and the `medications` app.

---

## 9. Later (not MVP)

| Endpoint | For |
|---|---|
| `POST /patients/{id}/visits/bulk/` | Back-entering past visits |
| `GET/POST /patients/{id}/hu-interruptions/` | HU stop and restart periods |
| `POST /patients/{id}/handover/` | Body `{to_clinician_id, note}` |
| `GET /today/` | Overdue patients, handovers, new outcomes |
| `POST /patients/{id}/export/` | PDF export, logged |
| `POST /auth/mfa/...` | MFA |
| Dedicated `/timeline/` or `/analytics/` | Only if the folded versions above prove too limited |

---

## Decisions log

| Topic | Decision |
|---|---|
| Patient visibility | Shared per facility, with a primary clinician |
| Existing data | Reset the database (dump taken first); no migration |
| Audit and versioning | `django-simple-history` |
| Timeline | Folded into the visits list (history rows) plus baseline history |
| Analytics | Folded into the patient summary |
| Duplicate check | 409 `possible_duplicate` on create (name + DOB), not a separate endpoint |
| Password reset | Django built-in views |
| retic% → ARC | Converted in the app |
| Ranges and thresholds | In settings, served by `/config/` |

## Still open

1. **ML owner:** the ARC scale the model expects, and whether `HbSβ+` → code 3 is intended. Prediction stays off until then.
2. **Haematologist:** flag thresholds and plausible ranges. They live in settings.
