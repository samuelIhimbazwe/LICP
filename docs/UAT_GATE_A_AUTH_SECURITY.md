# UAT Test Scripts — Gate A
## Modules M01 (Auth) + M12 (Security & Audit)

**Document version:** 1.0  
**Date:** 15 June 2026  
**Gate exit criteria:** All 38 tests below marked PASS  
**Environment:** Staging with real backend, database, email service, and file storage  

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
| Admin | admin@test.org | Invites, settings, audit, suspension |
| Compliance Officer | co@test.org | RBAC negative tests |
| Legal Practitioner | lp@test.org | RBAC negative tests |
| Manager | mgr@test.org | RBAC negative tests |
| New invitee | newuser@test.org | Onboarding flow |

---

## Section 1 — M01 User Registration & Authentication (17 tests)

---

### UAT-M01-001 — Admin-only account creation (no public registration)

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-001, M01-FEAT-001 |
| **Role** | Admin, Unauthenticated visitor |
| **Preconditions** | Application deployed; no public `/register` route |

**Steps**

1. As unauthenticated visitor, navigate to `/login`.
2. Confirm there is no "Sign up", "Register", or "Create account" link.
3. Attempt `POST /api/v1/auth/register` (or equivalent) via API client with valid user payload.
4. Log in as Admin.
5. Open User Management → Invite User.
6. Complete invite for `newuser@test.org` with role Legal Practitioner.
7. Copy invitation link from email or admin console.
8. Open invitation link in incognito browser (not logged in as admin).

**Expected result**

- Step 2: No self-registration path in UI.
- Step 3: API returns `403` or `404`; no user created.
- Steps 6–8: Invitation link opens accept-invitation flow; account created only via invite.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-002 — User fields captured on invite and profile

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-002, M01-FEAT-004 |
| **Role** | Admin, New invitee |
| **Preconditions** | Admin logged in |

**Steps**

1. Admin invites user with: Full Name = "Jean Uwimana", Email = `newuser@test.org`, Phone = `+250788000001`, Organization = "Test Corp", Role = Compliance Officer.
2. Invitee accepts invite and completes onboarding.
3. Log in as new user → Profile Settings.
4. Verify all five fields display correctly.
5. Edit phone to `+250788000002` → Save.
6. Log out and log back in → verify phone persisted.
7. Admin opens User Management → find user → verify same data.

**Expected result**

- All fields present on invite form, accept flow, and profile.
- Edits persist after logout and visible to admin.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-003 — Password strength indicator and policy enforcement

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-003 |
| **Role** | New invitee |
| **Preconditions** | Valid invitation token |

**Steps**

1. Open `/set-password/:token`.
2. Enter password `123` → observe strength indicator.
3. Attempt to submit → verify rejection.
4. Enter password `TestPass1!` → observe strength indicator improves.
5. Submit successfully.
6. Repeat on Forgot Password reset flow with weak then strong password.

**Expected result**

- Strength bar/label updates as password changes.
- Weak passwords cannot be saved; strong passwords accepted per org policy.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-004 — Email verification interface

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-004 |
| **Role** | New invitee |
| **Preconditions** | Email service configured; new user invited |

**Steps**

1. Complete invite accept + password set (do not verify email yet if separate step).
2. Check inbox for verification email.
3. Click verification link → lands on email verification confirmation screen.
4. Attempt login before verifying (if policy requires verify-before-login).
5. After verifying, log in successfully.

**Expected result**

- Verification email sent within 2 minutes.
- Verification screen confirms success.
- Unverified users blocked from full access per policy.
- Verified users can proceed to MFA and dashboard.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-005 — Login with email and password

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-005 |
| **Role** | Any active user |
| **Preconditions** | Verified account with known credentials |

**Steps**

1. Navigate to `/login`.
2. Enter valid email and password → Submit.
3. Verify redirect to MFA step (not directly to dashboard).
4. Enter invalid password 1 time → verify error message (no credential leak).
5. Enter valid credentials again → proceed to MFA.

