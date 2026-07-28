# UAT Test Scripts — Gate B
## Modules M02 (Dashboard) + M07 (Notification & Alert)

**Document version:** 1.0  
**Date:** 15 June 2026  
**Prerequisite:** Gate A approved (M01 + M12, 38/38 PASS)  
**Gate exit criteria:** All 33 tests below marked PASS  
**Environment:** Staging with real backend, database, notification services (email + SMS), and Gate C seed data optional for cross-module triggers  

### How to use

| Column | Purpose |
|--------|---------|
| **RTM ID** | Links to `REQUIREMENTS_TRACEABILITY_MATRIX.csv` |
| **Role** | User role required for test |
| **Preconditions** | Setup before executing steps |
| **Steps** | Numbered actions |
| **Expected result** | Pass criteria |
| **Result** | Tester marks PASS / FAIL |
| **Notes** | Defect ID, screenshots, comments |

### Test accounts required

| Role | Email (example) | Purpose |
|------|-----------------|---------|
| Admin | admin@test.org | Broadcasts, system announcements |
| Compliance Officer | co@test.org | CO dashboard, compliance alerts |
| Legal Practitioner | lp@test.org | LP dashboard, approval notifications |
| Manager | mgr@test.org | Manager dashboard, escalations |
| Approver (LP or CO) | approver@test.org | Document approval flow |

### Test data required

| Data | Purpose |
|------|---------|
| ≥3 compliance obligations (mixed status, with deadlines) | Dashboard cards, deadline reminders |
| ≥2 regulatory updates (1 unread, 1 reviewed) | Regulatory alerts, subscriptions |
| ≥1 contract expiring within 30 days | Expiry alerts |
| ≥1 document pending approval | Approval notifications |
| CO subscribed to Rwanda / Finance jurisdiction | Regulatory alert filtering |

---

## Section 1 — M02 Dashboard Module (17 tests)

---

### UAT-M02-001 — Role-based dashboard views

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-001, M02-FEAT-001 |
| **Role** | All four roles |
| **Preconditions** | Gate A passed; one account per role |

**Steps**

1. Log in as **Compliance Officer** → navigate to `/dashboard`.
2. Verify dashboard title and layout are CO-specific (not generic).
3. Log out → log in as **Legal Practitioner** → verify LP-specific dashboard.
4. Repeat for **Manager** and **Admin**.
5. As CO, attempt to view admin-only widgets/metrics via API `GET /api/v1/dashboard/admin` → expect `403`.

**Expected result**

- Four visually distinct role dashboards.
- CO cannot access admin dashboard data via UI or API.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-002 — Compliance Officer dashboard content

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-002 |
| **Role** | Compliance Officer |
| **Preconditions** | Obligations exist: 2 pending, 3 with upcoming deadlines; 1 unread regulatory alert |

**Steps**

1. Log in as CO → `/dashboard`.
2. Locate **pending obligations** section/card → note count.
3. Open Compliance Tracking → count pending obligations → compare to dashboard.
4. Locate **upcoming deadlines** → verify next 5 deadlines match Compliance module sorted by date.
5. Locate **regulatory alerts** → verify unread count matches Regulatory Updates module.

**Expected result**

- Dashboard counts match live data in M04 and M05 (not static mock).
- Pending, deadlines, and alerts sections all visible on CO dashboard.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-003 — Legal Practitioner dashboard content

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-003, M02-FEAT-003 |
| **Role** | Legal Practitioner |
| **Preconditions** | Document requests, case updates, and research entries exist in backend |

**Steps**

1. Log in as LP → `/dashboard`.
2. Verify **document requests** section lists pending requests assigned to LP.
3. Verify **case updates** section shows recent case activity (or supervisor-specified LP workflow items).
4. Verify **research tools** quick access (link or panel to legal research / knowledge base).
5. Click research tool → lands on knowledge base or AI research with LP permissions.

**Expected result**

- All three LP dashboard areas populated from live data.
- Research tool navigates to authorized module.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-004 — Manager dashboard content

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-004 |
| **Role** | Manager |
| **Preconditions** | Team members with recent activity; compliance summary data exists |

