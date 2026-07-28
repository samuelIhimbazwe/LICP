# UAT Test Scripts — Gate C
## Modules M04 (Compliance Tracking) + M05 (Regulatory Update)

**Document version:** 1.0  
**Date:** 15 June 2026  
**Prerequisite:** Gate B approved (M02 + M07, 33/33 PASS)  
**Gate exit criteria:** All 32 tests below marked PASS  
**Environment:** Staging with real backend, file storage, notification services, knowledge base (M03 minimal seed), and integration connector stub for regulatory sync  

### Supervisor workflow covered (7 steps)

| Step | Module | UAT coverage |
|------|--------|--------------|
| 1. New regulation published | M05 | UAT-M05-001, M05-012 |
| 2. Compliance Officer reviews | M05 | UAT-M05-005, M05-006 |
| 3. Compliance obligation created | M04 | UAT-M04-002, M04-011, M05-018 |
| 4. Evidence uploaded | M04 | UAT-M04-005, M04-013 |
| 5. Status updated | M04 | UAT-M04-004, M04-008, M04-014 |
| 6. Report generated | M04 | UAT-M04-010, M04-017 |
| 7. Audit trail recorded | M04, M12 | UAT-M04-006, M04-015, M05-009 |

### How to use

Same format as `UAT_GATE_A_AUTH_SECURITY.md` and `UAT_GATE_B_DASHBOARD_NOTIFICATIONS.md`.

### Test accounts required

| Role | Email (example) | Purpose |
|------|-----------------|---------|
| Admin | admin@test.org | Manual regulatory entry, full access |
| Compliance Officer | co@test.org | Review, obligations, evidence |
| Legal Practitioner | lp@test.org | View-only / assigned evidence (RBAC) |
| Manager | mgr@test.org | View obligations, reports |

### Test data required

| Data | Purpose |
|------|---------|
| Legal document in knowledge base (Rwanda regulation) | M05 KB linking |
| Regulatory API connector configured (staging) | Auto-fetch test |
| Department labels: Legal, HR, Finance | Heat map |
| Sample PDF for evidence upload | Evidence tests |

---

## Section 1 — M04 Compliance Tracking (18 tests)

---

### UAT-M04-001 — Compliance dashboard metrics

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-001 |
| **Role** | Compliance Officer |
| **Preconditions** | ≥5 obligations with mixed statuses |

**Steps**

1. Navigate to `/compliance-tracking`.
2. Verify summary metrics at top: total obligations, compliant count, overdue/partial/non-compliant counts.
3. Cross-check totals with obligation list (filter all).
4. Change one obligation status → refresh or wait for update → metrics recalculate.

**Expected result**

- Dashboard metrics accurate and update after data changes.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-002 — Obligation library by regulation

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-002, M04-FEAT-001 |
| **Role** | Compliance Officer |
| **Preconditions** | Logged in as CO |

**Steps**

1. Open obligation library / list on Compliance Tracking.
2. Verify each obligation shows: title, regulation reference, jurisdiction, requirement level, deadline, status.
3. CO → Create new obligation linked to regulation "Law N° 058/2021" (or test regulation).
4. Save → obligation appears in library.
5. Log out/in → obligation still present.
6. Edit title → save → change persisted.

**Expected result**

- Structured obligation CRUD with regulation reference; data persists.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-003 — Assign obligation to person and team

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-003, M04-FEAT-002 |
| **Role** | Compliance Officer |
| **Preconditions** | Obligation exists; LP user available |

**Steps**

1. CO opens obligation → Assign → select **Legal Practitioner** user.
2. Optionally assign **team** (e.g. Finance Team).
3. Save assignment.
4. Log in as LP → Compliance Tracking → verify obligation visible in assignee view.
5. LP receives **assignment notification** (in-app per Gate B).

**Expected result**

- Assignment saved; assignee sees obligation; notification sent.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-004 — Compliance status values

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-004 |
| **Role** | Compliance Officer |
| **Preconditions** | Obligation in not_assessed or partially_compliant state |