**Expected result**

- Valid login advances to MFA.
- Invalid login shows generic error; does not reveal whether email exists.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-006 — Password recovery and reset

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-006 |
| **Role** | Unauthenticated |
| **Preconditions** | Active user `lp@test.org` exists |

**Steps**

1. Go to `/forgot-password`.
2. Enter `lp@test.org` → Submit.
3. Verify success message (same for non-existent email — no enumeration).
4. Open reset email → click link.
5. Set new password meeting policy → Submit.
6. Log in with old password → must fail.
7. Log in with new password → must reach MFA.

**Expected result**

- Reset email received; link works once.
- Old password invalid; new password works.
- Expired/used token rejected.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-007 — Mandatory MFA (no bypass)

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-007, M01-FEAT-003, M12-FEAT-003 |
| **Role** | Any user |
| **Preconditions** | MFA enrolled (TOTP app or SMS) |

**Steps**

1. Log in with valid credentials.
2. On `/verify-mfa`, attempt to navigate directly to `/dashboard` without code.
3. Enter invalid MFA code → verify rejection.
4. Enter valid MFA code → access dashboard.
5. New user onboarding: complete `/setup-mfa/:token` with QR/backup codes.
6. Search UI for "Skip MFA" or "Remind me later" → must not exist.

**Expected result**

- Dashboard inaccessible without MFA.
- Invalid codes rejected; valid code grants access.
- New users must complete MFA setup before first dashboard access.
- No bypass path exists.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-008 — Session timeout (enforced)

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-008, M01-FEAT-005 |
| **Role** | Admin (configure), Any user (test) |
| **Preconditions** | Admin can set session timeout |

**Steps**

1. Admin sets session timeout to **5 minutes** in System Settings → Save.
2. Log in as Compliance Officer → complete MFA → reach dashboard.
3. Remain idle (no mouse/keyboard) for 6 minutes.
4. Attempt any action (click sidebar link).
5. Verify redirect to login with session-expired message.
6. Log in again → verify fresh session.

**Expected result**

- Idle session terminates at configured timeout.
- User must re-authenticate (including MFA).
- Active use (activity within window) extends session.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-009 — Role-based dashboard redirection

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-009 |
| **Role** | All four roles |
| **Preconditions** | One account per role |

**Steps**

1. Log in as **Compliance Officer** → verify Compliance Officer Dashboard title/content.
2. Log out → log in as **Legal Practitioner** → verify LP dashboard.
3. Repeat for **Manager** and **Admin**.
4. After login, manually navigate to `/dashboard` for each role → correct dashboard loads.

**Expected result**

- Each role sees only their designated dashboard variant after MFA.
- Dashboard title and primary widgets match role.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-010 — Profile management

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-010 |
| **Role** | Legal Practitioner |
| **Preconditions** | Logged in |

**Steps**

1. Navigate to `/profile-settings`.
2. Update full name and phone → Save.
3. Refresh page → changes persist.
4. Navigate to `/preferences` → toggle a notification preference → Save.
5. Log out/in → preferences retained.

**Expected result**

- Profile and preference changes persist across sessions.
- User cannot change own role or organization (admin-only fields).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-011 — Login attempt tracking and lockout

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-011 |
| **Role** | Unauthenticated, Admin |
| **Preconditions** | Max login attempts = 5 (configurable) |

**Steps**

1. Attempt login with wrong password 5 times for `co@test.org`.
2. Verify account lockout message on 5th attempt.
3. Attempt 6th login with **correct** password → must still be blocked.
4. Wait for lockout period OR admin unlocks account.
5. Admin → Security & Audit → Login Activity → find failed attempts for `co@test.org`.
6. Verify: timestamp, IP, status=failed, attempt count.

**Expected result**

- Lockout after max failures.
- Correct password blocked during lockout.
- All attempts logged in Security module with IP and outcome.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-012 — RBAC enforcement (API and UI)

