# SickleCare Clinician: Product Spec (v3)

Status: revised after two supervisor review rounds (final verdict: ready with minor fixes, now applied). No code changes yet.
Items marked **[CONFIRM]** need sign-off from a haematologist or the ML owner before release.

## 1. Product summary

SickleCare is a mobile app for **doctors managing Sickle Cell Disease (SCD) patients on Hydroxyurea (HU)** in Ghanaian clinics. The doctor:

- registers patients,
- records each visit's full blood count and HU treatment details,
- gets **safety flags** on dangerous lab values,
- and can request a **research-grade prediction** of whether Hb will rise ≥ 1.0 g/dL above the HU-start baseline at the next lab visit.

Patients never use the app.

**What the prediction is and isn't.** The model was trained only on Hb change. It has not been externally validated. It must never be presented as a basis for starting, stopping or dosing HU. Current guidance (NHLBI 2014) supports continuing HU for clinical benefit even without an Hb rise. The app's primary value is fast, safe record-keeping and monitoring. The prediction is a secondary, clearly labelled aid, intended for a supervised pilot under ethics approval.

## 2. Users and access

| Role | Who | Can do |
|---|---|---|
| **Clinician** | Doctor managing SCD patients | All patient actions within their facility |
| **Facility admin** | Clinic lead / IT | Deactivate clinicians, reassign patients, view the audit log. Uses **Django admin** for MVP (no in-app admin UI). |

Defaults (confirm in §12):
- Patients belong to a **facility**, and all clinicians registered there can see them. Each patient has a **primary clinician**.
- **No approval step (decided):** a doctor creates an account and has access straight away. The licence number is recorded so accounts can be audited, and an admin can deactivate any account. Risk accepted: anyone who signs up and picks a facility can read that facility's patients.
- Patients are looked up by **hospital folder number** or name.

## 3. Model facts the app must respect

Verified against `ml_app/predictor.py`, `ML/outputs/run_metadata.json` and the Defence Guide.

**What it predicts**
- **Target:** Hb rise ≥ 1.0 g/dL from the HU baseline at the **next lab visit**. In training, the next visit came a median of 56 days later (IQR 28–84).
- **Inputs:** age at visit, sex, genotype, baseline Hb, calendar days on HU at the lab date, and this visit's Hb, ANC, ARC, platelets, WBC, RBC, MCV and Hct.

> **Superseded in part by `multi-model-prediction.md`:** prediction now runs on three models (XGBoost, SVM, Logistic Regression), each with its own Best-F1 threshold. The server always runs all three. XGBoost is shown by default, and the clinician can switch the view to another model or compare all three. Where that document differs from this section or E5, follow it.

**Threshold**
- One operating threshold **per model** (Best F1). For XGBoost it is **0.5721**. Thresholds are fixed on the server, and the clinician cannot change them.
- The "Sens ≥ 90%" threshold (0.0188) labels nearly every visit a responder. It is **not exposed anywhere**.

**Who the model fits**
- Training cohort: Ghanaian, 94.9% HbSS, ages roughly 2–49. Performance is better in children (AUC 0.876) than in adults (AUC 0.819; adult false-negative rate 38%).
- HbSβ⁺ never appears in training. The backend currently maps it to the "unknown" code.

**Data quality**
- Missing labs are **median-imputed silently** by the pipeline.
- ARC units in the training data are ambiguous **[CONFIRM: the ARC unit the model expects]**.

## 4. Data model (backend changes required)

The current backend treats the logged-in user as the patient (`HUBaseline` is OneToOne to the user; `Visit` and `Prediction` have an FK to the user). The new model:

| Entity | Key fields |
|---|---|
| **Facility** | name, region |
| **Clinician** (auth user) | name, email, phone, licence no., facility, status (active / deactivated), MFA |
| **Patient** | facility, folder no. (unique per facility), full name, DOB, sex (male/female, biological), genotype, phone, next of kin, primary clinician, data-processing consent (date, recorded by), research-prediction consent (yes/no, date, recorded by), ANC flag floor (default 2.0, reason if changed), archived |
| **HUTreatment** | patient, baseline Hb, baseline source (steady-state pre-HU / from folder / unknown), HU start date, **versioned via `django-simple-history`**: every edit keeps the old version |
| **HUInterruption** | patient, stop date, restart date, reason |
| **Visit** | patient, **lab sample date**, consult date, weight (kg), labs in canonical units, retic % (optional), transfused in last 3 months, pregnancy status, adherence, current dose (mg and mg/kg computed), side effects, pain episodes, next appointment date, note |
| **Prediction** | visit, probability, class, threshold, model artefact hash, baseline version used, imputed-lab count, created by, status (current / outdated) |
| **SafetyFlag** | visit, rule, severity, acknowledged by and when, action |
| **ActionNote** | patient, visit, decision, text, author |
| **Audit log** | Provided by `django-simple-history` on every model (actor, old → new, timestamp, reason). Exports and deletes get explicit log rows. |

**Removals and fixes**
- Remove `Visit.status` (STABLE/MONITOR/ELEVATED). It mixes response with acuity (any Hb ≥ 9 counts as "stable"). Its jobs are now done by safety flags and observed response.
- Derive neutropenia from ANC instead of a tick box.
- Editing a visit or baseline marks any linked prediction **outdated**.
- `model_version` stores the artefact hash, not a hard-coded "1.0".
- 500 errors must not return `str(exc)`.

**Migration:** decided. The database is **reset** (a dump is taken first); there is no migration of the old patient-user data.

## 5. Canonical units and entry rules

| Lab | Stored unit | Plausible range (confirm outside) | Entry help |
|---|---|---|---|
| Hb | g/dL | 3–16 | — |
| WBC | ×10⁹/L | 0.5–60 | If > 100, offer "Looks like cells/µL. Convert?" |
| ANC | ×10⁹/L | 0.1–40 | If > 100, offer "Looks like cells/µL. Convert?" |
| Platelets | ×10⁹/L | 10–1500 | — |
| RBC | ×10¹²/L | 1–7 | — |
| MCV | fL | 50–140 | — |
| Hct | % | 10–60 | If ≤ 1, convert from a fraction |
| ARC | ×10⁹/L **[CONFIRM: model scale]** | 5–800 | Or enter retic % and the app computes ARC = retic% × RBC × 10 |

Notes:
- k/µL equals ×10⁹/L numerically. The real trap is cells/µL (e.g. 1500) versus ×10⁹/L (1.5).
- Fields are ordered to match the analyser printout. Each has a numeric keypad, a fixed unit label, and "Next" moves to the following field.

## 6. Safety flags (MVP)

Flags are evaluated on the server when a visit is saved. They show inline on the visit summary, the patient header and the prediction card. **[CONFIRM all thresholds with a haematologist against local protocol / BSH 2018]**

| Severity | Rule | Message |
|---|---|---|
| Critical | ANC < 1.0 ×10⁹/L | Severe neutropenia: hold HU per protocol |
| Critical | Hb < 4.5 g/dL | Severe anaemia |
| Critical | Pregnant = yes | HU teratogenic: review per local guidance |
| Warning | ANC below the patient's **ANC flag floor** (default 2.0 ×10⁹/L; a clinician can set 1.25 with a logged reason, e.g. a young child with low baseline ANC) | Neutropenia: HU toxicity criterion |
| Warning | Platelets < 80 ×10⁹/L | Thrombocytopenia: HU toxicity criterion |
| Warning | ARC < 80 ×10⁹/L **and** Hb < 9 g/dL | Reticulocytopenia: HU toxicity criterion |
| Warning | Hb fall ≥ 2 g/dL vs previous visit | Possible acute anaemia (aplastic crisis or sequestration), not an HU rule |
| Info | Pregnancy status = planning | Discuss HU and conception per local guidance |
| Info (v1.1) | MCV not rising over 3+ visits on HU (exact rule to be defined) | Consider adherence check (MCV is an adherence proxy) |

The Hb-fall flag and the "vs previous visit" deltas only apply from a patient's second recorded visit.

Every flag must be **acknowledged**, with an optional action, so that the worklist can clear.

## 7. Prediction eligibility

The server enforces these rules and the app shows them as a checklist.