**Steps**

1. Open obligation → change status to **partially_compliant** → save.
2. Verify badge/color displays correctly.
3. Change to **non_compliant** → save → verify display.
4. Change to **compliant** (may require evidence — see UAT-M04-013) → verify display.
5. Verify all four statuses exist in UI: compliant, partially_compliant, non_compliant, not_assessed.

**Expected result**

- All supervisor-specified statuses selectable and visually distinct.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-005 — Evidence upload

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-005 |
| **Role** | Compliance Officer (or assigned LP) |
| **Preconditions** | Obligation exists |

**Steps**

1. Open obligation → Evidence tab → Upload.
2. Upload PDF `audit-certificate.pdf` with description "Q2 audit certificate".
3. Verify file listed: name, uploader, date, description.
4. Download evidence file → opens valid PDF.
5. Log in as Manager → view obligation → can see evidence (per RBAC).

**Expected result**

- Evidence stored in object storage; metadata and download work.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-006 — Audit trail for compliance actions (UI)

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-006, M04-FEAT-005 |
| **Role** | Compliance Officer, Admin |
| **Preconditions** | Obligation with assignment, evidence, status changes from prior tests |

**Steps**

1. CO → obligation → Actions / Audit tab.
2. Verify chronological log: created, assigned, evidence uploaded, status changes.
3. Each entry: user name, timestamp, action, previous/new status where applicable.
4. Admin → Security → Compliance Action Audit → same events visible.
5. Attempt API delete of audit entry → **403/fail** (append-only).

**Expected result**

- Full compliance action history in module and Security audit; immutable.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-007 — Compliance calendar with deadlines

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-007, M04-FEAT-004 |
| **Role** | Compliance Officer |
| **Preconditions** | Obligations with deadlines on 5th, 12th, 20th of current month |

**Steps**

1. Navigate to Compliance Tracking → **Calendar** view (or calendar tab).
2. Verify obligations appear on correct due dates.
3. Click calendar entry → opens obligation detail.
4. Create new obligation due next month → appears on calendar without manual calendar entry.
5. Change deadline → calendar entry moves to new date.

**Expected result**

- Calendar auto-populated from obligation deadlines; interactive navigation.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-008 — Automated status calculation

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-008 |
| **Role** | System / Compliance Officer |
| **Preconditions** | Status rules: overdue + no evidence → non_compliant |

**Steps**

1. Create obligation: deadline = **yesterday**, status = not_assessed, no evidence.
2. Run status calculation job (or wait for nightly job in staging).
3. Verify status auto-updated to **non_compliant** (or overdue flag + non_compliant).
4. Upload evidence → run job again → status may move to partially_compliant per rules.
5. Mark compliant only when evidence + deadline met (see UAT-M04-013).

**Expected result**

- System calculates status from deadline and evidence rules without manual override bypass.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-009 — Compliance heat map

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-009, M04-FEAT-006 |
| **Role** | Compliance Officer, Manager |
| **Preconditions** | Obligations across departments Legal/HR/Finance with varied compliance rates |

**Steps**

1. CO → Compliance Tracking → Heat Map tab.
2. Verify grid/matrix: department × regulation (or similar axes per UI).
3. Verify risk colors: low/medium/high/critical match underlying obligation data.
4. Change obligation in Finance dept to non_compliant → heat map cell updates.
5. Manager can view heat map (read-only per supervisor RBAC).

**Expected result**

- Heat map reflects live aggregated risk; visually identifies problem areas.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-010 — Export compliance reports

| Field | Value |
|-------|-------|
| **RTM ID** | M04-UI-010, M04-FEAT-007 |
| **Role** | Compliance Officer, Manager |
| **Preconditions** | Obligations with evidence exist |

**Steps**

1. CO → Compliance Tracking → Export Report.
2. Select format **PDF** → export all obligations for current quarter.
3. Open PDF → contains obligation list, statuses, deadlines, assignees, evidence references.
4. Repeat export as **Excel/CSV**.
5. Manager exports same report (if permitted) → success.