| Field | Value |
|-------|-------|
| **RTM ID** | M01-FEAT-002, M12-FEAT-001 |
| **Role** | Compliance Officer, Admin |
| **Preconditions** | CO logged in |

**Steps**

1. As CO, manually navigate to `/user-management` in browser.
2. Verify: access denied page OR redirect (not full admin console).
3. As CO, call `GET /api/v1/users` via API with CO token → expect `403`.
4. As CO, call `GET /api/v1/obligations` → expect `200` (authorized module).
5. As Admin, access `/user-management` → full access.
6. As Admin, `GET /api/v1/users` → `200`.

**Expected result**

- Unauthorized routes blocked in UI and API.
- Authorized modules accessible per role permission matrix.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-013 — Organization affiliation tracking

| Field | Value |
|-------|-------|
| **RTM ID** | M01-FEAT-004 |
| **Role** | Admin |
| **Preconditions** | Two orgs exist: Org A, Org B |

**Steps**

1. Create user in Org A via invite.
2. Verify user profile shows Org A.
3. Admin user list filtered by Org A → user appears; filtered by Org B → user absent.
4. Attempt API query as Org A user for Org B data → `403` or empty.

**Expected result**

- Every user tied to exactly one organization.
- Data isolation between organizations enforced.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-014 — Session monitoring (admin view)

| Field | Value |
|-------|-------|
| **RTM ID** | M01-FEAT-005, M10-UI-009 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | CO logged in on Browser A; Admin on Browser B |

**Steps**

1. Admin → User Management → Sessions (or Security → Sessions).
2. Verify CO active session listed: user name, IP, login time, last activity.
3. Admin clicks **Revoke** on CO session.
4. On Browser A, CO clicks any link → redirected to login.

**Expected result**

- Active sessions visible to admin in real time.
- Revoke immediately invalidates session.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-015 — Audit-ready user access tracking

| Field | Value |
|-------|-------|
| **RTM ID** | M01-FEAT-006 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Audit logging enabled |

**Steps**

1. CO logs in (success) → logs out.
2. CO logs in (1 failed password) → success with MFA.
3. Admin changes CO role permission (e.g. remove export).
4. Admin → Security & Audit → Audit Log.
5. Filter by CO user → verify entries for: login success, login failed, logout, permission_change.
6. Each entry must include: user, timestamp, IP, action, resource.

**Expected result**

- All auth and permission events captured in immutable audit log.
- Entries cannot be edited or deleted by admin.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-016 — Business User / Legal Professional onboarding path

| Field | Value |
|-------|-------|
| **RTM ID** | M01-UI-001 (clarification) |
| **Role** | Admin |
| **Preconditions** | Supervisor definition of Business User agreed |

**Steps**

1. Admin invites user classified as **Legal Professional** (Legal Practitioner role).
2. Admin invites user classified as **Business User** (per agreed role mapping).
3. Both complete onboarding: password → email verify → MFA.
4. Both reach appropriate role dashboard.

**Expected result**

- Both user types can be provisioned only by admin.
- No public registration.
- Each lands on correct role dashboard.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M01-017 — Account suspension blocks login

| Field | Value |
|-------|-------|
| **RTM ID** | M10-UI-005 (auth dependency) |
| **Role** | Admin, Legal Practitioner |
| **Preconditions** | LP account active |

**Steps**

1. Admin suspends `lp@test.org` in User Management.
2. LP attempts login with valid credentials + MFA.
3. Verify login rejected with account suspended message.
4. Admin reactivates account.
5. LP logs in successfully.

**Expected result**

- Suspended users cannot authenticate.
- Reactivated users can authenticate normally.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Section 2 — M12 Security & Audit (21 tests)

---

### UAT-M12-001 — Role-based permission matrix display

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-001 |
| **Role** | Admin |
| **Preconditions** | Logged in as Admin |

**Steps**

