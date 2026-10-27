# I-ITSM Test Cases

Run all of them with `mvnw.cmd test` (Windows) or `./mvnw test`. Result on 27 Oct 2026: 58 run, 58 passed (backend) and 27 run, 27 passed (frontend, `npm test` in `frontend/`).

Types: N = normal operation, B = boundary, I = invalid input, E = exception, A = authorization, R = business rule.

| ID | Type | Test (class.method) | Input / steps | Expected result | Result |
|---|---|---|---|---|---|
| TC01 | N | `IncidentLifecycleTest.fullLifecycle` | Classify, assign, acknowledge, start, resolve, verify, close | Status ends CLOSED, closedAt and resolution set | Pass |
| TC02 | E, R | `IncidentLifecycleTest.cannotSkipStates` | Resolve a NEW incident | `InvalidStateTransitionException` naming NEW and RESOLVED; status unchanged | Pass |
| TC03 | R | `IncidentLifecycleTest.reopen` | Resolve 2 h after the report, reopen 3 h later | Back to IN_PROGRESS; resolvedAt and the rejected resolution cleared; resolution deadline moved 3 h later (time waiting for the reporter does not count) | Pass |
| TC04 | B | `IncidentLifecycleTest.closedIsFinal` | CLOSED state | No allowed transitions, notes not accepted | Pass |
| TC05 | I | `IncidentLifecycleTest.validationRules` | Blank resolution; feedback before resolution; blank title | `InvalidInputException` each time | Pass |
| TC06 | R | `IncidentLifecycleTest.infoRequestFlag` | Info request then info response | awaitingReporterInfo true then false; 2 notes | Pass |
| TC07 | A | `IncidentLifecycleTest.roleBasedVisibility` | `canView` for reporter, other employee, technician, admin | true, false, true, true (polymorphism) | Pass |
| TC08 | N | `PriorityStrategyTest.criticalIsP1` | CRITICAL x CRITICAL on Payment Gateway (5), 500 users | Score 120, P1, explanation names the service | Pass |
| TC09 | B | `PriorityStrategyTest.minorIsP4` | LOW x LOW on Employee Laptops (2), 1 user | P4 | Pass |
| TC10 | R | `PriorityStrategyTest.criticalityMatters` | Same problem on criticality 5 vs 2 service | P2 vs P3 | Pass |
| TC11 | N | `PriorityStrategyTest.itilMatrix` | ITIL matrix: CRITICAL+HIGH, LOW+MEDIUM | P1, P4 | Pass |
| TC12 | N | `AssignmentStrategyTest.skillBased` | NETWORK incident; two NETWORK techs (4 and 1 active), one DB tech | The NETWORK tech with 1 active | Pass |
| TC13 | N | `AssignmentStrategyTest.loadBased` | Techs with 3 and 0 active | The one with 0 | Pass |
| TC14 | N | `AssignmentStrategyTest.roundRobin` | Three selections, two techs | A, B, A | Pass |
| TC15 | N | `AssignmentStrategyTest.smart` | Expert with history vs DB tech vs junior | Expert first ("skill 40" in reasons), DB tech last | Pass |
| TC16 | B | `AssignmentStrategyTest.empty` | No candidates | Empty result (incident stays unassigned) | Pass |
| TC17 | N | `IntelligenceTest.duplicates` | "Unable to make payment" vs "Payment application unavailable" vs printer issue | Only the payment incident is similar, score >= 0.45; itself excluded | Pass |
| TC18 | N | `IntelligenceTest.synonyms` | "sign in", "down" vs "unavailable" | Normalised to login / failure; similarity > 0.5 | Pass |
| TC19 | N, B | `IntelligenceTest.categorisation` | "My VPN disconnects when the wifi is weak"; "Something odd happened" | NETWORK with keywords vpn, wifi; no suggestion | Pass |
| TC20 | N | `IntelligenceTest.correlation` | 2 open on Payment Gateway, 1 on Email | One cluster: Payment Gateway, 2 incidents | Pass |
| TC21 | N | `SlaMonitorServiceTest.deadlinesApplied` | Report a P1 incident | Response deadline +5 min, resolution +30 min, ON_TRACK | Pass |
| TC22 | R | `SlaMonitorServiceTest.responseBreachAndEscalation` | P1 not acknowledged; clock +6 min, then +10 min | Response breached, escalated TEAM_LEAD then IT_MANAGER; audit has SLA_VIOLATED and ESCALATED | Pass |
| TC23 | B, R | `SlaMonitorServiceTest.warningThenBreach` | Acknowledged P1; clock +23 min (77%) then +10 min | Warning sent and AT_RISK; then resolution breached and BREACHED | Pass |
| TC24 | E, A | `IncidentApiTest.authentication` | Wrong password; request without token | 401 "Invalid username or password"; 401 | Pass |
| TC25 | A | `IncidentApiTest.roleBasedAccess` | Employee opens admin users; technician opens reports; admin opens admin users | 403, 403, 200 | Pass |
| TC26 | N | `IncidentApiTest.fullWorkflow` | Report wifi issue via API and run it to CLOSED with info request and feedback | Auto NETWORK, P2, assigned to ananya; every step OK; audit and notifications recorded | Pass |
| TC27 | A, E | `IncidentApiTest.illegalActions` | Other technician acknowledges; resolve before acknowledge; other employee views | 403, 409, 403 | Pass |
| TC28 | I | `IncidentApiTest.validation` | Blank title and 0 users; unknown impact value | 400 with `fieldErrors.title` and `fieldErrors.affectedUsers`; 400 | Pass |
| TC29 | N, A | `IncidentApiTest.search` | priority=P1 & keyword=payment (admin); status=CLOSED (rohan); reference=INC0003 | Only P1 payment incidents; rohan sees only their own; exact match | Pass |
| TC30 | R | `IncidentApiTest.adminConfiguration` | Switch to load_based; add PRINTING category; suggest category for "printer is out of toner" | LOAD_BASED active; category created; PRINTING suggested (no code change) | Pass |
| TC31 | N | `IncidentApiTest.reports` | Overview, workload, correlations, SLA risk | 6 incidents, 2 critical open, ananya listed, Payment Gateway cluster | Pass |
| TC32 | A, R | `LiveUpdateTest.onlyAllowedViewersReceiveUpdates` | Incident reported by emp101 is acknowledged | Live update sent once with type ACKNOWLEDGED; reporter, technicians and admins receive it, another employee does not | Pass |
| TC33 | A, N | `IncidentApiTest.liveStream` | `GET /api/live` without and with a token | 401; then 200, stream stays open, `text/event-stream` | Pass |
| TC34 | E, R | `IncidentApiTest.repeatedReport` | Rohan reports "Office wifi not working" twice (second time with different spacing and case); Priya reports the same | Second report from Rohan refused with 409 (`DuplicateIncidentException`, message names the open incident); Priya's report accepted and linked as a possible duplicate | Pass |
| TC35 | E | `NotificationServiceTest.mailServerDown` | Important notification while the e-mail channel throws `NetworkFailureException` | No exception reaches the caller; the in-app notification is still delivered | Pass |
| TC36 | E | `GlobalExceptionHandlerTest.databaseDown` | A `DataAccessResourceFailureException` reaches the API | Turned into `DatabaseFailureException`: 503 with "The database is not available right now, please try again" | Pass |
| TC37 | N, R | `IncidentApiTest.serviceStatus` | Priya (employee) asks for `GET /api/catalog/service-status` on the demo data | 200; first row is Payment Gateway with 2 open incidents, highest P1; no incident titles are sent, so employees cannot read other people's reports | Pass |
| TC38 | N, R, E | `IncidentApiTest.serviceSlaPolicies` | SLA targets of HR Portal and Email; INC0004 (HR Portal, P3); admin adds Email P1 targets twice; admin deletes a default policy | HR Portal P3 is 2 h to respond (its own), P1 is the default; Email uses the defaults; INC0004 has a 120 min response deadline; 201 then 409; 400 (defaults cannot be removed) | Pass |
| TC39 | N, R | `IncidentApiTest.slaByPriority` | `GET /api/reports/sla-by-priority` on the demo data | P1: 3 incidents, 4 min average response, 41 min average fix, 1 fixed late; P2: none, so no averages; P3: 15 min average response; overview has an average response time; Gemini listed as switched off | Pass |
| TC40 | N | `GeminiCategorizationTest.geminiAnswerIsRead` | Fake Gemini server answers `**SECURITY**` | Request goes to `/v1beta/models/<model>:generateContent` with the key header and the ticket text; SECURITY is picked | Pass |
| TC41 | E, B | `GeminiCategorizationTest.geminiDownOrOff` | Fake server answers 503; no API key | `NetworkFailureException`; without a key the adapter is off and returns nothing | Pass |
| TC42 | E, R | `GeminiCategorizationTest.categoriserFallsBack` | AI answers SECURITY; AI down; AI answers PLUMBING (no such category) | SECURITY from the AI; otherwise the keyword result (NETWORK) | Pass |
| TC43 | N, B | `IntelligenceTest.categorisationTie` | "Office printer jams on every page" (1 HARDWARE word, 1 APPLICATION word); "The portal page freezes after I plug in my keyboard" | Ties go to the category mentioned first: HARDWARE, then APPLICATION | Pass |
| TC44 | R | `SlaMonitorServiceTest.responseWarning` | P1 not acknowledged; clock +4 of 5 response minutes (80 %) | Response warning sent once, not yet breached; audit has SLA_WARNING naming the response time | Pass |
| TC45 | R | `SlaMonitorServiceTest.lateAcknowledgeOrder` | P1 acknowledged 6 min after the report | History lists ACKNOWLEDGED, then SLA_VIOLATED | Pass |
| TC46 | R, B | `SlaMonitorServiceTest.priorityRaiseRestartsTargets` | P4 laptop incident, 30 min later re-assessed to CRITICAL x CRITICAL, 400 users | P1 (4 x 4 x 2 x 1.5 = 48); SLA clock restarts at the re-assessment; not breached; PRIORITY_CHANGED, no SLA_VIOLATED | Pass |
| TC47 | E, R | `SlaMonitorServiceTest.waitingForTechnician` | Every technician away; P1 reported; then they come back | Stays CLASSIFIED with ASSIGNMENT_FAILED ("busy, away or at their limit"); the every-minute retry assigns it | Pass |
| TC48 | A | `IncidentApiTest.intelligencePrivacy` | Priya asks for similar incidents and suggested fixes on her payment incident | She never sees Rohan's incident (a technician does); suggested fixes only from incidents she may see | Pass |
| TC49 | B | `IncidentApiTest.longTexts` | 4000-character note, 3990-character comment | Saved in full; every audit line is at most 1000 characters (shortened, not an error) | Pass |
| TC50 | E, I | `IncidentApiTest.errorResponses` | Unknown URL; DELETE on an incident; plain-text body; status=FOO; forged token; old token on login; 80-character password | JSON errors with 404, 405, 415, 400 "'status' has an invalid value 'FOO'", 401; login still works; 400 with `fieldErrors.password` | Pass |
| TC51 | N, R | `IncidentApiTest.highPriorityReportReachesAdmins` | Rohan reports a P1 payment incident | Kavita gets "INCxxxx reported: ... (P1)" in the app and by e-mail | Pass |
| TC52 | R, I | `IncidentApiTest.reopenAndFeedback` | Feedback while RESOLVED; reopen; resolve again; verify; feedback twice | 400; reopened without the old resolution; rating 4 saved; second rating 400 | Pass |
| TC53 | R | `IncidentApiTest.reassessAudited` | Re-assess a P4 incident that stays P4 | History has REASSESSED | Pass |
| TC54 | A, R | `IncidentApiTest.editIncident` | Reporter edits the title; tries to change the category; edits after acknowledgement; technician re-classifies | 200; 403; 400; 200 with SOFTWARE and "category HARDWARE to SOFTWARE" in the history | Pass |
| TC55 | N, A, I | `IncidentApiTest.userManagement` | Admin edits Priya and sets a temporary password; Priya logs in, tries a wrong current password, then changes it | Name and department saved; login with the temporary password; 400 (stays logged in); 204; USER_UPDATED, PASSWORD_RESET, PASSWORD_CHANGED in the audit log | Pass |
| TC56 | E, A, I | `IncidentApiTest.deactivation` | Deactivate Ananya while she has open work; create and deactivate a new technician; unknown skill | 400 naming the incidents ("Reassign"); new technician's token gets 401 on live updates; skill COFFEE refused with 400 | Pass |
| TC57 | N, R | `IncidentApiTest.strategySaved` | Switch the priority strategy to ITIL_MATRIX; preview HIGH + HIGH | Choice stored in the database (kept after a restart); preview P2; STRATEGY_CHANGED in the audit log | Pass |
| TC58 | N, B | `IncidentApiTest.searchOptions` | open=true; keyword "_"; createdFrom with timeZone America/Los_Angeles | Only unresolved incidents; nothing (no wildcard); results found | Pass |

