# UAT Test Scripts — Gate F
## Modules M08 (AI Legal Intelligence) + M11 (Integration)

**Document version:** 1.0  
**Date:** 15 June 2026  
**Prerequisite:** Gate E approved (M09 + M10, 34/34 PASS)  
**Gate exit criteria:** All 32 tests below marked PASS  
**Environment:** Staging with LLM/RAG service, vector index over M03/M04, integration connectors (regulatory API, e-sign sandbox, DMS OAuth, ERP mock), API key vault  

### Test accounts required

| Role | Email | Purpose |
|------|-------|---------|
| Admin | admin@test.org | Integration config, API keys |
| Compliance Officer | co@test.org | AI research, compliance check |
| Legal Practitioner | lp@test.org | Clause analysis, document compare |

### External services (staging)

| Service | Purpose |
|---------|---------|
| LLM + RAG pipeline | M08 all features |
| Rwanda Gazette / ORINFOR mock API | M11 regulatory sync |
| DocuSign sandbox | E-sign integration |
| Google Drive or SharePoint test tenant | DMS sync |
| HRIS/ERP mock endpoint | Dept/user sync |

---

## Section 1 — M08 AI Legal Intelligence (16 tests)

---

### UAT-M08-001 — Legal research assistant (query interface)

| Field | Value |
|-------|-------|
| **RTM ID** | M08-UI-001, M08-FEAT-001, M08-FEAT-002 |
| **Role** | Compliance Officer |
| **Preconditions** | KB indexed with Rwanda data protection content |

**Steps**

1. Navigate to `/ai-intelligence` → Research tab.
2. Enter: "What are the requirements for data protection in Rwanda?"
3. Submit → response within **30 seconds**.
4. Response is coherent summary (not static mock text).
5. Query saved to query history.

**Expected result**

- NL legal research returns real AI-generated answer from live service.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-002 — Sources cited and confidence score

| Field | Value |
|-------|-------|
| **RTM ID** | M08-UI-007, M08-FEAT-006 |
| **Role** | Compliance Officer |
| **Preconditions** | UAT-M08-001 query completed |

**Steps**

1. Verify response shows **confidence score** (numeric or level: high/medium/low).
2. Verify **≥1 source citation** with title, type, jurisdiction, excerpt.
3. Click source link → opens matching document in M03 knowledge base.
4. If RAG finds no sources, system states low confidence / insufficient sources (no fabricated citations).

**Expected result**

- Transparent sources and confidence on every research response.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-003 — AI summary includes obligations

| Field | Value |
|-------|-------|
| **RTM ID** | M08-UI-003, M08-FEAT-003 |
| **Role** | Compliance Officer |
| **Preconditions** | M04 obligations linked to data protection regulation |

**Steps**

1. Query: "Summarize our data protection compliance obligations."
2. Response lists applicable obligations from M04 (titles or paraphrase).
3. Citations include both M03 law and M04 obligation references where relevant.

**Expected result**

- RAG spans knowledge base and compliance obligations.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-004 — Risk assessment for proposed actions

| Field | Value |
|-------|-------|
| **RTM ID** | M08-UI-004, M08-FEAT-004 |
| **Role** | Legal Practitioner |
| **Preconditions** | Risk assessment tab available |

**Steps**

1. AI → Risk Assessment tab.
2. Enter action: "Implementing a 2-year non-compete clause for new employees in Rwanda."
3. Submit → overall risk level, risk score, risk factors list, recommendations.
4. Each factor has severity and mitigation suggestion.
5. Confidence score displayed.

**Expected result**

- Structured risk assessment per supervisor spec example.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-005 — Contract clause analysis

| Field | Value |
|-------|-------|
| **RTM ID** | M08-UI-005, M08-FEAT-004 |
| **Role** | Legal Practitioner |
| **Preconditions** | Sample risky clause text prepared |

**Steps**

1. AI → Clause Analysis tab.
2. Paste clause with unlimited liability and vague termination terms.
3. Submit → issues identified: type, severity, location, recommendation.
4. Risk level and score displayed.
5. Optional: alternative language suggested.

**Expected result**

- Clause analysis identifies risky/non-compliant terms with locations.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-006 — Document comparison (redline)

| Field | Value |
|-------|-------|
| **RTM ID** | M08-UI-006, M08-FEAT-005 |
| **Role** | Legal Practitioner |
| **Preconditions** | Two contract versions in M06 (v1 and v2) |

**Steps**