**Expected result**

- Downloadable audit-ready compliance reports in PDF and Excel.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-011 — Create obligation from regulatory update

| Field | Value |
|-------|-------|
| **RTM ID** | M04-FEAT-001, M05 workflow step 3 |
| **Role** | Compliance Officer |
| **Preconditions** | Regulatory update reviewed with impact assessment (UAT-M05-006) |

**Steps**

1. Open reviewed regulatory update in M05.
2. Click **Create linked obligation** (or equivalent).
3. Verify obligation pre-filled: regulation reference, jurisdiction, suggested title from update.
4. Complete fields → save.
5. Obligation shows link back to regulatory update ID.

**Expected result**

- End-to-end link M05 → M04 obligation creation per supervisor workflow.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-012 — RBAC: CO vs LP vs Manager

| Field | Value |
|-------|-------|
| **RTM ID** | M04-FEAT-001 (RBAC) |
| **Role** | CO, LP, Manager |
| **Preconditions** | Gate A RBAC active |

**Steps**

1. **CO:** create, edit, assign, upload evidence, change status → all succeed.
2. **LP:** view assigned obligations; upload evidence if assigned; cannot delete obligation → 403.
3. **Manager:** view all obligations and heat map; cannot create obligation (unless spec allows) → verify against permission matrix.
4. **LP:** attempt `DELETE /api/v1/obligations/:id` → 403.

**Expected result**

- Role permissions match supervisor workflow documentation.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-013 — Evidence required for compliant status

| Field | Value |
|-------|-------|
| **RTM ID** | M04-FEAT-003 |
| **Role** | Compliance Officer |
| **Preconditions** | Obligation with no evidence |

**Steps**

1. Open obligation with no evidence attached.
2. Attempt set status to **compliant** → save.
3. Verify system **blocks** or warns: evidence required.
4. Upload evidence → set status to **compliant** → succeeds.
5. Remove all evidence (if delete allowed for CO) → status reverts or blocks compliant per rules.

**Expected result**

- Cannot mark compliant without supporting evidence.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-014 — Status update notifications

| Field | Value |
|-------|-------|
| **RTM ID** | M04-FEAT-002, M07 integration |
| **Role** | Compliance Officer, Manager |
| **Preconditions** | Obligation assigned; Manager oversight enabled |

**Steps**

1. CO changes obligation status from partially_compliant → compliant.
2. Manager receives in-app notification (status changed).
3. Assignee (LP) notified if configured.
4. Notification links to obligation in M04.

**Expected result**

- Status changes trigger notifications per supervisor workflow step 5.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-015 — Compliance workflow view (7-step UI)

| Field | Value |
|-------|-------|
| **RTM ID** | Workflow documentation |
| **Role** | Compliance Officer |
| **Preconditions** | RegulatoryComplianceFlow component wired to API |

**Steps**

1. CO → Compliance Tracking → **View Complete Workflow**.
2. Verify 7 steps displayed with current progress for a linked regulation→obligation chain.
3. Steps 2–5 show accessible actions for CO; steps 6–7 indicate report/audit.
4. Log in as LP → workflow shows restricted access on steps CO-only.

**Expected result**

- Workflow UI reflects real progress and role access from WORKFLOW_DOCUMENTATION.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-016 — Delete and archive obligations (Admin)

| Field | Value |
|-------|-------|
| **RTM ID** | M04-FEAT-001 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Test obligation marked for deletion |

**Steps**

1. CO attempts delete obligation → denied or soft-archive only per policy.
2. Admin deletes or archives test obligation.
3. Audit log records deletion with user and timestamp.
4. Obligation removed from active library; audit trail retained.

**Expected result**

- Controlled deletion with audit; CO cannot hard-delete without permission.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-017 — Audit report includes evidence manifest

| Field | Value |
|-------|-------|
| **RTM ID** | M04-FEAT-007 |
| **Role** | Manager |
| **Preconditions** | Obligations with multiple evidence files |