| Rule | Behaviour |
|---|---|
| Baseline set with a known source | Block if baseline unknown |
| ≥ 90 calendar days on HU at the lab date | Block, and show the eligible-from date |
| Hb present | Block if missing |
| ANC, platelets, WBC present | Block, unless the clinician overrides with a reason (logged) |
| Other labs | Optional. The result shows "N of 8 labs estimated" |
| Transfused in last 3 months = yes or unknown | Block (Hb not interpretable) |
| Pregnant = yes or unknown | Block |
| Patient has **research prediction consent** | Block if not recorded |
| Prediction feature enabled for the facility (§11) | Hidden entirely if off |
| Age < 2, or genotype other/unknown | Block (outside the training population) |
| HbSC, HbSβ⁰, HbSβ⁺, or age 18–50 | Allow, with an amber "Lower reliability for this group" note |
| Age > 50 | Allow, with a stronger note: "Outside the training age range" |
| Visit is the patient's **latest** | Required. Older visits show the observed outcome instead |

## 8. Information architecture

Bottom tabs:
1. **Today:** in MVP, unacknowledged flags only. v1.1 adds patients overdue against their scheduled next visit, handovers, and outcomes newly available for past predictions.
2. **Patients:** search by name or folder no. MVP filters: has flags, baseline missing. v1.1 adds overdue, not yet eligible, and **observed** responder / non-responder.
3. **New Visit** (centre button): pick or add a patient, then the visit form.
4. **Account:** profile, facility, security, sign out.

The **patient profile** is the hub, with these sections:
- **Header:** name, folder no., age, sex, genotype, days on HU, primary clinician, active flags.
- **Observed response:** latest Hb vs baseline (e.g. "+1.4 g/dL, meets criterion").
- **Latest prediction**, if any.
- **Trends:** Hb against the baseline and +1.0 g/dL target lines; ANC, platelets, MCV.
- **Visits timeline.**
- **HU treatment:** baseline history, dose timeline in mg/kg, interruptions.
- **Notes.**

## 9. Epics and user stories

Format: *As a clinician, I want … so that …*, followed by acceptance criteria (AC).

### E1. Account and access
- **US1.1 Create an account.** I enter name, email, phone, licence no. and facility.
  AC: the account is active immediately and I am signed straight in to the Today tab.
- **US1.2 Sign in** with email and password, plus a one-time code (MFA).
  AC: inline errors; deactivated accounts get a clear message.
- **US1.3 Forgot password**, reset by email.
- **US1.4 Idle lock.** After 5 minutes of inactivity, even with the app open, I re-enter my PIN or use biometrics.
  AC: built for shared clinic phones.
- **US1.5 Session expiry.** If my session cannot refresh, I'm sent to sign-in. Any unsaved draft is kept, encrypted.
- **US1.6 Sign out.** Clears tokens, cached patient data and drafts (after warning if drafts exist).

### E2. Patients
- **US2.1 Add patient.** Fields: folder no., full name, DOB, sex, genotype (HbSS, HbSC, HbSβ⁰, HbSβ⁺, other, unknown), phone, next of kin, plus two consents: **data processing** (required) and **research prediction** (optional).
  AC:
  - Folder no. is unique per facility.
  - I'm warned about a possible duplicate (same name and DOB).
  - I cannot save without data-processing consent.
  - Without research-prediction consent the patient gets full care records, but prediction is disabled for them.
  - The genotype picker notes which genotypes the prediction supports.
- **US2.2 Search and filter**, per §8. AC: results in under 1 s for 1,000 patients.
- **US2.3 Patient profile**, per §8. AC: empty states for "no baseline yet" and "no visits yet", each with a primary action.
- **US2.4 Edit demographics.**
  AC: audit-logged; eligibility is re-run; affected predictions are marked outdated.
- **US2.5 Primary clinician and handover.** I can reassign a patient to a colleague with a handover note. AC: they see it on their Today tab.

### E3. HU treatment
- **US3.1 Set baseline.** I enter baseline Hb (steady-state pre-HU, not during crisis or within 3 months of transfusion), the HU start date, and the baseline source: **measured pre-HU / from folder / unknown**. Unknown disables prediction.
  AC: Hb 3–15 g/dL; start date not in the future; days on HU shown immediately. This covers patients already on HU from MVP.
