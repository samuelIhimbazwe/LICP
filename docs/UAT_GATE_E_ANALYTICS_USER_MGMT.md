# UAT Test Scripts — Gate E
## Modules M09 (Analytics & Reporting) + M10 (User & Access Management)

**Document version:** 1.0  
**Date:** 15 June 2026  
**Prerequisite:** Gate D approved (M03 + M06, 34/34 PASS)  
**Gate exit criteria:** All 34 tests below marked PASS  
**Environment:** Staging with live data from Gates C–D (obligations, regulations, contracts, KB), report job runner, email service  

### Test accounts required

| Role | Email | Purpose |
|------|-------|---------|
| Admin | admin@test.org | User mgmt, reports, permission matrix |
| Compliance Officer | co@test.org | Analytics view, access request |
| Legal Practitioner | lp@test.org | RBAC negative tests |
| Manager | mgr@test.org | Executive summary, team reports |

### Test data required

| Data | Purpose |
|------|---------|
| ≥20 obligations (mixed status, 3 months history) | Completion rates, trends |
| ≥10 regulatory updates with impact assessments | Impact trends |
| ≥15 contract documents processed | Document metrics |
| CSV file `bulk-users-import.csv` (10 valid + 2 invalid rows) | Bulk import |
| Report template seeded | Custom report builder |

---

## Section 1 — M09 Analytics & Reporting (18 tests)

---

### UAT-M09-001 — Compliance analytics dashboard

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-001, M09-FEAT-001 |
| **Role** | Compliance Officer, Manager |
| **Preconditions** | M04 data from Gate C |

**Steps**

1. Navigate to `/analytics` → Compliance tab.
2. Verify widgets: total obligations, completion rate, overdue count, compliance score.
3. Compare obligation total with M04 compliance dashboard → must match.
4. CO and Manager see role-appropriate scope (Manager may see org-wide).

**Expected result**

- Compliance analytics from live M04 data, not mock.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-002 — Obligation completion rates

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-002, M09-FEAT-002 |
| **Role** | Manager |
| **Preconditions** | Known: 20 total, 14 completed |

**Steps**

1. Analytics → obligation completion rate displays **70%** (14/20).
2. Mark one more obligation compliant in M04 → refresh analytics → **75%**.
3. Trend chart shows monthly completion rates for last 3 months.
4. Cross-check one month bucket with raw obligation data.

**Expected result**

- Completion rate and trends accurate and reactive to data changes.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-003 — Regulatory update impact trends

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-003, M09-FEAT-003 |
| **Role** | Compliance Officer |
| **Preconditions** | M05 updates with impact levels over 3 months |

**Steps**

1. Analytics → Regulatory Impact tab/chart.
2. Verify breakdown: high / medium / low impact counts by month.
3. Add new high-impact update in M05 → chart updates.
4. Totals match filtered count in Regulatory Updates module.

**Expected result**

- Impact trends reflect M05 impact assessments.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-004 — Document processing metrics

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-004, M09-FEAT-004 |
| **Role** | Manager |
| **Preconditions** | M06 documents with varied status |

**Steps**

1. Analytics → Document metrics: total, by type, by status, monthly volume.
2. Upload new contract in M06 → total increments.
3. Approve document → status chart updates.
4. Average processing time calculated from created → approved timestamps.

**Expected result**

- Document metrics sourced from M06 with accurate aggregates.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-005 — Team performance reports

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-005, M09-FEAT-004 |
| **Role** | Manager |
| **Preconditions** | Team members with assigned obligations/tasks |

**Steps**

1. Analytics → Team Performance table.
2. Each member shows: tasks completed, in progress, avg time, compliance score, docs reviewed.
2. Compare CO row with M04 assignments completed by that user.
3. Export team table to CSV → data matches UI.

**Expected result**

- Per-member metrics match assignment/completion records.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-006 — Custom report builder

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-006, M09-FEAT-005 |
| **Role** | Compliance Officer |
| **Preconditions** | Report templates available |

**Steps**

1. Analytics → Custom Report Builder → New Report.
2. Add sections: compliance metrics chart, obligation table, summary text.
3. Apply filters: date range Q2 2026, jurisdiction Rwanda.
4. Save report as "Q2 Rwanda Compliance".
5. Reopen saved report → sections and filters preserved.

