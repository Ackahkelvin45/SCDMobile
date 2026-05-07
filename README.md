# SickleCare — Mobile App Design Brief

A React Native / Expo mobile app for Sickle Cell Disease follow-up care. Clinicians and patients track Hydroxyurea (HU) treatment over time, log visit labs, manage medications, and generate an AI-powered HU response prediction for the next clinic visit.

---

## Purpose of This Document

This document is written so an AI assistant has enough context to design or rebuild any screen accurately. Every section includes: what data arrives from the API, what states the screen must handle, what the user sees in each state, and exact field names so nothing is invented.

---

## Clinical Summary (Needed to Write Correct Copy)

- Patients are on **Hydroxyurea (HU)** for Sickle Cell Disease.
- The app predicts: **"Will this patient respond to HU at their next clinic visit?"**
- **Responder** = haemoglobin improvement ≥ 1.0 g/dL from the HU start baseline.
- **Non-Responder** = haemoglobin improvement < 1.0 g/dL.
- Prediction uses labs from the **most recently logged visit** — the doctor logs a visit, saves it, then taps Predict.
- Minimum 90 days on HU before a visit is assessable — any patient under this threshold cannot be predicted.
- The model was evaluated on paediatric and adult cohorts; age is a feature.

---

## Design System

### Colour Tokens

| Token | Hex | Usage |
|---|---|---|
| `green-primary` | `#22C55E` | Responder result, stable status, HU active |
| `green-gradient-start` | `#16A34A` | Risk card gradient top |
| `green-gradient-end` | `#4ADE80` | Risk card gradient bottom |
| `red-primary` | `#EF4444` | Non-Responder result, elevated status, pain 7+ |
| `amber-primary` | `#F59E0B` | Monitor status, uncertain result, pain 5–6 |
| `blue-primary` | `#3B82F6` | Info, links |
| `grey-surface` | `#F4F4F5` | Card backgrounds, inactive elements |
| `grey-text` | `#71717A` | Secondary labels, reference ranges |
| `white` | `#FFFFFF` | Primary card background |
| `dark-text` | `#18181B` | Primary text |

### Status Pills

Three variants used consistently across History, Home dashboard, and Predict result:

| Label | Background | Text | When |
|---|---|---|---|
| STABLE | `#DCFCE7` | `#16A34A` | Responder predicted / Hb normal |
| MONITOR | `#FEF9C3` | `#CA8A04` | Borderline / uncertain |
| ELEVATED | `#FEE2E2` | `#DC2626` | Non-Responder predicted / Hb low |

### Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Screen title | Syne | 700 | 24px |
| Card heading | Syne | 600 | 18px |
| Section label | Mulish | 600 | 14px |
| Body / description | Mulish | 400 | 14px |
| Caption / hint | Mulish | 400 | 12px |
| Button label | Mulish | 700 | 16px |

### Component Patterns

- **Cards:** white background, `border-radius: 16px`, subtle shadow (`0 2px 8px rgba(0,0,0,0.08)`)
- **Primary button:** full-width, `border-radius: 12px`, `height: 52px`, green background, white label
- **Destructive button:** white background, red border and label
- **Form inputs:** `border-radius: 10px`, grey border, Mulish 14px, 48px height
- **Progress bar** (Log Visit): thin green bar at top of screen, animates step-by-step
- **Step slide animation:** spring slide — current step slides out left, next step slides in from right

---

## Navigation Map

```
app/index.tsx             Splash / gate (checks SecureStore for token)
    └── onboarding.tsx    3-slide carousel (shown once)
            ├── (auth)/register.tsx   ──► signup-success.tsx ──► (auth)/login.tsx
            └── (auth)/login.tsx
                    └── (tabs)/
                            ├── index.tsx       Home / Dashboard
                            ├── log.tsx         Log Visit (13-step guided form)
                            ├── predict.tsx     Predict HU Response
                            ├── history.tsx     History
                            └── profile.tsx     Profile

Home quick-actions also open:
    (log)/symptoms.tsx
    (log)/medication.tsx
    (tabs)/log.tsx         ← "Add Lab Data" redirects here, NOT (log)/lab.tsx
```

---

## Screens

---

### 1. Onboarding — `app/onboarding.tsx`

**Layout:** Full-screen background photo. White card anchored to the bottom third, rounded top corners. Dot indicator above the card text.

**Slides (3 total):**