**Steps**

1. Log in as Manager → `/dashboard`.
2. Verify **team activity** feed shows recent actions by team members.
3. Verify **compliance status** summary (org/team compliance rate or status breakdown).
4. Verify **audit readiness** score/section with gaps or readiness percentage.
5. Cross-check compliance status with Compliance Tracking module totals.

**Expected result**

- Team activity, compliance status, and audit readiness visible and accurate.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-005 — Admin dashboard content

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-005 |
| **Role** | Admin |
| **Preconditions** | Multiple active users; recent content updates in knowledge base |

**Steps**

1. Log in as Admin → `/dashboard`.
2. Verify **system usage** metrics (logins, active users, module usage).
3. Verify **user statistics** (total users, by role, active/suspended).
4. Verify **content updates** (recent knowledge base or regulatory content changes).
5. Cross-check user count with User Management module.

**Expected result**

- Admin dashboard shows live system usage, user stats, and content update feed.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-006 — Summary cards accuracy

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-006 |
| **Role** | Compliance Officer |
| **Preconditions** | Known counts: active compliance items, new regulations, pending reviews |

**Steps**

1. Record counts from source modules: M04 obligations, M05 pending_review updates.
2. Open CO dashboard → read summary cards: active compliance items, new regulations, pending reviews.
3. Create new obligation in M04 → return to dashboard (refresh or wait for real-time update).
4. Verify active compliance items count increased by 1.
5. Mark one regulatory update as reviewed in M05 → verify pending reviews count decreased by 1.

**Expected result**

- Summary cards reflect current module data.
- Cards update after data changes (within 30s if real-time, or on refresh).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-007 — Recent activity feed

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-007 |
| **Role** | Compliance Officer |
| **Preconditions** | Logged in |

**Steps**

1. Note current activity feed on dashboard.
2. Upload compliance evidence on an obligation (M04).
3. Return to dashboard within 30 seconds.
4. Verify new activity entry: evidence uploaded, obligation title, timestamp, your name.
5. Filter or scope: CO feed shows activities relevant to CO role/org.

**Expected result**

- Activity feed updates after user actions.
- Entries include user, action, module, timestamp.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-008 — Quick action: search regulations

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-008, M02-FEAT-003 |
| **Role** | Compliance Officer |
| **Preconditions** | On dashboard |

**Steps**

1. Click quick action **Search regulations** (or equivalent label).
2. Verify navigation to knowledge base or regulatory search.
3. Verify search/filter UI is ready for input (focus or empty state).
4. Run search for known regulation title → results appear.

**Expected result**

- Quick action opens correct module and search is functional.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-009 — Quick action: upload document

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-008, M02-FEAT-003 |
| **Role** | Legal Practitioner |
| **Preconditions** | On dashboard |

**Steps**

1. Click quick action **Upload document**.
2. Verify navigation to Contract Management upload flow (or document upload dialog).
3. Upload a test PDF with title and metadata.
4. Confirm document appears in library.

**Expected result**

- Quick action opens upload workflow; upload succeeds.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-010 — Quick action: run compliance check

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-008, M02-FEAT-003 |
| **Role** | Compliance Officer |
| **Preconditions** | On dashboard |

**Steps**

1. Click quick action **Run compliance check** (or compliance check / AI check).
2. Verify navigation to Compliance Tracking or AI Legal Intelligence compliance check.
3. Initiate a check against a known obligation or query.
4. Verify check returns a result (not empty mock).

**Expected result**

- Quick action opens compliance check workflow end-to-end.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-011 — Header notification unread count

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-009, M07-UI-001 |
| **Role** | Compliance Officer |
| **Preconditions** | User has 3 unread notifications |

**Steps**

1. Log in → note unread badge count in header (e.g. "3").
2. Navigate to `/notifications` → mark 1 notification as read.
3. Return to dashboard → badge shows "2".
4. Mark all as read → badge hidden or shows "0".
5. Trigger new notification (see UAT-M07-003) → badge increments without full page reload (real-time) or within 30s.