1. Navigate to `/security` → Permissions tab.
2. Verify matrix shows all four roles × modules/resources.
3. Compare matrix to enforced behavior (UAT-M01-012).
4. Edit permission for Manager (e.g. disable user management) → Save.
5. Log in as Manager → verify user management inaccessible.

**Expected result**

- Matrix displays current permissions.
- Matrix edits take effect immediately for affected role.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-002 — Data encryption status indicators

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-002, M12-FEAT-002 |
| **Role** | Admin |
| **Preconditions** | Encryption configured for evidence and documents |

**Steps**

1. Security → Encryption tab.
2. Verify indicators show **encrypted** for: legal documents, compliance evidence, contracts, audit logs.
3. Upload compliance evidence file via API/storage inspection (admin/dev tool).
4. Confirm file at rest is encrypted (not plain text on disk/object store).
5. Access application over HTTPS only → verify HTTP redirects to HTTPS.

**Expected result**

- UI indicators match actual encryption configuration.
- Sensitive files encrypted at rest; traffic encrypted in transit.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-003 — MFA settings (org policy)

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-003 |
| **Role** | Admin |
| **Preconditions** | Admin access to security settings |

**Steps**

1. Security → MFA Settings.
2. Verify MFA marked **mandatory** for all users (cannot disable org-wide).
3. View allowed methods: TOTP, SMS (if enabled).
4. Attempt to disable MFA requirement org-wide → must be blocked.
5. User profile MFA section shows enrolled status.

**Expected result**

- Org policy enforces mandatory MFA.
- Settings screen reflects live policy state.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-004 — Login activity monitoring

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-004 |
| **Role** | Admin |
| **Preconditions** | Multiple logins performed in UAT-M01-011 |

**Steps**

1. Security → Login Activity.
2. Filter last 24 hours.
3. Verify each login attempt shows: user, timestamp, IP, device/browser, status (success/failed/blocked), MFA verified flag.
4. Export or paginate through 50+ records → performance acceptable.

**Expected result**

- Complete login history with required fields.
- Failed and successful attempts both visible.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-005 — Comprehensive audit log viewer

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-005, M12-FEAT-004 |
| **Role** | Admin |
| **Preconditions** | Users performed CRUD across modules in staging |

**Steps**

1. Security → Audit Log.
2. Verify entries for: user create, document upload, obligation status change, settings update.
3. Filter by user, action type, date range, resource type.
4. Open entry detail → verify action details and before/after changes (if update).
5. Attempt to delete or edit audit entry via UI or API → must fail.

**Expected result**

- All system mutations logged.
- Filters work; log is append-only.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-006 — User action timeline with filters

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-006 |
| **Role** | Admin |
| **Preconditions** | Audit data exists |

**Steps**

1. Security → Timeline tab.
2. Select user `co@test.org` → timeline shows chronological actions.
3. Filter by action type "update" only.
4. Filter by date range (last 7 days).
5. Click event → detail panel shows full context.

**Expected result**

- Timeline is chronological and filterable.
- Event detail matches underlying audit log record.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-007 — Document access and modification logs

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-007, M12-FEAT-005 |
| **Role** | Legal Practitioner, Admin |
| **Preconditions** | Contract document exists |

**Steps**

1. LP views document in Contract Management.
2. LP downloads document.
3. LP edits metadata (if permitted).
4. Admin → Security → Document Access Logs.
5. Filter by document ID → verify view, download, edit events with user, timestamp, IP.

**Expected result**

- Every view/download/edit logged.
- Log linked to correct document and user.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-008 — Compliance action audit trail

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-008, M12-FEAT-005 |
| **Role** | Compliance Officer, Admin |
| **Preconditions** | Obligation exists |

**Steps**

1. CO creates obligation.
2. CO assigns to user.
3. CO uploads evidence.
4. CO changes status from not_assessed → partially_compliant.
5. Admin → Security → Compliance Action Audit.
6. Verify all 4 actions logged with previous/new status where applicable.

**Expected result**