| Slide | Tag | Title | Subtitle |
|---|---|---|---|
| 1 | TRACK | "Monitor Your Hydroxyurea Journey" | "Log every clinic visit and see how your blood counts evolve over time." |
| 2 | PREDICT | "Know What's Coming" | "Our AI analyses your visit history to predict your response at the next follow-up." |
| 3 | CARE | "Built for Sickle Cell" | "Designed with clinicians for HbSS, HbSC, and HbSβ patients." |

**Controls:**
- Animated dot indicator: active dot stretches (e.g. 8px → 24px), inactive dots are 8px circles
- "Skip" text button top-right → jumps to slide 3
- "Continue" primary button → next slide; on slide 3 becomes "Get Started" → `/(auth)/register`
- "Already have an account? Sign In" text link → `/(auth)/login`
- Slide text fades + translates up (+20px → 0) on transition

---

### 2. Login — `app/(auth)/login.tsx`

**API call:** `POST /auth/login/`

**Request body:**
```json
{ "email": "string", "password": "string" }
```

**Success response:**
```json
{ "access": "jwt_token", "refresh": "jwt_token" }
```

**Error response (401):**
```json
{ "detail": "No active account found with the given credentials" }
```

**Fields:**
- Email input (keyboard: `email-address`, autocapitalize: `none`)
- Password input + show/hide eye toggle

**States:**
- Idle: form ready
- Loading: "Sign in" button shows spinner, disabled
- Error: red inline message below the button showing `detail` from API

**Copy:**
- Screen title: "Welcome Back"
- Subtitle: "Sign in to continue your care journey"
- Button: "Sign In"
- Bottom link: "Don't have an account? **Sign Up**"
- Forgot password link (not wired yet, show grayed-out)

**On success:** save `access` + `refresh` to Expo SecureStore, navigate to `/(tabs)`

---

### 3. Register — `app/(auth)/register.tsx`

**API call:** `POST /auth/users/`

**Request body (all fields match `CustomUser` model):**
```json
{
  "full_name": "string",
  "email": "string",
  "phone_number": "string",
  "date_of_birth": "YYYY-MM-DD",
  "gender": "male | female | other | not_specified",
  "genotype": "HbSS | HbSC | HbSβ+ | HbSβ0 | not_sure",
  "password": "string",
  "password2": "string"
}
```

**Password rules (enforced by backend):**
- Minimum 8 characters
- At least one digit
- At least one letter

**Fields in order:**

| Field | Input type | Notes |
|---|---|---|
| Full name | Text | autocapitalize words |
| Email | Email | lowercase |
| Phone number | Phone | optional |
| Date of birth | Custom modal picker | scroll day / month / year separately |
| Gender | Dropdown | Male, Female, Other, Prefer not to say → maps to `male`, `female`, `other`, `not_specified` |
| Genotype | Dropdown | HbSS, HbSC, HbSβ⁺, HbSβ⁰, Not sure → stored verbatim; backend maps HbSβ⁺ → `dont_know` for model only |
| Password | Password + eye toggle | |
| Confirm password | Password + eye toggle | |

**States:**
- Idle: form
- Loading: "Create Account" button shows spinner
- Field error: red text beneath the specific field
- API error: banner below form showing the message

**Copy:**
- Screen title: "Create Account"
- Subtitle: "Your clinical profile helps personalise your predictions"
- Button: "Create Account"
- Bottom link: "Already have an account? **Sign In**"

**On success:** navigate to `/(auth)/signup-success`

---

### 4. Signup Success — `app/(auth)/signup-success.tsx`

**Layout:** Centred illustration (green checkmark circle), heading, subtitle, single button.

**Copy:**
- Illustration: large animated green check (scale 0 → 1)
- Heading: "You're all set!"
- Subtitle: "Your account has been created. Sign in to begin tracking your care."
- Button: "Go to Sign In" → `/(auth)/login`

---

### 5. Home / Dashboard — `app/(tabs)/index.tsx`

**Data sources (all currently mock — to be wired):**

| Data | Source |
|---|---|
| Latest prediction | `GET /ml/predictions/latest/?patient_id=X` |
| Latest visit labs | `GET /visits/latest/` |
| Recent pain history | `GET /visits/?limit=7` |
| Medications | `GET /medications/today/` |

**States to handle:**
- Loading: skeleton cards (grey animated shimmer)
- No visits logged yet: empty state card — "Log your first visit to unlock predictions"
- Data loaded: full dashboard