## Frontend unit tests (Vitest)

| ID | Test file | What is checked | Result |
|---|---|---|---|
| FT01-FT09 | `permissions.test.ts` | Assigned technician can acknowledge; another technician only comments; resolve/ask/note/edit while in progress; questions and notes before work starts; the reporter edits only until acknowledgement; only reporter or admin verifies/reopens; "provide info" only for the reporter after a question; feedback only after the fix is confirmed, once; admin assigns only while allowed | Pass |
| FT10-FT15 | `format.test.ts` | "2 h 05 min", "8 h", "1:04:09", "3 min ago", "yesterday", initials, readable enum, category and strategy names, greeting by time of day, Today/Yesterday labels; a label for every incident and administration event | Pass |
| FT16-FT18 | `live.test.ts` | Event-stream parser: named JSON event, heartbeat ignored, events split across network chunks | Pass |
| FT19-FT24 | `components.test.tsx` | Lifecycle stepper shows all 8 stages; badges show words, not only colour; a form label is linked to its input and hint; an error marks the input invalid; a given rating is read as "4 out of 5 stars"; picking a rating | Pass |
| FT25-FT27 | `client.test.ts` | A refused form lists each field ("Title: size must be between 5 and 150"); otherwise the server's message; query strings skip empty filters | Pass |

