# I-ITSM: Intelligent IT Service Management & Incident Resolution System

CS F213 Object-Oriented Programming course project (Semester I, 2026-27).

An employee reports an IT problem. The system classifies it, calculates its priority, applies the SLA,
picks the best technician, notifies everyone, tracks the deadlines, escalates when nobody responds and
keeps a full audit trail until the incident is closed.

**Report → Classify → Prioritize → Assign → Investigate → Resolve → Verify → Close**

This repository currently holds the **backend** (Java 21, Spring Boot 4, JPA, H2/PostgreSQL, JWT security).
The user interface comes next. See [docs/GUIDE.md](docs/GUIDE.md) for a full walkthrough of the code.

---

## Run it

You only need a JDK (Java 21 or newer). Maven does not need to be installed: the `mvnw` script downloads it.

**From VS Code (easiest)**
1. Open the `i-itsm` folder.
2. Open `src/main/java/com/itsm/ItsmApplication.java`.
3. Click **Run** above the `main` method.
4. Wait for `Started ItsmApplication` in the terminal.

**From a terminal**
```bash
# Windows
mvnw.cmd spring-boot:run
# macOS / Linux
./mvnw spring-boot:run
```

Then open **http://localhost:8080/swagger-ui.html**.

The first start creates a small database in the `data/` folder and fills it with demo data.
Delete the `data/` folder to start again from scratch.

## Demo accounts

Every account uses the password **`password123`**.

| Username | Role | Notes |
|---|---|---|
| `admin` | Administrator | IT Manager (top of the escalation chain) |
| `sysadmin` | Administrator | System administrator |
| `alice` | Technician | NETWORK, CLOUD · team lead · 8 years |
| `bob` | Technician | DATABASE, APPLICATION, STORAGE · 5 years |
| `carol` | Technician | HARDWARE, SOFTWARE, EMAIL · 3 years |
| `dave` | Technician | AUTHENTICATION, SECURITY, APPLICATION · 6 years |
| `john` | Employee | Finance |
| `priya` | Employee | Sales |

## Try the API in Swagger

1. Open `POST /api/auth/login` → **Try it out** → body `{"username":"john","password":"password123"}` → **Execute**.
2. Copy the `token` value from the response.
3. Click **Authorize** (top right), paste the token, click **Authorize**.
4. Now try `GET /api/incidents`, `POST /api/incidents`, and the rest.

Log in as `admin` to see reports (`/api/reports/...`) and administration (`/api/admin/...`).

## Run the tests

```bash
mvnw.cmd test        # Windows
./mvnw test          # macOS / Linux
```

31 automated tests. Each one is described in [docs/TEST_CASES.md](docs/TEST_CASES.md).

## Use PostgreSQL instead of H2

H2 needs no installation and is the default. To use PostgreSQL, create a database called `itsm` and start with:
```bash
mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=postgres
```
Connection settings are in `src/main/resources/application-postgres.properties`
(or set `ITSM_DB_URL`, `ITSM_DB_USER`, `ITSM_DB_PASSWORD`).

## Project layout

```
src/main/java/com/itsm
├── model/          Domain classes: User hierarchy, Incident, enums, SLA policy...
│   └── state/      State pattern: one class per incident status
├── strategy/       Strategy pattern: priority and technician assignment
├── event/          Observer pattern: incident events, audit + notification listeners
├── notification/   Notification channels (in-app, email) + factory
├── intelligence/   Duplicate detection, correlation, categorisation, SLA risk, suggestions
├── service/        Business logic (incident workflow, SLA monitor, search, reports...)
├── repository/     Repository pattern: database access (Spring Data JPA)
├── security/       JWT token creation, current user lookup
├── config/         Security, clock, Swagger, demo data
├── exception/      Custom exception hierarchy
└── web/            REST controllers and DTOs (the API the frontend will call)
```