**Sections:**

#### Risk Level Card (green gradient, full-width)
- Status pill: `STABLE` / `MONITOR` / `ELEVATED`
- Headline (3 variants):
  - Responder: "High likelihood of HU response at next follow-up"
  - Non-Responder: "Low likelihood of HU response at next follow-up"
  - No prediction yet: "Log a visit to generate your first prediction"
- Mini stats row — 3 inline stats: `Hb X.X g/dL` · `WBC X.X k/µL` · `Pain X/10`
- Source: latest visit `prev_hgb`, `prev_wbc`, pain from visit record

#### Pain Trend Chart
- 7-bar chart, one bar per day (Mon–Sun)
- Bar colour: green if pain ≤ 4, amber if pain 5–6, red if pain ≥ 7
- No data bar: light grey, height 0
- X-axis labels: 3-letter day abbreviations
- "See all" text button → History tab

#### Today's Medications
- List of medication cards (icon + name + dose + status toggle)
- Status: green checkmark pill "Taken" or grey clock pill "Pending"
- "See all" → `/(log)/medication`

#### Quick Actions (2×2 grid of square cards)
- Log Symptoms → `/(log)/symptoms`
- Add Lab Data → `/(tabs)/log`
- Medications → `/(log)/medication`
- Predict HU Response → `/(tabs)/predict`

---

### 6. Log Visit — `app/(tabs)/log.tsx`

**API call (on Save & Sync):** `POST /visits/`

**Request body:**
```json
{
  "visit_date": "YYYY-MM-DD",
  "hgb": 10.2,
  "wbc": 8.4,
  "platelet_count": 320,
  "hct": 31.5,
  "rbc": 3.6,
  "mcv": 88,
  "anc": 3200,
  "arc": 48.0,
  "toxicity_nausea": false,
  "toxicity_vomiting": false,
  "toxicity_rash": false,
  "toxicity_fatigue": false,
  "toxicity_headache": false,
  "toxicity_neutropenia": false,
  "pain_episodes": 2,
  "lab_photo_url": null
}
```

**Response:** `{ "id": "uuid", "visit_date": "...", ... }` — the visit ID is stored and used for prediction.

**Layout:** Single-field-at-a-time guided form. Progress bar at top. Spring slide animation between steps. "Back" arrow top-left. Step counter top-right "X of 13".

**Steps:**

| Step | Label | Field | Unit | Reference range | Input type |
|---|---|---|---|---|---|
| 1 | Date of Visit | `visit_date` | — | defaults to today | Date picker |
| 2 | Haemoglobin | `hgb` | g/dL | 11.5 – 17.5 | Numeric decimal |
| 3 | White Blood Cells | `wbc` | ×10³/µL | 4.5 – 11.0 | Numeric decimal |
| 4 | Platelets | `platelet_count` | ×10³/µL | 150 – 400 | Numeric integer |
| 5 | Haematocrit | `hct` | % | 36 – 50 | Numeric decimal |
| 6 | Red Blood Cells | `rbc` | ×10¹²/L | 3.8 – 5.8 | Numeric decimal |
| 7 | Mean Corpuscular Volume | `mcv` | fL | 80 – 100 | Numeric integer |
| 8 | Neutrophils (ANC) | `anc` | /µL | 1800 – 7700 | Numeric integer |
| 9 | **Reticulocyte Count (ARC)** | `arc` | ×10⁹/L | 25 – 85 | Numeric decimal |
| 10 | Lab Report Photo | `lab_photo_url` | — | — | Camera / gallery picker |
| 11 | Toxicity / Side Effects | `toxicity_*` | — | — | 6 checkboxes |
| 12 | Pain Episodes | `pain_episodes` | count | 0 – 6+ | Tap selector 0–6+ |
| 13 | Summary + Save | — | — | — | Review all + "Save & Sync" button |

**ARC (Step 9) — display note:**
> "Reticulocyte Count (ARC) is the earliest blood marker to rise when Hydroxyurea is working. It reflects the bone marrow's response."

**Per-field UI elements:**
- Large centred number input (font-size 40px)
- Reference range shown below in grey: "Normal: 11.5 – 17.5 g/dL"
- Previous value shown below in blue: "Last visit: 9.8 g/dL" (from `GET /visits/latest/`)
- "Skip" text link bottom-right to advance without entering a value

**Toxicity checkboxes (step 11):**

