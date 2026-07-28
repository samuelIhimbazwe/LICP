# UAT Test Scripts — Gate D
## Modules M03 (Legal Knowledge Base) + M06 (Contract & Document Management)

**Document version:** 1.0  
**Date:** 15 June 2026  
**Prerequisite:** Gate C approved (M04 + M05, 32/32 PASS)  
**Gate exit criteria:** All 34 tests below marked PASS  
**Environment:** Staging with real backend, object storage (S3/MinIO), search index, PDF generation, optional e-sign sandbox  

### How to use

Same format as prior gate UAT documents. Link defects to `REQUIREMENTS_TRACEABILITY_MATRIX.csv`.

### Test accounts required

| Role | Email (example) | Purpose |
|------|-----------------|---------|
| Admin | admin@test.org | KB upload, categorization, audit |
| Compliance Officer | co@test.org | Search, annotations, view contracts |
| Legal Practitioner | lp@test.org | Contract upload, approval, checkout |
| Manager | mgr@test.org | View shared contracts, expiry oversight |
| External party | external@test.com | External share link (no login) |

### Test files required

| File | Purpose |
|------|---------|
| `rwanda-data-protection-law.pdf` | KB upload, full-text search |
| `nda-template-v1.docx` | Template and contract tests |
| `service-agreement-signed.pdf` | Version and e-sign tests |
| Sample text containing unique phrase `LICP-TEST-PHRASE-7742` | Search highlighting |

---

## Section 1 — M03 Legal Knowledge Base (18 tests)

---

### UAT-M03-001 — Legal repository with search and filters

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-001, M03-FEAT-001 |
| **Role** | Compliance Officer |
| **Preconditions** | ≥10 documents seeded across types/jurisdictions |

**Steps**

1. Navigate to `/knowledge-base`.
2. Verify document list/grid loads with title, type, jurisdiction, industry, date, status.
3. Apply no filters → count matches admin seed count.
4. Combine type + jurisdiction filters → results narrow correctly.
5. Log out/in → same documents visible (centralized org repository).

**Expected result**

- Single org-wide legal repository with working filters.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-002 — Document types (5 types)

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-002 |
| **Role** | Compliance Officer |
| **Preconditions** | At least one doc per type |

**Steps**

1. Filter **law** → only laws shown.
2. Repeat for **regulation**, **case_law**, **template**, **guidance**.
3. Verify type badge/label on each document card.
4. Admin upload dialog lists all 5 types.

**Expected result**

- All supervisor document types supported and filterable.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-003 — Jurisdiction and industry filtering

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-003, M03-FEAT-002 |
| **Role** | Compliance Officer |
| **Preconditions** | Docs: Rwanda/Finance, EAC/Labor, Rwanda/General |

**Steps**

1. Filter jurisdiction **Rwanda** → 2 documents.
2. Filter industry **Finance** → Finance doc only.
3. Filter **EAC** + **Labor** → single match.
4. Verify metadata on document detail matches filters.

**Expected result**

- Multi-jurisdiction and multi-industry filtering accurate.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-004 — Full-text search with highlighting

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-004, M03-FEAT-003 |
| **Role** | Compliance Officer |
| **Preconditions** | Document body contains `LICP-TEST-PHRASE-7742` |

**Steps**

1. Search `LICP-TEST-PHRASE-7742` in knowledge base.
2. Verify document appears in results.
3. Open document → search phrase **highlighted** in body (yellow/mark).
4. Search partial word from regulation title → highlighted in results list snippet.
5. Combine search + filter jurisdiction Rwanda → ranked results.

**Expected result**

- Full-text search with visible hit highlighting in list and document view.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-005 — Document version control (amended versions)

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-005, M03-FEAT-004 |
| **Role** | Admin |
| **Preconditions** | Active regulation document exists |

**Steps**

1. Admin opens regulation → **Upload amended version** or create v2.
2. Set version label v2.0, last amended date, summary of changes.
3. Version history shows v1.0 and v2.0 with dates.
4. View v1.0 (read-only archived) vs v2.0 (active).
5. Compare or view diff summary between versions if UI provides.

**Expected result**

- Amended regulations retain version history with effective dates.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-006 — Annotations

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-006, M03-FEAT-005 |
| **Role** | Compliance Officer |
| **Preconditions** | Document open in reader view |

**Steps**

