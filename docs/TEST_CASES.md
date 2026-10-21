# I-ITSM Test Cases

Run all of them with `mvnw.cmd test` (Windows) or `./mvnw test`. Result on 21 Oct 2026: **33 run, 33 passed** (backend) and **19 run, 19 passed** (frontend, `npm test` in `frontend/`).

Types: **N** normal operation · **B** boundary · **I** invalid input · **E** exception · **A** authorization · **R** business rule.

| ID | Type | Test (class → method) | Input / steps | Expected result | Result |
|---|---|---|---|---|---|
| TC01 | N | `IncidentLifecycleTest.fullLifecycle` | Classify, assign, acknowledge, start, resolve, verify, close | Status ends CLOSED, closedAt and resolution set | Pass |
| TC02 | E, R | `IncidentLifecycleTest.cannotSkipStates` | Resolve a NEW incident | `InvalidStateTransitionException` naming NEW and RESOLVED; status unchanged | Pass |
| TC03 | R | `IncidentLifecycleTest.reopen` | Reopen a RESOLVED incident | Back to IN_PROGRESS, resolvedAt cleared | Pass |
| TC04 | B | `IncidentLifecycleTest.closedIsFinal` | CLOSED state | No allowed transitions, notes not accepted | Pass |
| TC05 | I | `IncidentLifecycleTest.validationRules` | Blank resolution; feedback before resolution; blank title | `InvalidInputException` each time | Pass |
| TC06 | R | `IncidentLifecycleTest.infoRequestFlag` | Info request then info response | awaitingReporterInfo true then false; 2 notes | Pass |
| TC07 | A | `IncidentLifecycleTest.roleBasedVisibility` | `canView` for reporter, other employee, technician, admin | true, false, true, true (polymorphism) | Pass |
| TC08 | N | `PriorityStrategyTest.criticalIsP1` | CRITICAL × CRITICAL on Payment Gateway (5), 500 users | Score 120, P1, explanation names the service | Pass |
| TC09 | B | `PriorityStrategyTest.minorIsP4` | LOW × LOW on Employee Laptops (2), 1 user | P4 | Pass |
| TC10 | R | `PriorityStrategyTest.criticalityMatters` | Same problem on criticality 5 vs 2 service | P2 vs P3 | Pass |
| TC11 | N | `PriorityStrategyTest.itilMatrix` | ITIL matrix: CRITICAL+HIGH, LOW+MEDIUM | P1, P4 | Pass |
| TC12 | N | `AssignmentStrategyTest.skillBased` | NETWORK incident; two NETWORK techs (4 and 1 active), one DB tech | The NETWORK tech with 1 active | Pass |
| TC13 | N | `AssignmentStrategyTest.loadBased` | Techs with 3 and 0 active | The one with 0 | Pass |
| TC14 | N | `AssignmentStrategyTest.roundRobin` | Three selections, two techs | A, B, A | Pass |
| TC15 | N | `AssignmentStrategyTest.smart` | Expert with history vs DB tech vs junior | Expert first ("skill 40" in reasons), DB tech last | Pass |
| TC16 | B | `AssignmentStrategyTest.empty` | No candidates | Empty result (incident stays unassigned) | Pass |
| TC17 | N | `IntelligenceTest.duplicates` | "Unable to make payment" vs "Payment application unavailable" vs printer issue | Only the payment incident is similar, score ≥ 0.45; itself excluded | Pass |
| TC18 | N | `IntelligenceTest.synonyms` | "sign in", "down" vs "unavailable" | Normalised to login / failure; similarity > 0.5 | Pass |
| TC19 | N, B | `IntelligenceTest.categorisation` | "My VPN disconnects when the wifi is weak"; "Something odd happened" | NETWORK with keywords vpn, wifi; no suggestion | Pass |
| TC20 | N | `IntelligenceTest.correlation` | 2 open on Payment Gateway, 1 on Email | One cluster: Payment Gateway, 2 incidents | Pass |
| TC21 | N | `SlaMonitorServiceTest.deadlinesApplied` | Report a P1 incident | Response deadline +5 min, resolution +30 min, ON_TRACK | Pass |
| TC22 | R | `SlaMonitorServiceTest.responseBreachAndEscalation` | P1 not acknowledged; clock +6 min, then +10 min | Response breached, escalated TEAM_LEAD then IT_MANAGER; audit has SLA_VIOLATED and ESCALATED | Pass |
| TC23 | B, R | `SlaMonitorServiceTest.warningThenBreach` | Acknowledged P1; clock +23 min (77%) then +10 min | Warning sent and AT_RISK; then resolution breached and BREACHED | Pass |
| TC24 | E, A | `IncidentApiTest.authentication` | Wrong password; request without token | 401 "Invalid username or password"; 401 | Pass |
| TC25 | A | `IncidentApiTest.roleBasedAccess` | Employee → admin users; technician → reports; admin → admin users | 403, 403, 200 | Pass |
| TC26 | N | `IncidentApiTest.fullWorkflow` | Report wifi issue via API and run it to CLOSED with info request and feedback | Auto NETWORK, P2, assigned to alice; every step OK; audit and notifications recorded | Pass |
| TC27 | A, E | `IncidentApiTest.illegalActions` | Other technician acknowledges; resolve before acknowledge; other employee views | 403, 409, 403 | Pass |
| TC28 | I | `IncidentApiTest.validation` | Blank title and 0 users; unknown impact value | 400 with `fieldErrors.title` and `fieldErrors.affectedUsers`; 400 | Pass |
| TC29 | N, A | `IncidentApiTest.search` | priority=P1 & keyword=payment (admin); status=CLOSED (john); reference=INC0003 | Only P1 payment incidents; john sees only his own; exact match | Pass |
| TC30 | R | `IncidentApiTest.adminConfiguration` | Switch to load_based; add PRINTING category; suggest category for "printer is out of toner" | LOAD_BASED active; category created; PRINTING suggested (no code change) | Pass |
| TC31 | N | `IncidentApiTest.reports` | Overview, workload, correlations, SLA risk | 6 incidents, 2 critical open, alice listed, Payment Gateway cluster | Pass |
| TC32 | A, R | `LiveUpdateTest.onlyAllowedViewersReceiveUpdates` | Incident reported by emp101 is acknowledged | Live update sent once with type ACKNOWLEDGED; reporter, technicians and admins receive it, another employee does not | Pass |
| TC33 | A, N | `IncidentApiTest.liveStream` | `GET /api/live` without and with a token | 401; then 200, stream stays open, `text/event-stream` | Pass |