**Expected result**

- Header badge matches unread count from notification service.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-012 — System announcements on dashboard

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-010, M07-FEAT-004 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Admin logged in |

**Steps**

1. Admin → Notification Center → Broadcast → compose announcement "System maintenance Sunday 2am" → target **All users** → Send.
2. Log in as CO (or refresh if already logged in).
3. Verify announcement appears on dashboard announcements area and/or notification center.
4. Verify announcement type = system_announcement.

**Expected result**

- Admin broadcast visible on CO dashboard without manual data entry by CO.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-013 — Compliance trend charts

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-011, M02-FEAT-005 |
| **Role** | Compliance Officer, Manager |
| **Preconditions** | Historical compliance data across ≥3 months |

**Steps**

1. CO dashboard → locate compliance trend chart.
2. Verify chart shows time series (e.g. completion rate or compliant vs overdue by month).
3. Cross-check one data point with Analytics or Compliance module export.
4. Manager dashboard → verify similar or manager-scoped trend chart renders.

**Expected result**

- Charts render with accurate data; CO and Manager see role-appropriate trends.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-014 — Mobile-responsive dashboard

| Field | Value |
|-------|-------|
| **RTM ID** | M02-UI-012 |
| **Role** | Any |
| **Preconditions** | Browser dev tools or mobile device |

**Steps**

1. Open `/dashboard` at viewport **375px** width (iPhone SE).
2. Verify: no horizontal scroll; summary cards stack; sidebar collapses or becomes menu.
3. Verify quick actions reachable; notification badge visible.
4. Repeat at **768px** (tablet) → layout usable.
5. Repeat at **1280px** (desktop) → full layout.

**Expected result**

- Dashboard usable at mobile, tablet, and desktop breakpoints per supervisor spec.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-015 — Real-time dashboard updates

| Field | Value |
|-------|-------|
| **RTM ID** | M02-FEAT-002 |
| **Role** | Compliance Officer, Admin (second browser) |
| **Preconditions** | CO dashboard open on Browser A |

**Steps**

1. CO on dashboard → note pending obligations count.
2. Admin or second CO session on Browser B → create new obligation assigned to CO org.
3. On Browser A, **without manual refresh**, wait up to 30 seconds.
4. Verify pending obligations count increments OR activity feed shows new entry OR toast/poll update.
5. If WebSocket: verify connection active in network tab.

**Expected result**

- Dashboard reflects source change within **30 seconds** without user refresh (real-time or polling).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-016 — Regulatory update triggers dashboard alert

| Field | Value |
|-------|-------|
| **RTM ID** | M02-FEAT-004 |
| **Role** | Compliance Officer |
| **Preconditions** | CO subscribed to Rwanda jurisdiction; dashboard open |

**Steps**

1. Admin or system publishes new regulatory update: jurisdiction **Rwanda**, category **new_law**.
2. Within 30 seconds, CO dashboard regulatory alerts count increases OR new alert appears in feed.
3. CO header notification badge increments.
4. CO opens notification → links to regulatory update detail.

**Expected result**

- New regulation triggers dashboard alert and notification integration per supervisor spec.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M02-017 — Visual metrics match source modules

| Field | Value |
|-------|-------|
| **RTM ID** | M02-FEAT-005 |
| **Role** | Manager |
| **Preconditions** | Data in M04, M05, M09 |

**Steps**

1. Manager → Analytics module → record compliance score and active obligations count.
2. Manager → Dashboard → compare same metrics on cards/charts.
3. Discrepancy tolerance: **zero** for integer counts; charts may aggregate by period but must be consistent with analytics API.

**Expected result**

- Dashboard metrics match Analytics and Compliance module source of truth.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Section 2 — M07 Notification & Alert Module (16 tests)

---

### UAT-M07-001 — Notification center list and unread counts

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-001 |
| **Role** | Compliance Officer |
| **Preconditions** | ≥5 notifications mixed read/unread |

**Steps**