| Label | Field |
|---|---|
| Nausea | `toxicity_nausea` |
| Vomiting | `toxicity_vomiting` |
| Rash | `toxicity_rash` |
| Fatigue | `toxicity_fatigue` |
| Headache | `toxicity_headache` |
| Low neutrophil count | `toxicity_neutropenia` |

**Pain episodes (step 12):**
- Row of tappable numbers: 0, 1, 2, 3, 4, 5, 6+
- Selected number has green background and white text
- Label: "How many pain episodes did you have since your last visit?"

**Summary (step 13):**
- Two-column grid listing each field + entered value (or "Skipped" in grey if not entered)
- "Save & Sync" primary button → POST /visits/
- After success: "New Entry" button resets form to step 1

**States:**
- Saving: button shows spinner + "Saving…"
- Success: brief green checkmark animation, then show "New Entry" button
- Error: inline error message below the button

---

### 7. Symptoms — `app/(log)/symptoms.tsx`

**API call (to be built):** `POST /symptoms/`

**Fields:**

| Control | Field | Values |
|---|---|---|
| Gradient slider (PanResponder) | `pain_level` | 0–10, colour shifts green → amber → red |
| Dropdown | `pain_location` | Joints, Back, Chest, Head, Abdomen, Limbs |
| Dropdown | `stress_level` | Low, Moderate, High, Very High |
| Dropdown | `hydration_level` | <1L, 1–2L, 2–3L, 3L+ |
| Toggle switches (6) | `symptom_fever`, `symptom_fatigue`, `symptom_headache`, `symptom_joint_pain`, `symptom_nausea`, `symptom_dizziness` | boolean |

**Symptom toggle layout:**
- Each toggle: colour-coded icon (e.g. Fever = flame orange, Fatigue = grey battery, Headache = blue head) + label + Switch on the right
- Two-column grid or single-column list

**Copy:**
- Screen title: "How Are You Feeling?"
- Save button: "Save Symptoms"

---

### 8. Medication — `app/(log)/medication.tsx`

**API call (to be built):** `POST /medications/log/`

**Layout: two cards**

**Card 1 — Prescription:**
- Green gradient header: "Taking Hydroxyurea"
- Active / Inactive toggle
- Editable dosage field: "500 mg" (tap to edit)

**Card 2 — Daily Log:**
- Label: "Today's Dose" + formatted date (e.g. "Tuesday, 6 May 2026")
- Large toggle: "I took my dose today" (green when on)

**Copy:**
- Screen title: "Medications"
- Save button: "Save"

---

### 9. Predict — `app/(tabs)/predict.tsx`

**API call:** `POST /ml/predict-hu-response/`

**Request:**
```json
{ "patient_id": "uuid", "visit_id": "uuid" }
```

**Response:**
```json
{
  "response_probability": 0.71,
  "predicted_class": "responder",
  "model_version": "1.0",
  "target_definition": "hgb improvement >= 1.0 g/dL from HU baseline at next eligible visit",
  "threshold": 0.43,
  "threshold_type": "Best F1"
}
```

**Three animated states (fade transition between each):**

#### State 1 — Idle
- Card with icon (brain / DNA)
- Heading: "HU Response Prediction"
- Subtitle: "Uses your most recent visit labs to predict your response at the next follow-up."
- Prerequisite check: if no visit logged → show warning card: "You need to log a visit first before generating a prediction." + button "Log a Visit" → `/(tabs)/log`
- Primary button: "Generate Prediction"

#### State 2 — Loading (2–3s real request, not mocked)
- Spinner (green)
- Primary text: "Analysing your health data…"
- Secondary text: "Processing key vital metrics"

#### State 3 — Result

**Result card — Responder** (green gradient):
- Status pill: STABLE
- Icon: checkmark circle
- Headline: "Likely Responder at Next Visit"
- Probability display: "71% probability of response"
- Confidence bar: filled green to 71%

**Result card — Non-Responder** (red/amber gradient):
- Status pill: ELEVATED
- Icon: warning triangle
- Headline: "Low Likelihood of HU Response"
- Probability display: "29% probability of response"
- Confidence bar: filled red to 29%

**Probability display logic:**
| `response_probability` | Display colour | Label |
|---|---|---|
| ≥ 0.60 | Green | "Likely Responder" |
| 0.40 – 0.59 | Amber | "Uncertain — monitor closely" |
| < 0.40 | Red | "Low likelihood of response" |