**Steps**

1. Export compliance audit report (PDF).
2. Verify section listing evidence files per obligation: filename, upload date, uploader.
3. Evidence IDs match M04 evidence tab.

**Expected result**

- Audit report suitable for external auditor review.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M04-018 — Gate C M04 regression smoke

| Field | Value |
|-------|-------|
| **RTM ID** | All M04 |
| **Role** | Compliance Officer |
| **Preconditions** | Prior M04 tests passed |

**Steps**

1. Re-run: UAT-M04-002, M04-005, M04-007, M04-008, M04-010, M04-013.
2. No regressions.

**Expected result**

- M04 module stable for sign-off.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Section 2 — M05 Regulatory Update (14 tests)

---

### UAT-M05-001 — Regulatory feed (manual entry)

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-001, M05-FEAT-001 |
| **Role** | Admin or Compliance Officer |
| **Preconditions** | Permission to create regulatory updates |

**Steps**

1. Navigate to `/regulatory-updates`.
2. Create manual update: title, category **new_law**, jurisdiction **Rwanda**, summary, source, full text.
3. Save → appears at top of feed with date published = today.
4. Log out/in → update persists.
5. All users in org can view update in feed (step 1 of workflow).

**Expected result**

- Manual regulatory entries appear in feed and persist.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-002 — Regulatory feed (auto-fetched via API)

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-001, M05-FEAT-001 |
| **Role** | Admin |
| **Preconditions** | Regulatory API connector configured (Rwanda Gazette or staging mock) |

**Steps**

1. Admin → Integrations → trigger **Sync** on regulatory API.
2. Wait for sync completion → check integration log (success).
3. Navigate to `/regulatory-updates` → new entry with source = API/gazette.
4. Entry marked as auto-imported (distinct from manual).
5. Duplicate sync does not create duplicate records (idempotent).

**Expected result**

- Auto-fetched regulations appear in feed alongside manual entries.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-003 — Alert category filters

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-002, M05-FEAT-002 |
| **Role** | Compliance Officer |
| **Preconditions** | One update per category: new_law, amendment, repeal, guidance |

**Steps**

1. Open regulatory feed → filter **new_law** → only new_law items shown.
2. Filter **amendment** → only amendments.
3. Filter **repeal** → only repeals.
4. Filter **guidance** → only guidance.
5. Clear filter → all categories visible.
6. High-impact updates visually flagged (badge/icon).

**Expected result**

- All four supervisor categories filter correctly; impact visible.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-004 — Jurisdiction and topic filters

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-003 |
| **Role** | Compliance Officer |
| **Preconditions** | Updates: Rwanda/Finance, EAC/General, Rwanda/Labor |

**Steps**

1. Filter jurisdiction **Rwanda** → 2 results (Finance + Labor).
2. Filter industry/topic **Finance** → Finance update only.
3. Combined Rwanda + Finance → single matching update.
4. Filter EAC → EAC update only.

**Expected result**

- Jurisdiction and topic filters return correct subsets.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-005 — Impact assessment form

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-004, M05-FEAT-002 |
| **Role** | Compliance Officer |
| **Preconditions** | Update in pending_review status |

**Steps**

1. CO opens update → **Review** / Impact Assessment.
2. Complete: impact level **high**, affected departments (Legal, HR), required actions, estimated effort, notes.
3. Submit assessment → saved.
4. Reopen update → assessment data displayed read-only or editable per policy.
5. Manager can view assessment (read-only).

**Expected result**

- Impact assessment captured and stored (workflow step 2).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-006 — Status tracking workflow

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-005, M05-FEAT-003 |
| **Role** | Compliance Officer, Admin |
| **Preconditions** | Update with completed impact assessment |

**Steps**

1. CO changes status: pending_review → **reviewed**.
2. CO changes to **action_required** after assessment.
3. After obligation created and work done → **implemented**.
4. Attempt invalid jump: pending_review → implemented without review → **rejected**.
5. Optional: mark **not_applicable** with reason.

**Expected result**