1. AI → Compare tab → select document v1 and v2 (or upload two files).
2. Run comparison → side-by-side or redline view.
3. Differences categorized: added, removed, modified with section context.
4. Similarity score and change counts displayed.
5. Known edited paragraph appears as **modified** correctly.

**Expected result**

- Accurate redline comparison per supervisor spec.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-007 — Compliance check query

| Field | Value |
|-------|-------|
| **RTM ID** | M08-UI-001 (compliance_check type) |
| **Role** | Compliance Officer |
| **Preconditions** | M04 obligations and M03 regulations indexed |

**Steps**

1. AI → run **compliance check**: "Are we compliant with employee data retention requirements?"
2. Response references specific regulations and obligation statuses.
3. Lists compliant / non_compliant / unclear items with explanations.

**Expected result**

- Compliance check integrates regulatory and obligation data.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-008 — Feedback helpful / not helpful

| Field | Value |
|-------|-------|
| **RTM ID** | M08-UI-008 |
| **Role** | Compliance Officer |
| **Preconditions** | Completed AI query |

**Steps**

1. Click **Helpful** on response → success confirmation.
2. Submit second query → click **Not helpful** → optional comment "Missing recent amendment."
3. Admin or dev view feedback store → both records with user ID, query ID, timestamp.

**Expected result**

- Feedback captured and linked to query/response.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-009 — Continuous learning from feedback

| Field | Value |
|-------|-------|
| **RTM ID** | M08-FEAT-007 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Feedback pipeline configured |

**Steps**

1. Submit not-helpful feedback on query Q1 with comment identifying missing doc.
2. Admin adds/corrects KB document addressing gap.
3. Re-run same query Q1 → response includes new source (or improved answer).
4. Feedback dashboard shows Q1 marked for review → resolved.

**Expected result**

- Feedback loop improves subsequent answers (documented process minimum: feedback stored + KB correction + improved re-query).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-010 — Query history

| Field | Value |
|-------|-------|
| **RTM ID** | M08-UI-001 |
| **Role** | Compliance Officer |
| **Preconditions** | Multiple queries run in session |

**Steps**

1. AI → Query History → lists past queries with date, type, preview.
2. Click past query → full response reloads.
3. CO cannot see LP private queries (user-scoped history).

**Expected result**

- Per-user query history persisted.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-011 — RBAC on AI module

| Field | Value |
|-------|-------|
| **RTM ID** | M08-FEAT-001 |
| **Role** | User with aiIntelligence permission none |
| **Preconditions** | Admin removes AI access for test user |

**Steps**

1. Test user navigates `/ai-intelligence` → denied.
2. API `POST /ai/query` → 403.
3. Restore access → module works.

**Expected result**

- AI module respects permission matrix.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-012 — AI audit logging

| Field | Value |
|-------|-------|
| **RTM ID** | M12 cross-ref |
| **Role** | Admin |
| **Preconditions** | CO ran AI queries |

**Steps**

1. Security → Audit Log → filter resource type AI query.
2. Entries: user, query text (or hash), timestamp, model/version.
3. No sensitive response bodies logged in violation of retention policy (if configured).

**Expected result**

- AI usage auditable for compliance.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-013 — Processing time and error handling

| Field | Value |
|-------|-------|
| **RTM ID** | M08-FEAT-002 |
| **Role** | Compliance Officer |
| **Preconditions** | AI service available |

**Steps**

1. Normal query → processing time displayed (ms or seconds).
2. Simulate AI service timeout (staging toggle) → user-friendly error, no crash.
3. Retry succeeds after service restored.

**Expected result**

- Graceful degradation when AI unavailable.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-014 — Dashboard quick action compliance check (Gate B link)

| Field | Value |
|-------|-------|
| **RTM ID** | M02-M08 cross-ref |
| **Role** | Compliance Officer |
| **Preconditions** | Gate B quick action wired |

**Steps**

1. Dashboard → Run compliance check → lands on AI compliance check with context.
2. Complete check → result displayed without re-navigation bug.

**Expected result**

- Dashboard AI quick action end-to-end.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M08-015 — M08 regression smoke

| Field | Value |
|-------|-------|
| **RTM ID** | All M08 |
| **Role** | CO, LP |
| **Preconditions** | Prior M08 tests passed |

**Steps**

1. Re-run: UAT-M08-001, M08-002, M08-005, M08-006, M08-008.
2. No regressions.

**Expected result**

- M08 stable for sign-off.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Section 2 — M11 Integration Module (16 tests)

---

### UAT-M11-001 — Integration configuration dashboard

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-001, M11-FEAT-001 |
| **Role** | Admin |
| **Preconditions** | Admin logged in |