**Expected result**

- Custom reports buildable from modular sections with filters.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-007 — Report preview and PDF export

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-007 |
| **Role** | Manager |
| **Preconditions** | Custom report from UAT-M09-006 |

**Steps**

1. Click **Preview** → rendered report matches selected sections.
2. Export **PDF** → download succeeds; open PDF → charts/tables readable.
3. Verify page headers, date generated, org name present.

**Expected result**

- PDF export is audit-quality and matches preview.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-008 — Report Excel export

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-007, M09-FEAT-005 |
| **Role** | Manager |
| **Preconditions** | Report with table section |

**Steps**

1. Export same report as **Excel/XLSX**.
2. Open file → obligation table sheet contains correct row count and columns.
3. Numeric fields (completion rate) formatted as numbers.

**Expected result**

- Excel export usable for further analysis.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-009 — Scheduled report configuration

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-008, M09-FEAT-006 |
| **Role** | Admin |
| **Preconditions** | Email service configured |

**Steps**

1. Analytics → Schedule Report → select "Q2 Rwanda Compliance".
2. Frequency: **weekly**, format PDF, recipients: mgr@test.org.
3. Save schedule → next run date displayed.
4. Trigger manual run or wait for job → Manager receives email with PDF attachment.
5. Generated Reports history shows run timestamp and file download link.

**Expected result**

- Scheduled reports run automatically and email recipients.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-010 — Executive summary generator

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-009, M09-FEAT-007 |
| **Role** | Manager |
| **Preconditions** | Sufficient data across modules |

**Steps**

1. Analytics → Executive Summary → Generate for "Last 30 days".
2. Verify sections: key metrics, highlights, concerns, recommendations, trends.
3. Key metrics match M09 compliance dashboard totals.
4. Export executive summary PDF → one-page readable for management.

**Expected result**

- Auto-generated executive summary accurate and exportable.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-011 — Audit readiness report

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-010 |
| **Role** | Manager, Compliance Officer |
| **Preconditions** | Open audit gaps in M04 (missing evidence) |

**Steps**

1. Analytics → Audit Readiness tab.
2. Overall readiness score displayed; critical issues count > 0 if gaps exist.
3. Gap list: category, severity, status, assignee, due date.
4. Resolve gap in M04 (upload evidence) → readiness score improves on refresh.

**Expected result**

- Audit readiness reflects real compliance gaps from M04.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-012 — Compliance report from M04 export alignment

| Field | Value |
|-------|-------|
| **RTM ID** | M09 + M04 cross-ref |
| **Role** | Compliance Officer |
| **Preconditions** | Gate C M04 export tested |

**Steps**

1. Export compliance report from M04 (Gate C).
2. Export equivalent from M09 analytics with same filters.
3. Obligation counts and statuses match between exports.

**Expected result**

- M04 and M09 reporting consistent (supervisor workflow step 6).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-013 — RBAC on analytics

| Field | Value |
|-------|-------|
| **RTM ID** | M09-FEAT-001 |
| **Role** | LP, CO, Manager, Admin |
| **Preconditions** | Permission matrix configured |

**Steps**

1. LP → analytics → limited view per matrix (no team admin metrics).
2. CO → full compliance analytics.
3. Manager → executive + team reports.
4. LP API `GET /analytics/executive-summary` → 403 if denied.

**Expected result**

- Analytics access enforced by role.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-014 — Generated report history

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-007, M09-FEAT-006 |
| **Role** | Admin |
| **Preconditions** | Multiple reports generated |

**Steps**

1. Analytics → Generated Reports history list.
2. Each entry: name, format, generated by, date, file size, download link.
3. Download older report → file intact.
4. Reports scoped to organization (no cross-org leakage).

**Expected result**

- Report history complete and downloadable.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-015 — Report template library

| Field | Value |
|-------|-------|
| **RTM ID** | M09-UI-006 |
| **Role** | Compliance Officer |
| **Preconditions** | System report templates seeded |

**Steps**

1. New report → choose template "Compliance Overview" or "Executive Dashboard".
2. Template pre-populates sections.
3. Customize and save as new custom report without altering template original.