The priority preview on the report form now asks the server (`POST /api/incidents/priority-preview`), so it
always uses the strategy the administrator selected; the old copy of the formula in the frontend and its
three tests were removed.

## Browser walkthrough

The workflows below were run end to end in Chromium (Playwright) against the real backend on a fresh database,
with two or three users logged in at the same time. There were no browser errors; the only failed requests
were the ones the test caused on purpose (wrong password, another person's incident, a refused change),
and each was shown to the user as a clear message.
Screenshots of each step are in [screenshots/](screenshots).

| ID | Workflow | Checked | Result |
|---|---|---|---|
| UI01 | Rohan reports a VPN problem | Preview shows NETWORK and P3 with the server's calculation; result page shows the P3 calculation, SLA deadlines and that Ananya was assigned; Ananya's open dashboard updates by itself | Pass |
| UI02 | Ananya and Rohan take it to Closed | Acknowledge, start, ask a question; the question appears for Rohan without reloading, and his answer appears for Ananya; the Similar incidents tab suggests the fix used on INC0001; resolve; Rohan confirms, gives 5 stars, closes; History lists every step | Pass |
| UI03 | Kavita (admin) | Possible major incident banner; strategy switch; Priya's payment incident flagged as a possible duplicate of INC0005; ranked technicians in the assign dialog; reports; users, catalogue, SLA, audit pages; dark mode; phone layout | Pass |
| UI04 | Every page, every role (repeated 27 Oct) | All pages opened as Rohan, Priya, Ananya and Kavita on desktop, on a phone-sized screen and in dark mode, plus every dialog; no page wider than the screen, no browser errors except the expected ones (wrong password 401, another employee's incident 403, INC0099 404), each shown as a clear message | Pass |
| UI05 | SLA and reports changes (22 Oct) | SLA policies page lists the default targets and the services with their own targets (edit, remove, add); the report form shows the HR Portal's own 2 h / 16 h targets; a closed incident shows "took 41 min of 30 min allowed"; the reports page shows the SLA results by priority; the same app also ran against PostgreSQL in Docker Compose (demo data loaded, login, incidents, SLA report) | Pass |
| UI06 | New screens (27 Oct) | Rohan corrects his report's title (no category or service fields for him); Kavita re-classifies it and the history shows "Changed by Kavita Sharma"; edits Priya's department; sets a new password for Priya; deactivating Sneha is refused because of her 4 open incidents; strategy switches and user changes appear under "All administration changes" in the audit log; the dashboard's Open incidents tile opens the open-only list; Priya logs in with the new password, a wrong current password is refused without logging her out, then she changes it (14 checks) | Pass |
| UI07 | Stopping the server | With a live-update stream open, the server stops in 2 seconds (it used to wait 30 seconds for the open stream) | Pass |