1. Navigate to `/notifications`.
2. Verify list shows: title, message, timestamp, type, priority, read/unread state.
3. Verify unread filter or visual distinction for unread items.
4. Count unread in list → must match header badge.
5. Mark one read → both list and header update.

**Expected result**

- Notification center complete; unread counts consistent across UI.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-002 — Real-time alert pop-ups

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-002 |
| **Role** | Compliance Officer |
| **Preconditions** | CO logged in on `/dashboard`; WebSocket/SSE connected |

**Steps**

1. From Admin session, send targeted notification to CO (or trigger regulatory alert).
2. On CO browser, **do not refresh**.
3. Verify in-app pop-up/toast appears within **10 seconds** with title and message.
4. Click pop-up → navigates to related resource (action URL).
5. Pop-up also listed in notification center.

**Expected result**

- Real-time pop-up without page refresh per supervisor spec.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-003 — Regulatory update alerts by subscription

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-003, M07-FEAT-002 |
| **Role** | Compliance Officer |
| **Preconditions** | CO subscribed: Rwanda + Finance; not subscribed: Kenya only |

**Steps**

1. CO → Regulatory Updates → Subscriptions → confirm Rwanda/Finance enabled.
2. Publish update A: Rwanda, Finance → CO receives notification.
3. Publish update B: Kenya only → CO does **not** receive notification.
4. Publish update C: Rwanda, Labor → CO receives notification (jurisdiction match).

**Expected result**

- Alerts respect jurisdiction/topic subscription rules.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-004 — Compliance deadline reminders

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-004, M07-FEAT-002 |
| **Role** | Compliance Officer |
| **Preconditions** | Obligation due in 7 days assigned to CO; reminder job configured |

**Steps**

1. Create obligation with deadline = today + 7 days; assign to CO.
2. Run reminder job (or wait for scheduled run in staging).
3. CO receives notification: type `compliance_deadline`, priority medium/high.
4. Notification includes obligation title and link to M04.
5. Verify email sent if CO has email channel enabled.

**Expected result**

- Deadline reminder fires at configured interval (e.g. 7 days before due).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-005 — Document approval request notification

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-005, M07-FEAT-003 |
| **Role** | Legal Practitioner (submitter), Compliance Officer (approver) |
| **Preconditions** | Document in pending approval assigned to CO |

**Steps**

1. LP submits document for approval with CO as approver (M06 workflow).
2. CO receives in-app notification: type `document_approval`.
3. CO clicks notification → opens document approval screen.
4. CO approves document → LP receives notification of approval outcome.

**Expected result**

- Approval request and outcome both notify correct users.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-006 — Contract expiry alerts

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-006, M07-FEAT-003 |
| **Role** | Legal Practitioner, Manager |
| **Preconditions** | Contract expiring in 30 days; LP is document owner |

**Steps**

1. Create contract with expiry date = today + 30 days.
2. Run expiry alert job (or wait for scheduled job).
3. LP receives notification: type `contract_expiry`.
4. Manager receives notification if configured as oversight recipient.
5. Notification links to contract in M06.

**Expected result**

- Expiry alert generated with correct lead time and deep link.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-007 — Admin broadcast composer

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-007, M07-FEAT-004 |
| **Role** | Admin, all roles (recipients) |
| **Preconditions** | ≥4 users one per role |

**Steps**

1. Admin → `/notifications` → Broadcast tab.
2. Compose: title, message, priority **high**, audience **all**, channels in-app + email.
3. Send broadcast.
4. Within **1 minute**, each role user sees in-app notification.
5. Verify email received for users with email enabled.
6. Non-admin user → Broadcast composer **not visible** or returns 403.

**Expected result**

- Admin-only broadcast reaches all targeted users within 1 minute.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-008 — Notification preferences (in-app, email, SMS)

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-008, M07-FEAT-005 |
| **Role** | Compliance Officer |
| **Preconditions** | CO has valid email and phone on file |

**Steps**

