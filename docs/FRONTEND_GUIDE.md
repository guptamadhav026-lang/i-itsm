# I-ITSM Frontend Guide

This guide explains the React frontend in `frontend/` for someone who knows Java but has never used
React. Read [GUIDE.md](GUIDE.md) first for the backend: the frontend only shows what the backend decides.

Contents
1. [How to run it](#1-how-to-run-it)
2. [The big picture](#2-the-big-picture)
3. [React explained for a Java developer](#3-react-explained-for-a-java-developer)
4. [Follow one click through the code](#4-follow-one-click-through-the-code)
5. [Live updates (no reload needed)](#5-live-updates-no-reload-needed)
6. [File map](#6-file-map)
7. [Screens for each role](#7-screens-for-each-role)
8. [Brief requirement → screen map](#8-brief-requirement--screen-map)
9. [Design decisions](#9-design-decisions)
10. [Tests](#10-tests)
11. [Technology choices (for the Technology Selection Report)](#11-technology-choices-for-the-technology-selection-report)

---

## 1. How to run it

**One command, everything at http://localhost:8080 (recommended for the demo)**

```bash
mvnw.cmd -Pui spring-boot:run      # Windows
./mvnw -Pui spring-boot:run        # macOS / Linux
```

`-Pui` switches on the Maven profile called `ui` in `pom.xml`. It downloads its own copy of Node.js into
`frontend/node/` (you do not need to install Node), runs `npm install` and `npm run build`, and copies the
finished website into the Spring Boot app. The first run takes a few minutes; later runs are faster.
Then open **http://localhost:8080** and log in with one of the demo buttons.

**Developer mode (instant refresh while you edit the React code)**

Needs Node.js 20 or newer installed. Start the backend as usual (Run on `ItsmApplication`), then:

```bash
cd frontend
npm install        # only the first time
npm run dev        # opens on http://localhost:5173
```

Vite (the development server) forwards every `/api/...` request to the backend on port 8080
(see `vite.config.ts`), so the browser thinks both are the same website. Save a `.tsx` file and the
browser updates immediately.

Other commands, all inside `frontend/`:

| Command | What it does |
|---|---|
| `npm test` | runs the 19 frontend unit tests (Vitest) |
| `npm run typecheck` | checks every type, like `javac` does for Java |
| `npm run build` | builds the optimised website into `frontend/dist/` |

---

## 2. The big picture

```
Browser (React, TypeScript)                       Spring Boot (Java)
┌─────────────────────────────┐   JSON over HTTP  ┌────────────────────────────┐
│ pages/  ← what you see      │ ───────────────▶  │ web/  REST controllers     │
│ components/ ← building      │   Bearer token    │ service/  business rules   │
│   blocks (badges, tables…)  │ ◀───────────────  │ model/ state/ strategy/ …  │
│ api/  ← calls the REST API  │                   │                            │
│ live/ ← listens for pushes  │ ◀── /api/live ─── │ live/  3rd Observer        │
└─────────────────────────────┘   (Server-Sent    └────────────────────────────┘
                                    Events)
```

The frontend has **no business rules of its own**. Priority, SLA deadlines, assignment, duplicate
detection, the lifecycle rules: all of it is calculated by the Java backend. The frontend:

1. asks the backend for data (`GET /api/incidents/7`),
2. shows it nicely,
3. sends the user's action back (`POST /api/incidents/7/acknowledge`),
4. re-loads whatever changed.

That keeps the OOP design (State, Strategy, Observer, Factory, Repository) in one place: the Java code.

---

## 3. React explained for a Java developer

| React / TypeScript idea | Closest Java idea | Example in this project |
|---|---|---|
| **TypeScript** | Java's static types, but for JavaScript | `api/types.ts` mirrors every Java DTO record |
| `interface IncidentSummary { … }` | a `record` / DTO class | `IncidentSummary` ↔ `IncidentSummaryDto.java` |
| `type IncidentStatus = 'NEW' \| 'CLASSIFIED' \| …` | an `enum` | same names as `IncidentStatus.java` |
| **Component** (a function returning HTML-like JSX) | a class that knows how to draw itself | `StatusBadge`, `IncidentTable`, `DashboardPage` |
| **Props** (the component's arguments) | constructor parameters | `<StatusBadge status="ASSIGNED" />` |
| **State** (`useState`) | a private field; changing it redraws the component | the text typed in the report form |
| **Hook** (`useSomething`) | a helper method that can keep state | `useAuth()`, `useLiveUpdates()` |
| **Context** (`AuthProvider`) | a singleton bean that many classes can inject | the logged-in user, the toast messages |
| **React Query** (`useQuery`) | a cache in front of a repository | loads `/api/incidents` once, shares it, refreshes it |
| `useMutation` | calling a service method that changes data | Acknowledge, Resolve, Assign… |
| **Router** (`<Route path="incidents/:id">`) | `@GetMapping("/incidents/{id}")` | `App.tsx` |
| `export function` / `import { … } from` | `public` + `import` | every file |

JSX looks like HTML inside JavaScript:

```tsx
export function StatusBadge({ status }: { status: IncidentStatus }) {
  return <Badge tone={statusTone[status]} dot>{STATUS_LABEL[status]}</Badge>
}
```

Read it as: "a method `StatusBadge` that takes a `status` and returns a coloured label with the status
written in words". Whenever `status` changes, React calls the function again and updates the screen.
You never change the page by hand.

---

## 4. Follow one click through the code

Alice presses **Acknowledge** on INC0007.

1. `pages/IncidentDetailPage.tsx` shows the button only if `availableActions(incident, user)` (in
   `lib/permissions.ts`) contains `'acknowledge'`. That function mirrors the backend rules: the incident
   is ASSIGNED and Alice is the assigned technician (or an admin).
2. The click calls `run('Acknowledged…', () => incidentApi.acknowledge(id))`.
3. `api/endpoints.ts` → `incidentApi.acknowledge` → `api/client.ts` sends
   `POST /api/incidents/7/acknowledge` with the header `Authorization: Bearer <token>`.
4. The backend (`IncidentController` → `IncidentService.acknowledge` → `AcknowledgedState`) checks the
   rules again (**the backend is the real security**; hiding a button is only for convenience), saves,
   and publishes an `IncidentEvent`.
5. Three Observers react: `AuditTrailListener` writes history, `NotificationEventListener` notifies John,
   and `LiveUpdateListener` pushes the change to every open browser that may see INC0007.
6. Back in the browser, the backend's answer (the updated incident) goes straight into React Query's cache
   and the incident lists and history are marked as stale, so they reload. A green toast appears, the badge
   changes to **Acknowledged** and the response SLA shows **Met**.
7. John's browser, open on the same incident, receives the push and reloads too, without a click.

If the backend says no (for example 409 "Cannot move from ASSIGNED to RESOLVED"), `client.ts` throws an
`ApiError` with the backend's message and the page shows it in a red toast.

---

## 5. Live updates (no reload needed)

**Backend** (`src/main/java/com/itsm/live/`):

* `LiveController` serves `GET /api/live`. The response never ends: it is a **Server-Sent Events** stream,
  a standard way for a server to keep sending small messages to a browser.
* `LiveUpdateHub` keeps the open connections (one per browser tab) in a thread-safe list and sends a
  heartbeat every 25 seconds so idle connections are not cut.
* `LiveUpdateListener` is the **third Observer** of `IncidentEventPublisher`. It was added without
  changing `IncidentService` or the other two listeners: the Open/Closed principle in action.
  It sends only **after the database transaction commits**, so a browser that reloads straight away sees
  the new data. Employees only receive events about incidents they reported; technicians and admins get all.

**Frontend** (`frontend/src/live/useLiveUpdates.ts`):

* Opens `/api/live` with `fetch` (so the login token can go in a header, not in the URL).
* Reads the stream with `readEvents` / `parseBlock` (unit-tested in `src/test/live.test.ts`).
* For each event, marks the incident lists, that incident, notifications, reports and history as stale.
  Every screen that shows them reloads by itself.
* Reconnects automatically (1 s, 2 s, 4 s… up to 30 s) if the connection drops. The green **Live** pill in
  the top bar shows the state.

---

## 6. File map

```
frontend/
├── index.html              the single HTML page; React draws everything inside <div id="root">
├── package.json            dependencies and npm scripts (like pom.xml for JavaScript)
├── vite.config.ts          dev server, /api proxy to :8080, test settings
└── src/
    ├── main.tsx            start-up: React Query, router, toasts, login context, then <App/>
    ├── App.tsx             all routes (URL → page) and who may open them
    ├── index.css           colours for light and dark mode (design tokens), fonts, animations
    ├── api/
    │   ├── types.ts        TypeScript copies of the Java DTOs and enums
    │   ├── client.ts       fetch wrapper: adds the token, turns errors into ApiError
    │   └── endpoints.ts    one function per REST endpoint (authApi, incidentApi, adminApi…)
    ├── auth/AuthContext.tsx   login, logout, "who am I", restoring the session after a reload
    ├── live/useLiveUpdates.ts the Server-Sent Events listener (section 5)
    ├── layout/
    │   ├── AppShell.tsx    sidebar (different per role), top bar, quick jump, phone menu
    │   ├── NotificationBell.tsx   unread count, drop-down, pop-up for new notifications
    │   └── useTheme.ts     light / dark switch, remembered in the browser
    ├── lib/
    │   ├── format.ts       dates, "3 min ago", SLA countdowns, readable labels
    │   ├── permissions.ts  which action buttons to show (mirrors the backend rules)
    │   └── cn.ts, useNow.ts   small helpers (CSS class joining, a ticking clock)
    ├── components/
    │   ├── ui/             generic building blocks: Button, Card, Badge, Field, Modal, Toast, Tabs…
    │   ├── incident/       StatusBadge, PriorityBadge, SlaBadge, SlaCountdown, LifecycleStepper,
    │   │                   IncidentTable, NotesTimeline, AuditTimeline, Feedback, SmartAssist…
    │   └── charts/charts.tsx   bar charts with legend, tooltips and a "Table" view
    ├── pages/
    │   ├── LoginPage.tsx, RegisterPage.tsx
    │   ├── DashboardPage.tsx      three different dashboards: employee, technician, admin
    │   ├── ReportIncidentPage.tsx the report form with a live preview of category, priority and SLA
    │   ├── IncidentDetailPage.tsx one incident: actions, lifecycle, SLA, notes, history, smart assist
    │   ├── IncidentsPage.tsx      search with 10 filters, kept in the URL, CSV export
    │   ├── NotificationsPage.tsx  in-app notifications and the simulated e-mail log
    │   ├── ReportsPage.tsx        management charts and technician workload
    │   └── admin/                 Users, Services & categories, SLA policies, Strategies, Audit log
    └── test/               Vitest unit tests (section 10)
```

---

## 7. Screens for each role

Screenshots are in [docs/screenshots](screenshots).

**Employee (john, priya)**
* Dashboard: open incidents, "waiting for you" banners when a technician asked a question or a fix
  needs confirming.
* Report an incident: while typing, the panel on the right shows the category the system detected
  (and the keywords that matched), an estimated priority with the formula, the SLA targets and how a
  technician will be chosen. After submitting: the real category, priority explanation, SLA deadlines,
  the assigned technician and a duplicate warning if it looks like an open incident.
* Incident page: lifecycle stepper, live SLA countdowns, answer the technician's question,
  "Yes, it's fixed" / "Still broken", close, give star feedback, full history.

**Technician (alice, bob, carol, dave)**
* Dashboard: availability switch, workload meter, skills, "acknowledge these first" (response SLA running),
  the queue.
* Incident page: Acknowledge → Start investigation → Ask reporter / add notes → Resolve. The
  **Smart assist** tab shows similar open incidents and fixes that worked for similar closed ones, with
  **Use this fix** to copy one into the resolution. **Re-assess** recalculates priority.

**Administrator (admin, sysadmin)**
* Dashboard: possible major incident alerts (correlation), KPIs, SLA risk list, live activity feed,
  technician workload, unassigned incidents.
* Any incident: assign or reassign with the ranked recommendation (score and reasons per technician),
  or let the active strategy decide.
* Reports: SLA compliance, incidents by stage, priority, service and category, workload table. Every chart
  has a **Table** button.
* Administration: users and technicians (skills, capacity, team lead, deactivate), services with business
  criticality, categories with auto-categorisation keywords, SLA targets per priority, assignment and
  priority **strategies switchable at runtime**, and the full audit log.

---

## 8. Brief requirement → screen map

| Brief requirement | Where in the UI |
|---|---|
| Incident reporting with title, description, service, impact, urgency, affected users | Report an incident |
| Automatic categorisation | Report form preview + result screen; categories admin page (keywords) |
| Priority calculation with explanation | Report form preview, result screen, incident Details card |
| SLA deadlines, warnings, breaches | SLA card with live countdowns, SLA badges everywhere, SLA policies page |
| Technician assignment (skills, workload) | Result screen, assign dialog with ranking, Strategies page |
| Lifecycle New → Closed | Lifecycle stepper and the action buttons (only valid ones appear) |
| Escalation | Escalation badge, notifications, audit log |
| Notifications | Bell with pop-ups, Notifications page (in-app and e-mail log) |
| Incident history / audit trail | History tab on every incident, Audit log page |
| Search and filter (at least 5 criteria) | Incidents page: keyword, reference, status, priority, SLA state, service, category, technician, date range |
| Role-based access | Different menu, dashboard and buttons per role; admin pages hidden from others |
| Reports and dashboards | Admin dashboard and Reports page |
| Intelligent features | Duplicate banner, correlation alert, SLA risk list, smart assist, recommendations |
| Feedback after resolution | Star rating on the incident page |

---

## 9. Design decisions

* **Readable first.** Status, priority and SLA are always written in words next to their colour, so
  colour-blind users and printed screenshots still make sense.
* **Charts follow data-visualisation rules.** One axis per chart, values written on the bars, a legend
  when there are two series, a colour-blind-checked palette, and a **Table** view of the same numbers.
* **Dark mode** has its own colours (not an automatic inversion). The choice is remembered.
* **Works on a phone.** The sidebar becomes a menu, tables become cards.
* **Only valid actions are shown**, so users are not offered something that will fail.
* **Admin screens load on demand.** The charts library is only downloaded when an admin opens Reports,
  so the app starts faster for employees and technicians.
* **Keyboard friendly.** Every action is a real button or link; dialogs close with Esc.

---

## 10. Tests

`npm test` runs 19 unit tests in `frontend/src/test/`:

| File | What it proves |
|---|---|
| `permissions.test.ts` | the right buttons for reporter, assigned technician, other technician and admin at each stage |
| `priority.test.ts` | the report form's priority preview gives the same answer as `WeightedPriorityStrategy` |
| `format.test.ts` | durations, countdowns, "x min ago", initials |
| `live.test.ts` | the Server-Sent Events parser, including messages split across network packets |
| `components.test.tsx` | the lifecycle stepper shows all 8 stages; badges show words, not just colours |

The three demo workflows were also run end to end in a real browser (Chromium) against the backend:
see [TEST_CASES.md](TEST_CASES.md#browser-walkthrough).

---

## 11. Technology choices (for the Technology Selection Report)

| Choice | Why |
|---|---|
| **React 19** | the most used UI library; components map naturally to the OOP idea of small classes with one job |
| **TypeScript** | static types like Java; `api/types.ts` mirrors the Java DTOs, so a wrong field name is a compile error |
| **Vite** | instant dev server and fast production build |
| **TanStack React Query** | caching, loading and error states, and easy "reload what changed" for live updates |
| **React Router** | URLs for every screen, so pages can be bookmarked and the browser back button works |
| **Tailwind CSS** | consistent spacing and colours through design tokens; light and dark mode from one set of styles |
| **Recharts** | simple, accessible bar charts with tooltips |
| **Server-Sent Events** | one-way live updates are all we need; simpler than WebSockets and built into Spring (`SseEmitter`) |
| **frontend-maven-plugin** | one Maven command builds both halves, so the examiner does not need Node.js installed |