**Clinical Recommendation card (below result card):**

| predicted_class | Recommendation copy |
|---|---|
| responder | "Continue current Hydroxyurea dose and schedule next follow-up as planned. Monitor Hb and ARC trends." |
| non_responder | "Review HU dose and adherence. Consider escalating monitoring frequency or discussing dose adjustment with clinician." |

**Feature importance card (static, from training SHAP rankings):**

List top 5 features in order of importance, displayed as a horizontal bar list:
1. Reticulocyte Count (ARC)
2. Haemoglobin (Hb)
3. Baseline Hb at HU start
4. Days on Hydroxyurea
5. Age

Show brief description: "These are the factors that most influence the prediction for this patient population."

**"Run Again" button:** resets to Idle state. Tapping this should use the same `visit_id` (not create a new one).

**Threshold note** (small grey caption at bottom):
> "Prediction uses threshold: {threshold} ({threshold_type}). Results are clinical decision support — not a diagnosis."

---

### 10. History — `app/(tabs)/history.tsx`

**API calls:**
- `GET /visits/?limit=20` — recent visit logs
- `GET /visits/trends/?days=7` — sparkline data

**Visit list item fields (from API):**
```json
{
  "id": "uuid",
  "visit_date": "2026-04-15",
  "hgb": 10.2,
  "wbc": 8.4,
  "pain_episodes": 2,
  "predicted_class": "responder | non_responder | null",
  "status": "STABLE | MONITOR | ELEVATED"
}
```

**States:**
- Loading: skeleton rows
- Empty: "No visits logged yet. Tap Log Visit to begin."
- Loaded: sections below

**Sections:**

#### Trend cards (side by side, 50% width each)
- Pain Trend: 7-day sparkline, green / amber / red bars
- Hb Trend: 7-day line sparkline, green line

#### Visit log list
- Each item:
  - Date (e.g. "15 Apr 2026")
  - Title (e.g. "Clinic Visit")
  - Status pill: STABLE / MONITOR / ELEVATED
  - Hb value: "Hb 10.2 g/dL"
  - Tap → visit detail screen (to be built)

- "Load Older Logs" button at bottom (pagination: `GET /visits/?offset=20&limit=20`)

---

### 11. Profile — `app/(tabs)/profile.tsx`

**API call:** `GET /auth/users/me/`

**Response shape (from `UserSerializer`):**
```json
{
  "email": "patient@example.com",
  "full_name": "Kwame Mensah",
  "date_of_birth": "1998-03-12",
  "gender": "male",
  "phone_number": "+233244000000",
  "genotype": "HbSS"
}
```

**Derived display values** (computed in the app):
- **Patient ID:** first 8 characters of UUID (from token decode or separate call)
- **Age:** today's year minus `date_of_birth` year (adjust for birthday)
- **Genotype display:** "HbSS" → "Hb SS", "HbSC" → "Hb SC", "HbSβ+" → "Hb Sβ⁺", "HbSβ0" → "Hb Sβ⁰"
- **Gender display:** "male" → "Male", "not_specified" → "Prefer not to say"

**States:**
- Loading: grey shimmer on avatar circle + text rows
- Error: "Could not load profile. Pull to refresh."
- Loaded: full profile

**Layout:**
- Circular avatar 230×230 — fallback to local placeholder if no `profile_photo_url`
- Identity card below avatar:
  - Full Name (large, Syne 22px)
  - Patient ID (grey caption: "ID: A3F9B12C")
  - Grid rows: Age · Genotype · Gender · Phone · Email

**Buttons:**
- "Edit Profile" — secondary button (shows "Coming soon" alert for now)
- "Log Out" — destructive button; calls `POST /auth/logout/` → clears SecureStore → clears React Query cache → navigate to `/(auth)/login`; shows spinner while in flight

---

## API Response Reference

### Auth — `GET /auth/users/me/`
```json
{
  "email": "string",
  "full_name": "string",
  "date_of_birth": "YYYY-MM-DD",
  "gender": "male | female | other | not_specified",
  "phone_number": "string | null",
  "genotype": "HbSS | HbSC | HbSβ+ | HbSβ0 | not_sure | null"
}
```

### Login — `POST /auth/login/`
```json
{ "access": "jwt_string", "refresh": "jwt_string" }
```