**Expected result**

- Templates accelerate report creation per supervisor spec.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-016 — Analytics performance

| Field | Value |
|-------|-------|
| **RTM ID** | M09-FEAT-001 |
| **Role** | Manager |
| **Preconditions** | Large dataset staging |

**Steps**

1. Load main analytics dashboard → renders in **&lt;5 seconds**.
2. Generate PDF report (50+ page obligations) → completes in **&lt;60 seconds**.

**Expected result**

- Analytics usable under realistic load.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M09-017 — M09 regression smoke

| Field | Value |
|-------|-------|
| **RTM ID** | All M09 |
| **Role** | Manager |
| **Preconditions** | Prior M09 tests passed |

**Steps**

1. Re-run: UAT-M09-002, M09-007, M09-009, M09-010, M09-011.
2. No regressions.

**Expected result**

- M09 stable for sign-off.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Section 2 — M10 User & Access Management (16 tests)

---

### UAT-M10-001 — Admin-only user management console

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-001, M10-FEAT-001 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Gate A RBAC active |

**Steps**

1. Admin navigates to `/user-management` → full console loads.
2. CO navigates to `/user-management` → access denied or redirect.
3. CO API `GET /api/v1/users` → 403.
4. Sidebar hides User Management for non-admin roles.

**Expected result**

- User management admin-only in UI and API.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-002 — Create and edit users

| Field | Value |
|-------|-------|
| **RTM ID** | M10-FEAT-001 |
| **Role** | Admin |
| **Preconditions** | Admin logged in |

**Steps**

1. Create user manually: name, email, phone, org, role LP → invite sent.
2. Edit user phone and department → save → persists.
3. User list search by email finds user.
4. Audit log records create and update.

**Expected result**

- Full user CRUD by admin with audit trail.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-003 — Role and permission assignment

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-002, M10-FEAT-002 |
| **Role** | Admin |
| **Preconditions** | LP user exists |

**Steps**

1. Admin → user → Permissions → set module analytics to **none** → save.
2. LP logs in → `/analytics` blocked or empty per policy.
3. Admin restores analytics **view** → LP can access.
4. Change enforced on API within 1 minute.

**Expected result**

- Granular permissions saved and enforced immediately.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-004 — Organization / business unit structure

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-003, M10-FEAT-003 |
| **Role** | Admin |
| **Preconditions** | Org tree empty or seeded |

**Steps**

1. Create org unit: Organization → Business Unit "Legal" → Department "Corporate Law".
2. Assign manager to department.
3. Assign user to Corporate Law dept.
4. User profile shows department; analytics can filter by dept (if supported).

**Expected result**

- Organizational hierarchy CRUD works; users assigned to units.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-005 — User activity monitoring

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-004, M10-FEAT-004 |
| **Role** | Admin |
| **Preconditions** | LP performed actions in last hour |

**Steps**

1. Admin → User Management → Activity tab.
2. Filter user LP → see login, document view, obligation view events.
3. Each entry: action, module, timestamp, IP.
4. Activity matches Security audit log for same user.

**Expected result**

- Real-time user activity monitoring for security oversight.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-006 — Account suspend and activate

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-005, M10-FEAT-005 |
| **Role** | Admin |
| **Preconditions** | Active LP account (Gate A UAT-M01-017) |

**Steps**

1. Admin suspends LP → status badge **suspended**.
2. LP login attempt → rejected.
3. Admin activates LP → status **active**.
4. LP login succeeds.

**Expected result**

- Suspension workflow blocks authentication.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-007 — Bulk user import

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-006, M10-FEAT-006 |
| **Role** | Admin |
| **Preconditions** | CSV with 10 valid + 2 invalid rows |

**Steps**

1. Admin → Bulk Import → upload CSV.
2. Preview shows validation results.
3. Import → success count 10, failure count 2 with row-level errors.
4. 10 users appear in user list with invite pending/active.
5. Invalid rows do not create partial users (transaction rollback per row).

**Expected result**

- Bulk import with error report per supervisor spec.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-008 — Bulk user export

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-006 |
| **Role** | Admin |
| **Preconditions** | ≥5 users in org |

**Steps**