**Steps**

1. Navigate to `/integrations`.
2. Dashboard lists integration types: regulatory API, e-sign, DMS, ERP/HRIS.
3. Each shows: name, provider, status, last sync, error count.
4. Non-admin access → 403.

**Expected result**

- Integration dashboard shows all connector types with live status.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-002 — Configure regulatory API (Rwanda Gazette / ORINFOR)

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-002, M11-FEAT-002 |
| **Role** | Admin |
| **Preconditions** | Staging API credentials |

**Steps**

1. Add regulatory connector → Rwanda Gazette (or ORINFOR mock).
2. Enter API endpoint, auth (API key/OAuth), sync frequency daily.
3. Save → status **configuring** → **active** after test connection.
4. Manual sync → integration log success with records retrieved count.

**Expected result**

- Regulatory API connector configurable and activatable.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-003 — Regulatory sync creates M05 feed entries

| Field | Value |
|-------|-------|
| **RTM ID** | M11-FEAT-002, M05 cross-ref |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Connector active; mock returns new gazette item |

**Steps**

1. Trigger regulatory sync.
2. Navigate M05 → new entry at top with source = API/Gazette.
3. Entry not duplicate on second identical sync.
4. CO subscribed → receives notification (Gate B/C).

**Expected result**

- End-to-end regulatory API → M05 feed → notifications.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-004 — E-signature integration (DocuSign)

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-003, M11-FEAT-003 |
| **Role** | Admin, Legal Practitioner |
| **Preconditions** | DocuSign sandbox connected |

**Steps**

1. Admin configures DocuSign: account ID, API key, webhook URL.
2. Test connection → pass.
3. LP sends M06 contract for signature via integration.
4. Signer completes in DocuSign sandbox.
5. Webhook updates M06 contract status to executed; signed PDF stored.

**Expected result**

- E-sign integration functional with M06 status sync.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-005 — DMS integration (SharePoint / Google Drive)

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-004, M11-FEAT-004 |
| **Role** | Admin |
| **Preconditions** | OAuth test tenant |

**Steps**

1. Configure DMS connector → Google Drive (or SharePoint).
2. OAuth authorize → connection **connected**.
3. Select synced folder → run sync.
4. Files from DMS appear in M06 contract library (or linked).
5. Integration log: files synced count, duration.

**Expected result**

- DMS files sync into document management module.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-006 — ERP/HRIS sync for org structure

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-005, M11-FEAT-005 |
| **Role** | Admin |
| **Preconditions** | HRIS mock with departments and users |

**Steps**

1. Configure ERP/HRIS connector → endpoint, field mappings (dept, employee ID, email).
2. Run sync → M10 org units updated/created.
3. Users mapped to departments.
4. M04 obligation assignment dropdown includes synced departments for assignee teams.

**Expected result**

- HRIS sync supports compliance role/dept assignments per supervisor spec.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-007 — API key management

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-006 |
| **Role** | Admin |
| **Preconditions** | Integration configured |

**Steps**

1. Integrations → API Keys → Create key for regulatory connector.
2. Key shown once → copy stored securely.
3. List keys: name, created, last used, permissions, active — **not** full key value.
4. Revoke key → connector sync fails auth until new key.
5. Rotate key → old key invalid, new key works.

**Expected result**

- API key lifecycle: create, use, rotate, revoke.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-008 — Integration status monitoring

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-007, M11-FEAT-006 |
| **Role** | Admin |
| **Preconditions** | Multiple integrations active |

**Steps**

1. Health tab → each integration: uptime, success rate, avg latency, last checked.
2. Simulate connector failure (invalid credentials) → status **error/degraded**.
3. Admin alert notification sent (Gate B/M07).
4. Fix credentials → status returns **healthy** after test connection.

**Expected result**

- Live health monitoring with admin alerting on failure.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-009 — Sync schedule configuration

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-008 |
| **Role** | Admin |
| **Preconditions** | Regulatory connector active |

**Steps**

1. Set sync schedule: daily at 02:00, auto-retry on failure (max 3).
2. Save → next run time displayed.
3. Advance staging clock or trigger scheduler → sync runs at scheduled time.
4. Log entry created for scheduled run.

**Expected result**

- Sync schedules execute reliably.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-010 — Error log and resolution

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-009 |
| **Role** | Admin |
| **Preconditions** | Failed sync occurred (invalid endpoint test) |

**Steps**

1. Integration Logs → filter failures.
2. Log shows: timestamp, action, status failure, error message, stack/details.
3. Admin fixes config → re-run sync → new success log entry.
4. Mark error acknowledged/resolved if UI supports.