1. Select paragraph text → Add annotation "Applies to our HR policy".
2. Save annotation → appears in margin/list.
3. Log out → log in as same CO → annotation still visible.
4. Log in as different user → annotation **not** visible (private to author) OR shared per policy.
5. Edit annotation text → save → persists.

**Expected result**

- User annotations persist per user across sessions.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-007 — Bookmarks and favorites

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-009 (bookmarks), M03-FEAT-005 |
| **Role** | Legal Practitioner |
| **Preconditions** | Document list visible |

**Steps**

1. LP bookmarks 2 documents with optional notes.
2. Open **Bookmarks/Favorites** tab → both listed.
3. Click bookmark → navigates to document.
4. Remove one bookmark → list updates.
5. Log out/in → remaining bookmark persists.

**Expected result**

- Bookmarks/favorites saved per user.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-008 — Citation and reference linking

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-007, M03-FEAT-006 |
| **Role** | Compliance Officer |
| **Preconditions** | Document A cites Document B (linked in metadata) |

**Steps**

1. Open Document A → Citations section lists Document B.
2. Click citation link → opens Document B in reader.
3. Document B shows **Referenced by** back-link to Document A (if bidirectional).
4. Follow chain across 3 linked documents without broken links.

**Expected result**

- Citation linking supports legal research navigation.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-009 — Download PDF and print

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-008 |
| **Role** | Compliance Officer |
| **Preconditions** | Document with PDF file attached |

**Steps**

1. Open document → click **Download PDF**.
2. File downloads with correct filename; opens as valid PDF.
3. Click **Print** → print preview opens with readable layout (title, content, page breaks).
4. Download logged in document access audit (Gate A/M12).

**Expected result**

- PDF download and print work; access audited.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-010 — Saved searches

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-009 |
| **Role** | Compliance Officer |
| **Preconditions** | On knowledge base |

**Steps**

1. Set filters: type=regulation, jurisdiction=Rwanda, query="data protection".
2. Click **Save search** → name "Rwanda Data Protection".
3. Clear all filters.
4. Open saved search → filters and query restored; same result count.
5. Delete saved search → removed from list.

**Expected result**

- Saved searches restore query and filters exactly.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-011 — Admin upload and categorization

| Field | Value |
|-------|-------|
| **RTM ID** | M03-UI-010, M03-FEAT-007 |
| **Role** | Admin, Compliance Officer |
| **Preconditions** | Admin logged in |

**Steps**

1. Admin → Upload `rwanda-data-protection-law.pdf`.
2. Set: type=law, jurisdiction=Rwanda, industry=Finance, tags, summary.
3. Publish → document appears in repository.
4. CO attempts upload → **denied** (403 or UI hidden).
5. Security audit log shows admin publish action.

**Expected result**

- Only admin publishes/categorizes; changes audited.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-012 — Admin content update and archive

| Field | Value |
|-------|-------|
| **RTM ID** | M03-FEAT-007 |
| **Role** | Admin |
| **Preconditions** | Active document |

**Steps**

1. Admin edits document metadata (summary, tags) → save.
2. Admin sets status **archived** or **repealed**.
3. Document hidden from default search but findable with status filter.
4. Audit log: update + status change entries.

**Expected result**

- Admin-managed lifecycle with audit trail.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-013 — KB integration from M05 (Gate C)

| Field | Value |
|-------|-------|
| **RTM ID** | M05-FEAT-006 (cross-gate) |
| **Role** | Compliance Officer |
| **Preconditions** | Regulatory update linked/implemented in Gate C |

**Steps**

1. From M05 implemented update → open linked KB document.
2. From KB document → navigate to related regulatory update.
3. Verify content consistency (title, jurisdiction).

**Expected result**

- M03 ↔ M05 integration from Gate C still works after KB build.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-014 — RBAC: read access by role

| Field | Value |
|-------|-------|
| **RTM ID** | M03-FEAT-001 |
| **Role** | LP, CO, Manager, Admin |
| **Preconditions** | RBAC from Gate A |

**Steps**

1. All four roles can search and view documents per permission matrix.
2. LP cannot admin upload (403).
3. Manager can view and export if permitted.
4. API `GET /documents` without auth → 401.

**Expected result**

- Knowledge base access matches supervisor RBAC.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-015 — Search performance

| Field | Value |
|-------|-------|
| **RTM ID** | M03-FEAT-003 |
| **Role** | Compliance Officer |
| **Preconditions** | ≥500 documents indexed in staging |