- Full compliance lifecycle visible in security audit view.
- Matches obligation action history in M04.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-009 — Regulatory update review logs

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-009, M12-FEAT-006 |
| **Role** | Compliance Officer, Admin |
| **Preconditions** | Regulatory update in pending_review |

**Steps**

1. CO opens regulatory update → completes impact assessment → sets status to reviewed.
2. Admin → Security → Regulatory Review Logs.
3. Verify log entry: update title, reviewer, timestamp, impact level, actions taken.
4. Attempt to delete review log via API → must fail.

**Expected result**

- Review permanently recorded.
- Immutable audit entry for regulatory review.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-010 — Export audit trail

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-010 |
| **Role** | Admin |
| **Preconditions** | Audit log has ≥10 entries |

**Steps**

1. Security → Audit Log → Apply filter (last 30 days).
2. Click **Export** → select CSV.
3. Open downloaded file → verify columns: timestamp, user, action, resource, IP, status.
4. Repeat export as PDF.
5. Verify row count matches filtered UI count.

**Expected result**

- CSV and PDF export download successfully.
- Exported data matches filtered audit log.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-011 — Anomaly detection alerts (UI)

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-011 |
| **Role** | Admin |
| **Preconditions** | Anomaly rules configured |

**Steps**

1. Security → Anomalies tab.
2. Trigger test anomaly: 10 failed logins from same IP (or use test harness).
3. Verify new anomaly appears: type, severity, timestamp, status=open.
4. Admin sets status to investigating → add notes → resolve.
5. Verify status history preserved.

**Expected result**

- Anomalies listed with severity and status workflow.
- Resolution notes saved.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-012 — Data retention policy configuration

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-012, M12-FEAT-008 |
| **Role** | Admin |
| **Preconditions** | Admin access |

**Steps**

1. Security → Retention Policies.
2. Set audit logs retention = 7 years, auto-archive = on → Save.
3. Set user data retention = 90 days after deactivation → Save.
4. Verify policies display as active.
5. (If test env supports) run retention job → verify eligible records archived per policy.

**Expected result**

- Policies save and display correctly.
- Retention job respects configured periods (or manual verification of job config documented).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-013 — Real-time anomaly detection

| Field | Value |
|-------|-------|
| **RTM ID** | M12-FEAT-009 |
| **Role** | Admin |
| **Preconditions** | Anomaly rules active; admin email/in-app notifications on |

**Steps**

1. From unfamiliar IP (or VPN), perform 5 rapid failed logins on admin account.
2. Within 1 minute, verify anomaly record created automatically.
3. Verify admin receives alert (in-app notification or email per config).
4. Anomaly type = unusual_login or similar.

**Expected result**

- Detection within 1 minute of trigger pattern.
- Admin notified without manual refresh.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-014 — Security incident from anomaly

| Field | Value |
|-------|-------|
| **RTM ID** | M12-FEAT-007 |
| **Role** | Admin |
| **Preconditions** | Critical anomaly exists |

**Steps**

1. Open critical-severity anomaly.
2. Click **Create Incident** (or auto-escalation if configured).
3. Verify incident record: title, type, severity, affected user, status=open.
4. Add mitigation steps → set status to contained → resolved.
5. Verify incident linked to source anomaly.

**Expected result**

- Anomaly can escalate to trackable security incident.
- Incident lifecycle manageable in Security module.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-015 — Legal data protection compliance (policy enforcement)

| Field | Value |
|-------|-------|
| **RTM ID** | M12-FEAT-008 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Retention + encryption + RBAC configured |

**Steps**

1. Verify deactivated user data handled per retention policy (documented or test user).
2. Verify CO cannot access admin-only security export.
3. Verify evidence download requires appropriate permission.
4. Verify audit log records evidence access.
5. Document checklist: encryption ✓, access control ✓, audit ✓, retention ✓.

**Expected result**

- System enforces configured data protection policies end-to-end.
- Supervisor checklist for legal data protection met.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-016 — Permission escalation attempt logged