1. CO → `/preferences` → disable **email** for regulatory updates; keep **in-app** enabled.
2. Trigger Rwanda regulatory update subscribed by CO.
3. Verify in-app notification received; **no email** received.
4. Enable email, disable SMS → trigger critical compliance deadline.
5. Verify email received; **no SMS** received.
6. Enable SMS → trigger critical alert → SMS received (test phone or SMS sandbox).

**Expected result**

- Each channel respects user preferences per notification type.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-009 — Alert history log

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-009 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Several notifications sent to CO |

**Steps**

1. CO → `/notifications` → History or Logs tab (or Admin notification logs).
2. Select a notification sent in UAT-M07-003.
3. Verify log shows: sent time, channel(s), delivered time, read time (after CO opens).
4. If email failed (simulate), log shows failure reason.
5. CO sees only own history; Admin sees org-wide logs.

**Expected result**

- Full delivery history per notification with channel status.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-010 — Escalation for critical compliance items

| Field | Value |
|-------|-------|
| **RTM ID** | M07-UI-010, M07-FEAT-006 |
| **Role** | Compliance Officer, Manager |
| **Preconditions** | Escalation rule: critical obligation overdue 3 days → notify Manager |

**Steps**

1. Admin configures escalation rule for overdue critical obligations (3-day delay).
2. Create critical obligation assigned to CO with deadline **4 days ago** (or backdate in staging).
3. Run escalation job.
4. Manager receives notification: escalation type, obligation reference.
5. CO receives original overdue reminders; Manager receives escalation (not duplicate of same level).

**Expected result**

- Critical overdue items escalate to Manager per configured rule.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-011 — Multi-channel delivery (same event)

| Field | Value |
|-------|-------|
| **RTM ID** | M07-FEAT-001 |
| **Role** | Compliance Officer |
| **Preconditions** | All channels enabled for compliance deadlines |

**Steps**

1. CO preferences: in-app + email + SMS enabled for compliance deadlines.
2. Trigger compliance deadline reminder for CO.
3. Verify all three channels deliver within 5 minutes.
4. Notification log shows three delivery records for same notification ID.

**Expected result**

- Single event delivers on all enabled channels.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-012 — Regulatory critical change SMS

| Field | Value |
|-------|-------|
| **RTM ID** | M07-FEAT-002 (extends M05 SMS requirement) |
| **Role** | Compliance Officer |
| **Preconditions** | CO subscribed; SMS enabled for regulatory updates; critical impact |

**Steps**

1. Publish regulatory update: impact **critical**, jurisdiction subscribed by CO.
2. CO receives in-app + SMS within **5 minutes**.
3. SMS contains update title and link or short reference code.

**Expected result**

- Critical regulatory changes trigger SMS when channel enabled.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-013 — Workflow notifications end-to-end

| Field | Value |
|-------|-------|
| **RTM ID** | M07-FEAT-003 |
| **Role** | LP, CO, Manager |
| **Preconditions** | Full workflow test data |

**Steps**

1. **Document approval:** LP submit → CO notify → CO approve → LP notify (UAT-M07-005 recap).
2. **Contract expiry:** create expiring contract → LP/Manager notify (UAT-M07-006 recap).
3. **Compliance deadline:** obligation reminder → CO notify (UAT-M07-004 recap).
4. Verify each event type in notification log with correct `type` enum.

**Expected result**

- All three workflow notification types fire correctly in one regression pass.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-014 — Broadcast role-targeted audience

| Field | Value |
|-------|-------|
| **RTM ID** | M07-FEAT-004 |
| **Role** | Admin, Manager, Compliance Officer |
| **Preconditions** | Users in each role exist |

**Steps**

1. Admin broadcast → audience **role: Manager only** → Send.
2. Manager receives notification; CO and LP do **not**.
3. Admin broadcast → audience **role: Compliance Officer** → Send.
4. Only CO receives second broadcast.

**Expected result**

- Role-targeted broadcasts do not leak to other roles.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-015 — Quiet hours / preference suppression (if configured)

| Field | Value |
|-------|-------|
| **RTM ID** | M07-FEAT-005 |
| **Role** | Compliance Officer |
| **Preconditions** | Quiet hours 22:00–07:00 enabled for email |