**Steps**

1. Run full-text search common term → results in **&lt;3 seconds**.
2. Apply filters + search → results in **&lt;3 seconds**.
3. Pagination works for &gt;50 results.

**Expected result**

- Search usable at realistic content volume.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-016 — Org data isolation

| Field | Value |
|-------|-------|
| **RTM ID** | M03-FEAT-001 |
| **Role** | Admin (Org A), Admin (Org B) |
| **Preconditions** | Two orgs in staging |

**Steps**

1. Org A admin uploads document visible only in Org A.
2. Org B user searches same title → no results.
3. Org B API with Org A document ID → 404/403.

**Expected result**

- Knowledge base scoped per organization.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M03-017 — M03 regression smoke

| Field | Value |
|-------|-------|
| **RTM ID** | All M03 |
| **Role** | Admin, CO |
| **Preconditions** | Prior M03 tests passed |

**Steps**

1. Re-run: UAT-M03-004, M03-006, M03-011, M03-008.
2. No regressions.

**Expected result**

- M03 stable for sign-off.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Section 2 — M06 Contract & Document Management (16 tests)

---

### UAT-M06-001 — Document library with folders

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-001, M06-FEAT-001 |
| **Role** | Legal Practitioner |
| **Preconditions** | Folder tree: Contracts / Vendors / HR |

**Steps**

1. Navigate to `/contracts`.
2. Expand folder tree → open **Vendors** subfolder.
3. Verify documents listed per folder; document count on folder correct.
4. Create new folder **2026 Agreements** under Contracts.
5. Move document into folder → appears in new location only.

**Expected result**

- Folder hierarchy navigable; documents organized correctly.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-002 — Contract templates (NDA, service, employment)

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-002, M06-FEAT-002 |
| **Role** | Legal Practitioner |
| **Preconditions** | Templates seeded: NDA, service_agreement, employment |

**Steps**

1. Open **Templates** tab → all three template types listed.
2. Select **NDA template** → **Create from template**.
3. Enter counterparty name → new draft document created with template content.
4. Verify type=nda, status=draft.
5. Repeat for service agreement template.

**Expected result**

- Template library creates new contracts from standard agreements.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-003 — Drag-and-drop document upload

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-003 |
| **Role** | Legal Practitioner |
| **Preconditions** | On contracts upload area |

**Steps**

1. Drag `nda-template-v1.docx` onto drop zone.
2. Fill metadata: title, counterparty, folder, tags.
3. Upload completes → document in library.
4. Download uploaded file → matches original.
5. Upload rejects unsupported type (e.g. `.exe`) with error.

**Expected result**

- Drag-and-drop upload with validation and persistence.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-004 — Metadata tagging and search

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-004 |
| **Role** | Legal Practitioner |
| **Preconditions** | Document with counterparty "Acme Ltd", value 50000, status draft |

**Steps**

1. Edit metadata: counterparty, start/end dates, contract value, currency, status, tags.
2. Save → all fields display on detail view.
3. Search library by counterparty "Acme" → document found.
4. Filter by status **draft** → document included.
5. Filter by tag → document included.

**Expected result**

- All supervisor metadata fields saved and searchable (metadata search).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-005 — Version control and check-in/check-out

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-005, M06-FEAT-003 |
| **Role** | Legal Practitioner (LP1, LP2) |
| **Preconditions** | Document v1 checked in |

**Steps**

1. LP1 **Check out** document → status shows checked out by LP1.
2. LP2 attempts check out → **blocked** (locked).
3. LP1 uploads edited file → **Check in** → version 2 created.
4. Version history: v1 and v2 with user, date, change notes.
5. Download v1 vs v2 → different content.

**Expected result**

- Check-out lock and version chain enforced.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-006 — Document approval workflow

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-006, M06-FEAT-003 |
| **Role** | Legal Practitioner, Compliance Officer |
| **Preconditions** | Document requires approval |

**Steps**

1. LP submits document for approval → approver = CO.
2. CO receives notification (Gate B).
3. CO opens approval → **Approve** with comment.
4. Document status → **approved**; LP notified.
5. Second document: CO **Rejects** with changes requested → status reflects rejection.
6. Approved document cannot edit without new checkout/version.

**Expected result**

- Multi-step approval workflow completes; approved docs protected.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-007 — Expiry and renewal tracking

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-007, M06-FEAT-004 |
| **Role** | Legal Practitioner, Manager |
| **Preconditions** | Contract expiry date = today + 25 days |