- Status state machine enforced; supervisor statuses supported.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-007 — User subscription by jurisdiction/topic

| Field | Value |
|-------|-------|
| **RTM ID** | M05-FEAT-004 |
| **Role** | Compliance Officer |
| **Preconditions** | Subscription UI available |

**Steps**

1. CO → Regulatory Updates → Subscriptions.
2. Enable: jurisdictions Rwanda + EAC; industries Finance + Labor; categories new_law + amendment.
3. Save subscriptions.
4. Publish update matching Rwanda/Finance/new_law → CO notified (Gate B).
5. Publish Kenya-only update → CO **not** notified.

**Expected result**

- Subscriptions control who receives regulatory alerts.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-008 — Email/SMS alerts for subscribed topics

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-006, M05-FEAT-005 |
| **Role** | Compliance Officer |
| **Preconditions** | CO subscribed; email + SMS enabled for regulatory updates |

**Steps**

1. Publish critical-impact update matching CO subscription.
2. Within 5 minutes: CO receives **email** with update title and link.
3. CO receives **SMS** for critical update.
4. Disable SMS in preferences → publish second critical update → email only.

**Expected result**

- Email/SMS regulatory alerts per subscription and criticality.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-009 — Update history log (immutable)

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-007 |
| **Role** | Compliance Officer, Admin |
| **Preconditions** | Update with multiple status changes |

**Steps**

1. Open regulatory update → **History** tab.
2. Verify log entries: created, reviewed, status changes, impact submitted, each with user + timestamp.
3. Admin → Security → Regulatory Review Logs → same events.
4. Attempt edit/delete history entry via API → fails.

**Expected result**

- Immutable history log for every change to regulatory update.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-010 — Link regulatory update to knowledge base

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-008, M05-FEAT-006 |
| **Role** | Compliance Officer, Admin |
| **Preconditions** | KB document exists for same regulation |

**Steps**

1. Open regulatory update → Link to Knowledge Base → select existing document.
2. Save link → KB document shows back-link to update (or visible related ID).
3. From update detail, click **View in Knowledge Base** → opens correct document.
4. On status **implemented**, option to **Create KB entry** from full text → new document created in M03.

**Expected result**

- Bidirectional integration between M05 and M03.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-011 — New regulation notifies Compliance Officers

| Field | Value |
|-------|-------|
| **RTM ID** | M05-FEAT-001, workflow step 1 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | CO subscribed to jurisdiction of new update |

**Steps**

1. Admin publishes new regulation (manual or API).
2. All subscribed COs receive in-app notification within 30 seconds.
3. Dashboard regulatory alert count increments (Gate B UAT-M02-016).
4. Non-subscribed users do not receive alert.

**Expected result**

- Step 1 workflow: new regulation triggers stakeholder notifications.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-012 — RBAC: CO review vs LP/Manager view

| Field | Value |
|-------|-------|
| **RTM ID** | M05-FEAT-003, workflow RBAC |
| **Role** | CO, LP, Manager, Admin |
| **Preconditions** | Update in pending_review |

**Steps**

1. **CO:** submit review and impact assessment → success.
2. **LP:** view update and assessment → cannot change status to reviewed → 403.
3. **Manager:** view all updates and assessments → read-only.
4. **Admin:** full access including override if policy allows.

**Expected result**

- Matches supervisor role access summary for regulatory workflow.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-013 — Effective date and action items

| Field | Value |
|-------|-------|
| **RTM ID** | M05-UI-004 (extended) |
| **Role** | Compliance Officer |
| **Preconditions** | Update with effective date in future |

**Steps**

1. Create/update regulatory entry with effective date and action items list.
2. Verify effective date displayed on feed and detail.
3. Action items copied to linked obligation when created (UAT-M04-011).
4. Calendar/deadline on obligation derived from effective date if configured.

**Expected result**

- Effective dates and action items drive compliance planning.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M05-014 — End-to-end 7-step supervisor workflow