| Field | Value |
|-------|-------|
| **RTM ID** | M12-FEAT-001 (negative test) |
| **Role** | Legal Practitioner |
| **Preconditions** | LP logged in with valid token |

**Steps**

1. LP calls `DELETE /api/v1/users/:adminId` via API.
2. LP calls `GET /api/v1/audit/logs/export`.
3. LP navigates to `/system-settings`.
4. Check audit log for access_denied / forbidden events.

**Expected result**

- All attempts return 403.
- Forbidden attempts logged in audit trail with severity warning or higher.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-017 — MFA cannot be disabled by non-admin user

| Field | Value |
|-------|-------|
| **RTM ID** | M12-FEAT-003 |
| **Role** | Compliance Officer |
| **Preconditions** | MFA enrolled; org policy mandatory |

**Steps**

1. CO → Profile Settings → MFA section.
2. Attempt to disable MFA.
3. Verify action blocked with policy message.
4. CO remains required to use MFA on next login.

**Expected result**

- Users cannot disable MFA when org policy is mandatory.
- Only admin policy change (if ever allowed) could alter requirement — default is mandatory for all.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-018 — Cross-module audit completeness

| Field | Value |
|-------|-------|
| **RTM ID** | M12-FEAT-004 |
| **Role** | Admin |
| **Preconditions** | Single test script performs actions in sequence |

**Steps**

1. As CO: login → create obligation → logout.
2. As LP: login → view contract → logout.
3. As Admin: login → invite user → change setting → logout.
4. Audit log search for each action type → all 6+ events present.
5. No "gaps" in timeline for test period.

**Expected result**

- 100% of tested mutations appear in audit log within 5 seconds.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-019 — Audit log performance and pagination

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-005 |
| **Role** | Admin |
| **Preconditions** | Staging DB seeded with ≥1,000 audit entries |

**Steps**

1. Open audit log → default page loads in &lt;3 seconds.
2. Page through 10 pages.
3. Apply filter (user + date) → results in &lt;3 seconds.
4. No duplicate or missing rows across pages.

**Expected result**

- Audit viewer usable at scale for supervisor demo.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-020 — Encryption key rotation indicator

| Field | Value |
|-------|-------|
| **RTM ID** | M12-UI-002 |
| **Role** | Admin |
| **Preconditions** | Key rotation schedule configured |

**Steps**

1. Security → Encryption → view key rotation schedule.
2. Verify last rotated date and next rotation date displayed.
3. After scheduled rotation (or manual test rotation), indicator updates.

**Expected result**

- Rotation status visible and accurate.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M12-021 — Gate A regression smoke test

| Field | Value |
|-------|-------|
| **RTM ID** | All M01 + M12 |
| **Role** | Admin |
| **Preconditions** | All prior UAT tests passed once |

**Steps**

1. Re-run UAT-M01-001, M01-005, M01-007, M01-008, M01-012, M12-005, M12-010 in sequence.
2. Confirm no regressions.
3. Sign Gate A checklist (38/38 PASS).

**Expected result**

- Gate A approved for progression to Gate B (M02 + M07).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Gate A Sign-Off Sheet

| Module | Tests | Passed | Failed | Signed |
|--------|-------|--------|--------|--------|
| M01 Auth | 17 | | | |
| M12 Security | 21 | | | |
| **Total** | **38** | | | |

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Developer | | | |
| Supervisor | | | |

**Gate A status:** ☐ APPROVED  ☐ REJECTED  

**Rejection notes:**

---

## Defect log template

| Defect ID | RTM ID | UAT ID | Severity | Description | Status |
|-----------|--------|--------|----------|-------------|--------|
| DEF-001 | | | Critical/High/Medium/Low | | Open/Fixed/Verified |

---

*Next document after Gate A approval: `UAT_GATE_B_DASHBOARD_NOTIFICATIONS.md` (M02 + M07, 32 tests).*