**Steps**

1. Open **Expiring contracts** tab → contract listed with days until expiry.
2. Set **auto-renew** flag on another contract → displayed on detail.
3. Mark contract **renewed** → moves off critical expiry list or status=renewed.
4. Manager views expiry list (read-only oversight).

**Expected result**

- Expiry/renewal tracking visible with countdown.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-008 — Expiry alert notification (M07)

| Field | Value |
|-------|-------|
| **RTM ID** | M06-FEAT-004 |
| **Role** | Legal Practitioner |
| **Preconditions** | Contract expiring in 30 days; alert job configured |

**Steps**

1. Create contract with expiry = today + 30 days; LP as owner.
2. Run expiry alert job (or wait for schedule).
3. LP receives in-app notification type **contract_expiry** (Gate B UAT-M07-006).
4. Notification deep-links to contract in M06.

**Expected result**

- Expiry alerts fire through notification module.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-009 — Full-text search within documents

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-008, M06-FEAT-006 |
| **Role** | Legal Practitioner |
| **Preconditions** | Uploaded PDF/DOCX contains unique phrase `CONTRACT-CLAUSE-XYZ-991` |

**Steps**

1. Contracts library search box → enter `CONTRACT-CLAUSE-XYZ-991`.
2. Document returned even if phrase not in title/metadata.
3. Open document → phrase locatable in content viewer or snippet.
4. Search non-existent phrase → empty results.

**Expected result**

- Full-text search finds content inside document files.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-010 — Internal sharing with permissions

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-009, M06-FEAT-005 |
| **Role** | Legal Practitioner, Manager |
| **Preconditions** | Document owned by LP |

**Steps**

1. LP shares document with Manager → permission **view**.
2. Manager opens document → can view/download; **cannot edit**.
3. LP updates share to **edit** → Manager can edit metadata (if policy allows).
4. LP revokes share → Manager loses access (403).

**Expected result**

- Internal sharing respects view/edit permission levels.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-011 — External sharing with expiring link

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-009, M06-FEAT-005 |
| **Role** | Legal Practitioner, External party |
| **Preconditions** | External share enabled |

**Steps**

1. LP creates external share link → permission **view only**, expires in 7 days.
2. Open link in incognito (no login) → document viewable, no edit controls.
3. Access count increments on each open.
4. After expiry (or admin revoke) → link returns expired message.
5. External user attempts API edit → 403.

**Expected result**

- Secure external sharing with permission and expiry.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-012 — E-signature integration (optional)

| Field | Value |
|-------|-------|
| **RTM ID** | M06-UI-010 |
| **Role** | Legal Practitioner |
| **Preconditions** | E-sign connector configured (DocuSign sandbox) |

**Steps**

1. Open approved contract → **Send for signature**.
2. Add signer email → send via integration.
3. Signer completes signature in e-sign portal (sandbox).
4. Webhook/callback updates contract status → **executed**; signedAt populated.
5. Signed PDF retrievable from contract detail.

**Expected result**

- Optional e-sign flow completes; status syncs to M06.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL / N/A | |

---

### UAT-M06-013 — Document access audit

| Field | Value |
|-------|-------|
| **RTM ID** | M06-FEAT-001, M12 cross-ref |
| **Role** | Admin |
| **Preconditions** | LP viewed/downloaded/shared document in prior tests |

**Steps**

1. Admin → Security → Document Access Logs.
2. Filter by contract document ID.
3. Verify: view, download, share, checkout, checkin events with user and IP.

**Expected result**

- All document actions audited per supervisor security spec.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-014 — RBAC on contract module

| Field | Value |
|-------|-------|
| **RTM ID** | M06-FEAT-001 |
| **Role** | LP, CO, Manager |
| **Preconditions** | Permission matrix from Gate A |

**Steps**

1. **LP:** full create/upload/approve submit per matrix.
2. **CO:** approve documents; cannot delete others' contracts without permission.
3. **Manager:** view and export; limited edit per matrix.
4. Unauthorized delete via API → 403.

**Expected result**

- Contract module RBAC matches supervisor roles.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-015 — Contract persistence across sessions

| Field | Value |
|-------|-------|
| **RTM ID** | M06-FEAT-001 |
| **Role** | Legal Practitioner |
| **Preconditions** | Document created in UAT-M06-003 |