### Visit save — `POST /visits/`
```json
{
  "id": "uuid",
  "visit_date": "YYYY-MM-DD",
  "hgb": 10.2, "wbc": 8.4, "platelet_count": 320, "hct": 31.5,
  "rbc": 3.6, "mcv": 88, "anc": 3200, "arc": 48.0,
  "toxicity_nausea": false, "toxicity_vomiting": false,
  "toxicity_rash": false, "toxicity_fatigue": false,
  "toxicity_headache": false, "toxicity_neutropenia": false,
  "pain_episodes": 2, "lab_photo_url": null
}
```

### Prediction — `POST /ml/predict-hu-response/`

Request: `{ "patient_id": "uuid", "visit_id": "uuid" }`

Response:
```json
{
  "response_probability": 0.71,
  "predicted_class": "responder | non_responder",
  "model_version": "1.0",
  "target_definition": "hgb improvement >= 1.0 g/dL from HU baseline at next eligible visit",
  "threshold": 0.43,
  "threshold_type": "Best F1"
}
```

---

## Model Feature Reference (for Backend — Do Not Display Raw in UI)

These are the exact features the ML model receives. The backend constructs this vector from the saved visit + patient record. The app never sends this directly.

```
age                    ← from date_of_birth
gender_encoded         ← male=0, female=1
hb_genotype_encoded    ← ss=0, sc=1, sbo=2, dont_know=3  (HbSβ+ → 3)
baseline_hgb           ← from patient HU baseline record
prev_hgb               ← from saved visit: hgb
prev_anc               ← from saved visit: anc
prev_arc               ← from saved visit: arc  ← most important feature
prev_platelet_count    ← from saved visit: platelet_count
prev_wbc               ← from saved visit: wbc
prev_rbc               ← from saved visit: rbc
prev_mcv               ← from saved visit: mcv
prev_hct               ← from saved visit: hct
prev_days_on_hu        ← computed: visit_date − hu_start_date
```

**Feature importance ranking (from SHAP — informs what to emphasise in the UI):**
1. `prev_arc` — Reticulocyte Count (strongest signal for HU response)
2. `prev_hgb` — Haemoglobin
3. `baseline_hgb` — HU initiation baseline
4. `prev_days_on_hu` — Time on treatment
5. `age`

---

## Genotype Mapping Table

| Registered value | Displayed as | Model encoding |
|---|---|---|
| HbSS | Hb SS | ss → 0 |
| HbSC | Hb SC | sc → 1 |
| HbSβ⁰ | Hb Sβ⁰ | sbo → 2 |
| HbSβ⁺ | Hb Sβ⁺ | **dont_know → 3** (no dedicated class) |
| not_sure | Not Sure | dont_know → 3 |

---

## Lab Reference Ranges (Show in Log Visit Form)

| Lab | Field | Unit | Normal Range |
|---|---|---|---|
| Haemoglobin | `hgb` | g/dL | 11.5 – 17.5 |
| White Blood Cells | `wbc` | ×10³/µL | 4.5 – 11.0 |
| Platelets | `platelet_count` | ×10³/µL | 150 – 400 |
| Haematocrit | `hct` | % | 36 – 50 |
| Red Blood Cells | `rbc` | ×10¹²/L | 3.8 – 5.8 |
| MCV | `mcv` | fL | 80 – 100 |
| Neutrophils (ANC) | `anc` | /µL | 1,800 – 7,700 |
| Reticulocyte Count (ARC) | `arc` | ×10⁹/L | 25 – 85 |

---

## Screens Still Missing

| Screen | Needed for |
|---|---|
| Visit detail | Tapping a history entry to see all labs for that visit |
| Edit Profile | `PATCH /auth/users/me/` — backend already supports it |
| HU Baseline Setup | Initial screen to record `baseline_hgb` + `hu_start_date` when patient starts HU |
| < 90 days warning | Predict screen: if patient is within first 90 days on HU, prediction is not available |

---

## Implementation Status

| Screen | UI | API wired |
|---|---|---|
| Onboarding | Done | — |
| Login | Done | Yes |
| Register | Done | Yes |
| Signup Success | Done | — |
| Home | Done (mock data) | No |
| Log Visit (13 steps) | Done except ARC step 9 | No |
| Symptoms | Done | No |
| Medication | Done | No |
| Predict | Done (mocked) | No |
| History | Done (mock data) | No |
| Profile | Done | Yes |
| lab.tsx | Deprecated | — |