**Steps**

1. CO → preferences → enable quiet hours for email.
2. Trigger non-critical notification during quiet hours (staging clock override or wait).
3. Email deferred or suppressed; in-app still delivered immediately.
4. After quiet hours, deferred email sent (if policy = digest/defer).

**Expected result**

- Preferences including quiet hours respected (if supervisor quiet hours in preferences UI).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M07-016 — Gate B regression smoke test

| Field | Value |
|-------|-------|
| **RTM ID** | All M02 + M07 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Gate B tests passed once individually |

**Steps**

1. Re-run: UAT-M02-002, M02-011, M02-015, M02-016, M07-002, M07-007, M07-008, M07-010.
2. Confirm no regressions after full Gate B test cycle.
3. Complete sign-off sheet: **33/33 PASS**.

**Expected result**

- Gate B approved → proceed to Gate C (M04 Compliance + M05 Regulatory).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Gate B Sign-Off Sheet

| Module | Tests | Passed | Failed | Signed |
|--------|-------|--------|--------|--------|
| M02 Dashboard | 17 | | | |
| M07 Notifications | 16 | | | |
| **Total** | **33** | | | |

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Developer | | | |
| Supervisor | | | |

**Prerequisite:** Gate A ☐ APPROVED  

**Gate B status:** ☐ APPROVED  ☐ REJECTED  

**Rejection notes:**

---

## Defect log template

| Defect ID | RTM ID | UAT ID | Severity | Description | Status |
|-----------|--------|--------|----------|-------------|--------|
| DEF-B001 | | | Critical/High/Medium/Low | | Open/Fixed/Verified |

---

## RTM coverage map (Gate B)

| UAT ID | RTM IDs covered |
|--------|-----------------|
| UAT-M02-001 | M02-UI-001, M02-FEAT-001 |
| UAT-M02-002 | M02-UI-002 |
| UAT-M02-003 | M02-UI-003, M02-FEAT-003 |
| UAT-M02-004 | M02-UI-004 |
| UAT-M02-005 | M02-UI-005 |
| UAT-M02-006 | M02-UI-006 |
| UAT-M02-007 | M02-UI-007 |
| UAT-M02-008–010 | M02-UI-008, M02-FEAT-003 |
| UAT-M02-011 | M02-UI-009, M07-UI-001 |
| UAT-M02-012 | M02-UI-010, M07-FEAT-004 |
| UAT-M02-013 | M02-UI-011, M02-FEAT-005 |
| UAT-M02-014 | M02-UI-012 |
| UAT-M02-015 | M02-FEAT-002 |
| UAT-M02-016 | M02-FEAT-004 |
| UAT-M02-017 | M02-FEAT-005 |
| UAT-M07-001 | M07-UI-001 |
| UAT-M07-002 | M07-UI-002 |
| UAT-M07-003 | M07-UI-003, M07-FEAT-002 |
| UAT-M07-004 | M07-UI-004, M07-FEAT-002 |
| UAT-M07-005 | M07-UI-005, M07-FEAT-003 |
| UAT-M07-006 | M07-UI-006, M07-FEAT-003 |
| UAT-M07-007 | M07-UI-007, M07-FEAT-004 |
| UAT-M07-008 | M07-UI-008, M07-FEAT-005 |
| UAT-M07-009 | M07-UI-009 |
| UAT-M07-010 | M07-UI-010, M07-FEAT-006 |
| UAT-M07-011 | M07-FEAT-001 |
| UAT-M07-012 | M07-FEAT-002 |
| UAT-M07-013 | M07-FEAT-003 |
| UAT-M07-014 | M07-FEAT-004 |
| UAT-M07-015 | M07-FEAT-005 |
| UAT-M07-016 | All M02 + M07 regression |

---

*Previous: `UAT_GATE_A_AUTH_SECURITY.md` · Next after Gate B: `UAT_GATE_C_COMPLIANCE_REGULATORY.md` (M04 + M05)*