**Steps**

1. Note document ID and metadata.
2. Log out → log in next day (or clear browser cache).
3. Document still in library with same versions and metadata.
4. Server restart simulation (if possible) → data intact.

**Expected result**

- Contracts persist in database/storage, not session mock.

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

### UAT-M06-016 — Gate D regression smoke

| Field | Value |
|-------|-------|
| **RTM ID** | All M03 + M06 |
| **Role** | Admin, LP |
| **Preconditions** | Gate D tests passed individually |

**Steps**

1. Re-run: UAT-M03-004, M03-011, M06-003, M06-005, M06-006, M06-009, M06-011.
2. Re-verify M05→M03 link (UAT-M03-013).
3. Complete sign-off: **34/34 PASS**.

**Expected result**

- Gate D approved → proceed to Gate E (M09 + M10).

| Result | Notes |
|--------|-------|
| ☐ PASS ☐ FAIL | |

---

## Gate D Sign-Off Sheet

| Module | Tests | Passed | Failed | Signed |
|--------|-------|--------|--------|--------|
| M03 Legal Knowledge Base | 17 | | | |
| M06 Contract Management | 16 | | | |
| Cross / regression | 1 | | | |
| **Total** | **34** | | | |

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Tester | | | |
| Developer | | | |
| Supervisor | | | |

**Prerequisites:** Gate A ☐ · Gate B ☐ · Gate C ☐  

**Gate D status:** ☐ APPROVED  ☐ REJECTED  

**E-sign tests:** ☐ N/A (optional integration not deployed)  

**Rejection notes:**

---

## Defect log template

| Defect ID | RTM ID | UAT ID | Severity | Description | Status |
|-----------|--------|--------|----------|-------------|--------|
| DEF-D001 | | | Critical/High/Medium/Low | | Open/Fixed/Verified |

---

## RTM coverage map (Gate D)

| UAT ID | RTM IDs covered |
|--------|-----------------|
| UAT-M03-001 | M03-UI-001, M03-FEAT-001 |
| UAT-M03-002 | M03-UI-002 |
| UAT-M03-003 | M03-UI-003, M03-FEAT-002 |
| UAT-M03-004 | M03-UI-004, M03-FEAT-003 |
| UAT-M03-005 | M03-UI-005, M03-FEAT-004 |
| UAT-M03-006 | M03-UI-006, M03-FEAT-005 |
| UAT-M03-007 | M03-UI-006, bookmarks |
| UAT-M03-008 | M03-UI-007, M03-FEAT-006 |
| UAT-M03-009 | M03-UI-008 |
| UAT-M03-010 | M03-UI-009 |
| UAT-M03-011 | M03-UI-010, M03-FEAT-007 |
| UAT-M03-012 | M03-FEAT-007 |
| UAT-M03-013 | M05-FEAT-006 integration |
| UAT-M03-014 | M03 RBAC |
| UAT-M03-015 | M03-FEAT-003 performance |
| UAT-M03-016 | M03-FEAT-001 isolation |
| UAT-M03-017 | M03 regression |
| UAT-M06-001 | M06-UI-001, M06-FEAT-001 |
| UAT-M06-002 | M06-UI-002, M06-FEAT-002 |
| UAT-M06-003 | M06-UI-003 |
| UAT-M06-004 | M06-UI-004 |
| UAT-M06-005 | M06-UI-005, M06-FEAT-003 |
| UAT-M06-006 | M06-UI-006, M06-FEAT-003 |
| UAT-M06-007 | M06-UI-007 |
| UAT-M06-008 | M06-FEAT-004, M07 |
| UAT-M06-009 | M06-UI-008, M06-FEAT-006 |
| UAT-M06-010 | M06-UI-009, M06-FEAT-005 |
| UAT-M06-011 | M06-UI-009, M06-FEAT-005 |
| UAT-M06-012 | M06-UI-010 |
| UAT-M06-013 | M12 document audit |
| UAT-M06-014 | M06 RBAC |
| UAT-M06-015 | M06-FEAT-001 persistence |
| UAT-M06-016 | Gate D regression |

**RTM rows covered:** M03 (17) + M06 (16) = **33 requirements**

---

*Previous: `UAT_GATE_C_COMPLIANCE_REGULATORY.md` · Next: `UAT_GATE_E_ANALYTICS_USER_MGMT.md` (M09 + M10)*