| Field | Value |
|-------|-------|
| **RTM ID** | M04 + M05 full workflow |
| **Role** | Admin, CO, Manager |
| **Preconditions** | Clean test org; Gate A+B passed |

**Steps**

1. **Step 1:** Admin publishes new Rwanda regulation → CO notified.
2. **Step 2:** CO reviews → impact assessment → status reviewed.
3. **Step 3:** CO creates linked compliance obligation.
4. **Step 4:** CO (or assignee) uploads evidence.
5. **Step 5:** CO updates status to compliant.
6. **Step 6:** CO/Manager exports compliance report.
7. **Step 7:** Admin verifies audit logs in M12 for all steps.

**Expected result**

- Complete supervisor workflow executable in one session without mock data.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Gate C Sign-Off Sheet

| Module | Tests | Passed | Failed | Signed |
|--------|-------|--------|--------|--------|
| M04 Compliance Tracking | 18 | | | |
| M05 Regulatory Updates | 14 | | | |
| **Total** | **32** | | | |

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Developer | | | |
| Supervisor | | | |

**Prerequisites:** Gate A ☐ APPROVED · Gate B ☐ APPROVED  

**Gate C status:** ☐ APPROVED  ☐ REJECTED  

**Rejection notes:**

---

## Defect log template

| Defect ID | RTM ID | UAT ID | Severity | Description | Status |
|-----------|--------|--------|----------|-------------|--------|
| DEF-C001 | | | Critical/High/Medium/Low | | Open/Fixed/Verified |

---

## RTM coverage map (Gate C)

| UAT ID | RTM IDs covered |
|--------|-----------------|
| UAT-M04-001 | M04-UI-001 |
| UAT-M04-002 | M04-UI-002, M04-FEAT-001 |
| UAT-M04-003 | M04-UI-003, M04-FEAT-002 |
| UAT-M04-004 | M04-UI-004 |
| UAT-M04-005 | M04-UI-005 |
| UAT-M04-006 | M04-UI-006, M04-FEAT-005 |
| UAT-M04-007 | M04-UI-007, M04-FEAT-004 |
| UAT-M04-008 | M04-UI-008 |
| UAT-M04-009 | M04-UI-009, M04-FEAT-006 |
| UAT-M04-010 | M04-UI-010, M04-FEAT-007 |
| UAT-M04-011 | M04-FEAT-001, M05 step 3 |
| UAT-M04-012 | M04 RBAC |
| UAT-M04-013 | M04-FEAT-003 |
| UAT-M04-014 | M04-FEAT-002, M07 |
| UAT-M04-015 | Workflow UI |
| UAT-M04-016 | M04-FEAT-001 |
| UAT-M04-017 | M04-FEAT-007 |
| UAT-M04-018 | M04 regression |
| UAT-M05-001 | M05-UI-001, M05-FEAT-001 |
| UAT-M05-002 | M05-UI-001, M05-FEAT-001 |
| UAT-M05-003 | M05-UI-002, M05-FEAT-002 |
| UAT-M05-004 | M05-UI-003 |
| UAT-M05-005 | M05-UI-004, M05-FEAT-002 |
| UAT-M05-006 | M05-UI-005, M05-FEAT-003 |
| UAT-M05-007 | M05-FEAT-004 |
| UAT-M05-008 | M05-UI-006, M05-FEAT-005 |
| UAT-M05-009 | M05-UI-007 |
| UAT-M05-010 | M05-UI-008, M05-FEAT-006 |
| UAT-M05-011 | M05-FEAT-001, workflow step 1 |
| UAT-M05-012 | M05 RBAC |
| UAT-M05-013 | M05 extended fields |
| UAT-M05-014 | Full 7-step workflow |

**RTM rows covered:** M04 (17) + M05 (14) = **31 requirements** + workflow integration tests = **32 UAT cases**

---

*Previous: `UAT_GATE_B_DASHBOARD_NOTIFICATIONS.md` · Next: `UAT_GATE_D_KNOWLEDGE_CONTRACTS.md` (M03 + M06)*