## Frontend unit tests (Vitest)

| ID | Test file | What is checked | Result |
|---|---|---|---|
| FT01–FT07 | `permissions.test.ts` | Assigned technician can acknowledge; another technician only comments; resolve/ask/note while in progress; only reporter or admin verifies/reopens; "provide info" only after a question; feedback once, no comments when closed; admin assigns only while allowed | Pass |
| FT08–FT10 | `priority.test.ts` | Form preview equals `WeightedPriorityStrategy`: payment outage = 60 → P1; LOW×LOW×2 = 2 → P4; 150 users raises 18 (P3) to 27 (P2) | Pass |
| FT11–FT14 | `format.test.ts` | "2 h 05 min", "1:04:09", "3 min ago", "yesterday", initials, readable enum names | Pass |
| FT15–FT17 | `live.test.ts` | Event-stream parser: named JSON event, heartbeat ignored, events split across network chunks | Pass |
| FT18–FT19 | `components.test.tsx` | Lifecycle stepper shows all 8 stages; status and priority badges show words, not only colour | Pass |

## Browser walkthrough

The three demo workflows of [GUIDE.md section 15](GUIDE.md#15-demo-video-script-3-workflows) were run
end to end in Chromium (Playwright) against the real backend on a fresh database, with two or three users
logged in at the same time. No browser errors and no failed requests. Screenshots of each step are in
[screenshots/](screenshots).

| ID | Workflow | Checked | Result |
|---|---|---|---|
| UI01 | John reports a VPN problem | Preview shows NETWORK + P3; result shows P3 explanation, SLA deadlines, assigned to Alice; Alice's open dashboard updates live | Pass |
| UI02 | Alice and John run it to Closed | Acknowledge, start, ask; question appears live for John; his answer appears live for Alice; Smart assist suggests INC0001's fix; resolve; John verifies, rates 5 stars, closes; history lists every step | Pass |
| UI03 | Admin | Correlation banner; strategy switch; Priya's payment incident flagged as duplicate of INC0003; ranked recommendation; reports; users, catalog, SLA, audit pages; dark mode; phone layout | Pass |