1. Admin → Export Users → CSV.
2. File contains: name, email, role, status, department, last login.
3. Row count matches user list (excluding service accounts if any).

**Expected result**

- User export for business admin operations.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-009 — Access request workflow

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-007 |
| **Role** | Compliance Officer, Admin |
| **Preconditions** | CO lacks analytics full access |

**Steps**

1. CO submits access request: module analytics, permission full, justification text.
2. Admin → Access Requests → pending request visible.
3. Admin **approves** with comment.
4. CO permissions updated → analytics full access works.
5. Reject flow: second request rejected → permissions unchanged.

**Expected result**

- Access request approve/reject workflow complete.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-010 — Permission matrix editor

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-008, M10-FEAT-002 |
| **Role** | Admin |
| **Preconditions** | Default role templates exist |

**Steps**

1. User Management → Permission Matrix → select **Manager** role.
2. Change contractManagement from full to view → save.
3. Manager user attempts contract upload → denied.
4. Revert matrix change → upload allowed again.
5. Matrix shows user count per role.

**Expected result**

- Role-level permission matrix edits affect all users of that role.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-011 — Session management overview

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-009 |
| **Role** | Admin |
| **Preconditions** | CO logged in on 2 devices/browsers |

**Steps**

1. Admin → Sessions tab → see CO sessions with IP, device, last activity.
2. Revoke one session → that browser logged out.
3. Other session remains active until revoked or timeout.

**Expected result**

- Admin session overview and revoke (extends Gate A).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-012 — User audit trail viewer

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-010 |
| **Role** | Admin |
| **Preconditions** | Admin changed LP permissions in UAT-M10-003 |

**Steps**

1. User Management → Audit tab → filter target user LP.
2. See permission_change events with old/new values.
3. Filter by action login → login events listed.
4. Export or link to M12 full audit log for same events.

**Expected result**

- Per-user audit trail filterable in user management module.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-013 — Role templates (four supervisor roles)

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-002 |
| **Role** | Admin |
| **Preconditions** | Default templates |

**Steps**

1. View role templates for: Legal Practitioner, Compliance Officer, Manager, Admin.
2. Each template matches supervisor permission intent (CO: compliance full, user mgmt none).
3. New user assigned role inherits template unless custom override.

**Expected result**

- Four supervisor roles have correct default permission templates.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-014 — Invite user from admin console

| Field | Value |
|-------|-------|
| **RTM ID** | M10 + M01 cross-ref |
| **Role** | Admin |
| **Preconditions** | Email service active |

**Steps**

1. Admin → Invite User from user management (not only separate dialog).
2. Invite CO with require MFA → email sent.
3. Invitee completes Gate A onboarding flow.
4. User appears in management console as active.

**Expected result**

- Admin provisioning integrated with auth module.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-015 — Deactivate vs delete user

| Field | Value |
|-------|-------|
| **RTM ID** | M10-FEAT-001 |
| **Role** | Admin |
| **Preconditions** | Test user account |

**Steps**

1. Admin deactivates test user → cannot login; still in audit logs.
2. Admin hard-delete (if allowed) or soft-delete → user hidden from active list.
3. Audit records retained for deactivated/deleted user actions.

**Expected result**

- Controlled account lifecycle; audit history preserved.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M10-016 — Gate E regression smoke

| Field | Value |
|-------|-------|
| **RTM ID** | All M09 + M10 |
| **Role** | Admin, Manager |
| **Preconditions** | Gate E tests passed |

**Steps**

1. Re-run: UAT-M10-001, M10-003, M10-006, M10-007, M09-009, M09-010.
2. Sign-off **34/34 PASS**.

**Expected result**

- Gate E approved → proceed to Gate F (M08 + M11).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Gate E Sign-Off Sheet

| Module | Tests | Passed | Failed | Signed |
|--------|-------|--------|--------|--------|
| M09 Analytics & Reporting | 17 | | | |
| M10 User & Access Management | 16 | | | |
| Regression | 1 | | | |
| **Total** | **34** | | | |

**Prerequisites:** Gates A–D ☐ approved  

**Gate E status:** ☐ APPROVED  ☐ REJECTED  

---

*Next: `UAT_GATE_F_AI_INTEGRATIONS.md` (M08 + M11)*