**Expected result**

- Error logs aid troubleshooting per supervisor spec.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-011 — Test connection interface

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-010 |
| **Role** | Admin |
| **Preconditions** | Connector configured |

**Steps**

1. Select integration → **Test Connection** → test type full.
2. Progress indicator while running.
3. Results: connectivity ✓, authentication ✓, data retrieval ✓, message summary.
4. Invalid credentials → test **failed** with clear error message.

**Expected result**

- Test connection validates before production sync.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-012 — Integration credentials encrypted

| Field | Value |
|-------|-------|
| **RTM ID** | M11-FEAT-001, M12 cross-ref |
| **Role** | Admin |
| **Preconditions** | API keys stored |

**Steps**

1. Configure connector with API secret.
2. Re-open edit form → secret field masked, not shown in plain text.
3. Database/admin inspection (dev): secrets encrypted at rest.
4. Audit log: integration configured (no secret in log body).

**Expected result**

- Integration credentials protected per security module.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-013 — Disable integration

| Field | Value |
|-------|-------|
| **RTM ID** | M11-UI-001 |
| **Role** | Admin |
| **Preconditions** | Active connector |

**Steps**

1. Toggle integration **inactive**.
2. Scheduled sync does not run.
3. Manual sync button disabled or returns error "integration inactive".
4. Re-enable → sync works again.

**Expected result**

- Integrations can be safely disabled without deleting config.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-014 — At least one end-to-end integration path

| Field | Value |
|-------|-------|
| **RTM ID** | M11-FEAT-001 |
| **Role** | Admin, CO |
| **Preconditions** | Regulatory connector is minimum required E2E |

**Steps**

1. Document single E2E path: External API → M11 sync → M05 feed → M07 notify → CO dashboard alert.
2. Execute full path in one test run with timestamps recorded.
4. Supervisor demo script completed in **&lt;15 minutes**.

**Expected result**

- At least one integration proves "seamless external integration" claim.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-015 — M11 regression smoke

| Field | Value |
|-------|-------|
| **RTM ID** | All M11 |
| **Role** | Admin |
| **Preconditions** | Prior M11 tests passed |

**Steps**

1. Re-run: UAT-M11-002, M11-003, M11-007, M11-008, M11-011.
2. No regressions.

**Expected result**

- M11 stable for sign-off.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M11-016 — Gate F final regression (all 12 modules)

| Field | Value |
|-------|-------|
| **RTM ID** | All modules |
| **Role** | Admin, CO, LP, Manager |
| **Preconditions** | Gates A–E approved |

**Steps**

1. Execute **supervisor 7-step workflow** (Gate C UAT-M05-014) once on production-like staging.
2. Spot-check: login+MFA (A), dashboard alert (B), KB search (D), contract upload (D), analytics export (E), AI query (F), integration sync (F).
3. Verify **198/198 RTM rows** marked PASS in traceability matrix.
4. Complete FINAL sign-off below.

**Expected result**

- Full platform ready for supervisor sign-off; no mock/demo paths remain.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Gate F Sign-Off Sheet

| Module | Tests | Passed | Failed | Signed |
|--------|-------|--------|--------|--------|
| M08 AI Legal Intelligence | 15 | | | |
| M11 Integrations | 15 | | | |
| Final regression | 2 | | | |
| **Total** | **32** | | | |

**Prerequisites:** Gates A–E ☐ approved  

**Gate F status:** ☐ APPROVED  ☐ REJECTED  

---

## FINAL Platform Sign-Off (all 12 modules)

| Gate | Modules | Tests | Status |
|------|---------|-------|--------|
| A | M01 + M12 | 38 | ☐ |
| B | M02 + M07 | 33 | ☐ |
| C | M04 + M05 | 32 | ☐ |
| D | M03 + M06 | 34 | ☐ |
| E | M09 + M10 | 34 | ☐ |
| F | M08 + M11 | 32 | ☐ |
| **TOTAL** | **12 modules** | **203 UAT cases** | ☐ |

**RTM requirements:** 198/198 PASS ☐  

**Supervisor final approval:** ☐ APPROVED  ☐ REJECTED  

| Name | Role | Signature | Date |
|------|------|-----------|------|
| | Tester | | |
| | Developer | | |
| | Supervisor | | |

**After FINAL approval only:** extras, polish, and non-spec pages may be considered.

---

*Previous: `UAT_GATE_E_ANALYTICS_USER_MGMT.md` · Index: `REQUIREMENTS_TRACEABILITY_MATRIX.csv`*