- **US3.2 Back-enter past visits (v1.1).** For a patient already on HU, I can quickly enter past visits in a compact multi-row lab entry.
- **US3.3 Dose.** Each visit records the current dose in mg. The app computes mg/kg from weight and shows a dose timeline.
  AC: titration stays the clinician's decision under local protocol; the app only displays dose.
- **US3.4 Interruptions.** I record stop and restart dates with a reason.
  AC: shown on the timeline. Days on HU stays calendar days (as the model saw it), with a note on the profile.
- **US3.5 Edit baseline.** Creates a new version.
  AC: confirmation required; old predictions are marked outdated; history is viewable.

### E4. Visits
- **US4.1 Record visit on one screen.** In order:
  - lab sample date
  - labs (§5)
  - weight
  - current dose
  - adherence (good / partial / poor)
  - transfused in last 3 months (yes / no / unknown)
  - pregnancy status (required for females 12–50: not pregnant / pregnant / planning / unknown; contraception counselled)
  - side-effects checklist
  - pain episodes since last visit
  - next appointment date
  - note

  AC:
  - All 8 labs can be entered in **under 60 seconds** by someone who knows the form.
  - Out-of-range values need confirmation.
  - The lab sample date is today or earlier.
  - A duplicate visit date shows a warning.
  - Patient name and folder no. stay pinned at the top.
- **US4.2 Summary before save.** Shows every value with ↑/↓ against the previous visit, the safety flags raised, and observed Hb change vs baseline.
- **US4.3 Draft.** An unfinished or failed save is kept on the device, encrypted, and resumable. AC: cleared at sign-out.
- **US4.4 Edit visit.** AC: a reason is required; audit-logged; flags re-evaluated; linked prediction marked outdated.

### E5. Prediction (research aid)
- **US5.1 Eligibility checklist** (§7). If blocked, I see the reason and what to do about it.
- **US5.2 Generate** from the latest saved visit. The view toggle (one model or compare all three; display only) and the comparison view are in `multi-model-prediction.md` §3. The result card always shows:
  - the class in plain words: "Hb rise ≥ 1 g/dL at next lab visit: likely / unlikely"
  - the probability, rounded to 5%
  - "N of 8 labs estimated"
  - an amber reliability note where §7 applies
  - **observed** Hb change vs baseline beside the prediction
  - active safety flags
  - the fixed disclaimer: "Predicts Hb rise at the next lab visit (typically 1–3 months). Not externally validated. Do not use alone to start, stop or dose HU."
- **US5.3 Record decision.** Options: continue and review / check adherence / titrate per protocol / refer / other, with a note.
  AC: the wording never links the decision to the prediction.
- **US5.4 Automatic outcome check.** When the next visit is saved, the app records whether the prediction came true (Hb ≥ baseline + 1.0) and shows it in the prediction history.
  AC:
  - The outcome is scored against the **baseline version the prediction used**.
  - If the next visit has transfused = yes or unknown, the outcome is "not assessable".
  - In MVP the research team exports outcomes as CSV from Django admin.

### E6. Monitoring
- **US6.1 Trends.** Hb with baseline and target lines; ANC, platelets, MCV.
- **US6.2 Flags.** Per §6, with acknowledge and action.
- **US6.3 Today worklist.** Unacknowledged flags; patients past their scheduled next appointment; handovers to me; new prediction outcomes.

### E7. Records
- **US7.1 Audit trail.** Every create, edit or export is logged on the server. In-app viewer comes later.
- **US7.2 PDF summary** (v1.1).
  AC: confirmation step; watermarked with clinician and date; every export logged.

## 10. Key user flows

**F1. First use**
Create account → signed in straight away → set PIN/biometrics → Today. The empty state says "Add your first patient".

**F2. New patient starting HU**
Patients → Add → demographics and consent → Save. If a possible duplicate is found, I choose "open existing" or "continue". The profile then prompts "Set baseline" (steady-state Hb, source, start date) and shows "Day 0 · prediction available from `date`".

**F2b. Existing patient already on HU**
Add patient → baseline "from folder" (or "unknown") → back-enter past visits in compact entry → the profile shows trends and observed response at once.

