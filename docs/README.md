# UAT Documentation Index
## Legal Intelligence & Compliance Platform — Supervisor Spec (12 Modules)

**Last updated:** 15 June 2026

---

## Documents

| Document | Purpose |
|----------|---------|
| [REQUIREMENTS_TRACEABILITY_MATRIX.csv](./REQUIREMENTS_TRACEABILITY_MATRIX.csv) | 198 requirements × status × gate × phase |
| [UAT_GATE_A_AUTH_SECURITY.md](./UAT_GATE_A_AUTH_SECURITY.md) | M01 Auth + M12 Security (38 tests) |
| [UAT_GATE_B_DASHBOARD_NOTIFICATIONS.md](./UAT_GATE_B_DASHBOARD_NOTIFICATIONS.md) | M02 Dashboard + M07 Notifications (33 tests) |
| [UAT_GATE_C_COMPLIANCE_REGULATORY.md](./UAT_GATE_C_COMPLIANCE_REGULATORY.md) | M04 Compliance + M05 Regulatory (32 tests) |
| [UAT_GATE_D_KNOWLEDGE_CONTRACTS.md](./UAT_GATE_D_KNOWLEDGE_CONTRACTS.md) | M03 Knowledge Base + M06 Contracts (34 tests) |
| [UAT_GATE_E_ANALYTICS_USER_MGMT.md](./UAT_GATE_E_ANALYTICS_USER_MGMT.md) | M09 Analytics + M10 User Mgmt (34 tests) |
| [UAT_GATE_F_AI_INTEGRATIONS.md](./UAT_GATE_F_AI_INTEGRATIONS.md) | M08 AI + M11 Integrations + FINAL sign-off (32 tests) |
| [GATE_A_SETUP.md](./GATE_A_SETUP.md) | Gate A backend setup, demo accounts, API reference |

---

## Gate sequence (strict order)

```
Gate A → Gate B → Gate C → Gate D → Gate E → Gate F → FINAL
 M01     M02     M04     M03     M09     M08     198/198
 M12     M07     M05     M06     M10     M11     RTM PASS
```

Do not start the next gate until the current gate is **100% PASS**.

---

## Module → gate map

| Module | Name | Gate |
|--------|------|------|
| M01 | User Registration & Authentication | A |
| M12 | Security & Audit | A |
| M02 | Dashboard | B |
| M07 | Notification & Alert | B |
| M04 | Compliance Tracking | C |
| M05 | Regulatory Update | C |
| M03 | Legal Knowledge Base | D |
| M06 | Contract & Document Management | D |
| M09 | Analytics & Reporting | E |
| M10 | User & Access Management | E |
| M08 | AI Legal Intelligence | F |
| M11 | Integration | F |

---

## Test totals

| Gate | Tests |
|------|-------|
| A | 38 |
| B | 33 |
| C | 32 |
| D | 34 |
| E | 34 |
| F | 32 |
| **Total UAT cases** | **203** |
| **RTM requirement rows** | **198** |

*(Some UAT cases cover multiple RTM rows or cross-module workflows.)*

---

## Out of scope until FINAL sign-off

- `/cases`, `/research`, `/search`, `/reports`, `/team` standalone pages
- Demo login shortcuts
- UX polish not in supervisor spec
- Business User role (deferred — using 4 roles)

---

## Current prototype status

| Layer | Status |
|-------|--------|
| UI screens | ~87% (mostly built) |
| Functional / backend | ~12% (mock data) |
| UAT documentation | **Complete** |
| Supervisor sign-off | **Not ready** — implementation required |

---

## Recommended next step

**Implement Gate A** (backend auth, MFA, email verification, RBAC, audit logging) then execute UAT Gate A against staging.