**F3. Routine visit (core flow)**
1. New Visit → search the patient. If not found, add them inline (F2) and come back.
2. Fill the one-screen form. Out-of-range values need confirmation; a cells/µL value prompts conversion.
3. Review the summary: deltas against last visit, flags, observed Hb change.
4. Save. If offline or the save fails, the draft is kept with "Retry".
5. If a flag is critical, an acknowledge sheet opens first.
6. If eligible, "Request prediction (research aid)" appears → result card → record decision → back to profile.
7. If the model service is down, the visit stays saved and I see "Prediction unavailable, try later".

**F4. Prediction blocked**
The checklist shows the reason. For example, "61 days on HU, eligible from 12 Feb 2027"; "Transfused in last 3 months"; or "Genotype not supported". The visit is already saved.

**F5. Correct a lab value**
Visit → Edit → change the value, give a reason → Save. Flags are re-evaluated and a banner says "Prediction outdated: re-run" (only if this is still the latest visit).

**F6. Clear flags**
Today → flagged patient → visit → acknowledge, choose an action (hold HU / repeat FBC / refer / other), add a note → the flag leaves the worklist.

**F7. Handover**
Profile → Reassign → choose a colleague and write a note → it appears on their Today tab.

**F8. Missed appointment**
Today → Overdue (past the scheduled next visit) → patient → call, using the phone number on the profile → log a contact note or set a new date.

## 11. Release plan

**MVP: safe record-keeping plus a launch-gated prediction**
- **Data:** §4 data model and migration; §5 canonical units and conversions.
- **Account and patients:** E1.1, E1.2 without MFA, E1.4–1.6; E2.1–2.4. Patient reassignment is done by the admin in Django admin.
- **Treatment and visits:** E3.1 (with baseline source), E3.3 dose in mg plus computed mg/kg on the visit (no timeline chart), E3.5 baseline versioning and outdating on the server (no history screen); E4.1–4.4.
- **Safety:** E6.2 safety flags (§6, except the MCV flag); Today tab showing unacknowledged flags only.
- **Prediction:** §7 eligibility and E5.1–5.4, built but behind a **server-side feature flag, off by default**. It is enabled per facility only after (a) the ML owner confirms the ARC unit and (b) ethics approval is recorded.
- **Screens:** profile with observed response, **full history timeline**, **lab trends** (Hb, ANC, platelets, MCV, dose mg/kg, with reference lines and event markers), and a **patient analytics card**; server-side audit log.
- **Platform:** Android FLAG_SECURE on patient screens.

**v1.1**
- MFA; full Today worklist; handover (US2.5); back-entry of past visits (US3.2); interruptions (US3.4); MCV adherence flag with a defined rule.
- Baseline history screen, extra patient filters, PDF export, in-app audit viewer.

**Later**
- Lab photo / OCR, offline sync with conflict handling, local SHAP explanations (computed on the server, phrased as "associated with", excluding imputed features), in-app admin.

**Removed**
- Patient symptom and medication diary, the unused lab screen, `Visit.status`, and the threshold toggle.

## 12. Open questions

1. ~~Shared or private patients?~~ Decided: shared per facility, with a primary clinician.
2. **ARC unit** the model expects, and how ARC was recorded in training. **ML owner.**
3. Haematologist sign-off on the §6 flag thresholds and §5 ranges against local protocol.
4. Ethics approval and pilot protocol for using the prediction with real patients.
5. Data Protection Act 2012 (Act 843) registration with the Data Protection Commission. Does Ghana FDA treat this as software as a medical device? **Legal.**
6. Hospital folder number format, for validation.
7. ~~Migrate or reset?~~ Decided: reset, after taking a dump.
8. ~~MFA in MVP?~~ Decided: v1.1. MVP relies on the idle lock and immediate server-side deactivation.

## Appendix: privacy and security requirements

- **Access:** facility-level authorisation enforced on the server for every object.
- **Transport and storage:** TLS only. Tokens in SecureStore. Drafts encrypted and cleared at sign-out.
- **Leak paths:** no patient data in logs, crash reports or push notifications. FLAG_SECURE on patient screens.
- **Exports:** confirmed, watermarked and logged.
- **Account checks:** licence numbers recorded at sign-up for later audit (no approval step). Deactivation takes effect immediately on the server.
