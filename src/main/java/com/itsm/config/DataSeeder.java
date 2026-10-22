package com.itsm.config;

import com.itsm.model.Category;
import com.itsm.model.Impact;
import com.itsm.model.Incident;
import com.itsm.model.ItService;
import com.itsm.model.Priority;
import com.itsm.model.Role;
import com.itsm.model.SlaPolicy;
import com.itsm.model.Urgency;
import com.itsm.model.User;
import com.itsm.repository.CategoryRepository;
import com.itsm.repository.ItServiceRepository;
import com.itsm.repository.SlaPolicyRepository;
import com.itsm.repository.UserRepository;
import com.itsm.service.IncidentService;
import com.itsm.service.UserService;
import com.itsm.web.dto.CreateIncidentRequest;
import com.itsm.web.dto.CreateUserRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

/**
 * Fills an EMPTY database with demo data the first time the app starts, so there is something to
 * show straight away. Every demo account uses the password "password123".
 * Turn it off with itsm.seed.enabled=false.
 */
@Component
@ConditionalOnProperty(name = "itsm.seed.enabled", havingValue = "true", matchIfMissing = true)
public class DataSeeder implements ApplicationRunner {

    public static final String DEMO_PASSWORD = "password123";
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository users;
    private final UserService userService;
    private final ItServiceRepository services;
    private final CategoryRepository categories;
    private final SlaPolicyRepository slaPolicies;
    private final IncidentService incidentService;
    private final AppClock clock;

    public DataSeeder(UserRepository users, UserService userService, ItServiceRepository services,
                      CategoryRepository categories, SlaPolicyRepository slaPolicies,
                      IncidentService incidentService, AppClock clock) {
        this.users = users;
        this.userService = userService;
        this.services = services;
        this.categories = categories;
        this.slaPolicies = slaPolicies;
        this.incidentService = incidentService;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;   // already has data
        }
        log.info("Empty database: loading demo data (password for every account: {})", DEMO_PASSWORD);
        seedSlaPolicies();
        seedCategories();
        seedServices();
        seedServiceSlaPolicies();
        seedUsers();
        seedIncidents();
        log.info("Demo data loaded");
    }

    private void seedSlaPolicies() {
        for (Priority p : Priority.values()) {
            slaPolicies.save(new SlaPolicy(p, p.getDefaultResponseMinutes(), p.getDefaultResolutionMinutes(), 75));
        }
    }

    private void seedCategories() {
        category("NETWORK", "Network and connectivity", "vpn, wifi, network, internet, router, dns, connection, latency, firewall, disconnect");
        category("HARDWARE", "Physical devices", "laptop, battery, keyboard, monitor, printer, mouse, screen, hardware, charger, desktop");
        category("SOFTWARE", "Installed software", "install, license, software, crash, excel, word, office, upgrade, driver");
        category("APPLICATION", "Business applications", "application, app, portal, payment, checkout, website, page, timeout, unavailable, transaction");
        category("DATABASE", "Databases", "database, sql, query, db, deadlock, replication, table, oracle, postgres");
        category("AUTHENTICATION", "Login and access", "login, password, sso, mfa, otp, locked, account, signin, authentication, access");
        category("SECURITY", "Security incidents", "virus, malware, phishing, breach, suspicious, ransomware, hacked, spam");
        category("STORAGE", "Files and storage", "disk, storage, drive, backup, quota, file, share, folder");
        category("CLOUD", "Cloud infrastructure", "cloud, aws, azure, vm, kubernetes, container, server, deployment");
        category("EMAIL", "Email and calendar", "email, mail, inbox, outlook, smtp, attachment, calendar");
        category("GENERAL", "Anything else (used when nothing matches)", "");
    }

    private void category(String name, String description, String keywords) {
        categories.save(new Category(name, description, keywords));
    }

    private void seedServices() {
        service("Payment Gateway", "Customer payments and checkout", 5);
        service("Authentication / SSO", "Single sign-on for all internal apps", 5);
        service("Database Cluster", "Primary production databases", 5);
        service("Corporate Network", "Office network, Wi-Fi and VPN", 4);
        service("Email", "Corporate email and calendar", 3);
        service("Cloud Storage", "Shared drives and backups", 3);
        service("HR Portal", "Leave, payroll and HR self-service", 2);
        service("Employee Laptops", "Company laptops and accessories", 2);
    }

    private void service(String name, String description, int criticality) {
        services.save(new ItService(name, description, criticality));
    }

    // Two services that differ from the defaults: payments cannot wait, the HR portal can.
    private void seedServiceSlaPolicies() {
        ItService payments = services.findAll().stream().filter(s -> s.getName().equals("Payment Gateway")).findFirst().orElseThrow();
        ItService hr = services.findAll().stream().filter(s -> s.getName().equals("HR Portal")).findFirst().orElseThrow();
        slaPolicies.save(new SlaPolicy(Priority.P2, payments, 10, 60, 75));
        slaPolicies.save(new SlaPolicy(Priority.P3, hr, 120, 960, 75));
        slaPolicies.save(new SlaPolicy(Priority.P4, hr, 480, 2880, 75));
    }

    private void seedUsers() {
        user(Role.ADMIN, "kavita", "Kavita Sharma", null, null, null, false, true);
        user(Role.ADMIN, "suresh", "Suresh Iyer", null, null, null, false, false);
        user(Role.TECHNICIAN, "ananya", "Ananya Rao", null, Set.of("NETWORK", "CLOUD"), 8, true, false);
        user(Role.TECHNICIAN, "vikram", "Vikram Singh", null, Set.of("DATABASE", "APPLICATION", "STORAGE"), 5, false, false);
        user(Role.TECHNICIAN, "sneha", "Sneha Kulkarni", null, Set.of("HARDWARE", "SOFTWARE", "EMAIL"), 3, false, false);
        user(Role.TECHNICIAN, "arjun", "Arjun Das", null, Set.of("AUTHENTICATION", "SECURITY", "APPLICATION"), 6, false, false);
        user(Role.EMPLOYEE, "rohan", "Rohan Mehta", "Finance", null, null, false, false);
        user(Role.EMPLOYEE, "priya", "Priya Nair", "Sales", null, null, false, false);
    }

    private void user(Role role, String username, String fullName, String department, Set<String> skills,
                      Integer experience, boolean teamLead, boolean itManager) {
        userService.create(new CreateUserRequest(role, username, DEMO_PASSWORD, fullName,
                username + "@itsm.local", department, skills, experience, null, teamLead, itManager));
    }

    private void seedIncidents() {
        User rohan = userService.getByUsername("rohan");
        User priya = userService.getByUsername("priya");
        Instant now = clock.realNow();
        try {
            // 1. Two days ago: a finished incident, resolved well within its SLA and rated.
            Instant vpnReported = now.minus(Duration.ofHours(53));
            at(vpnReported, 0);
            Incident vpn = report(rohan, "VPN keeps disconnecting", "My VPN connection drops every few minutes when "
                    + "working from home.", "Corporate Network", Impact.MEDIUM, Urgency.MEDIUM, 1);
            finish(vpn, rohan, "Updated the VPN client to version 5.2 and reset the network adapter.", 5,
                    vpnReported, 18, 155);

            // 2. Yesterday: another finished one, fixed 11 minutes after its P1 deadline (so the reports show a
            //    missed SLA), and history for "suggested resolutions" to learn from.
            Instant timeoutReported = now.minus(Duration.ofHours(27));
            at(timeoutReported, 0);
            Incident timeout = report(priya, "Payment gateway timeout at checkout", "Customers see a timeout error "
                    + "on the payment page during checkout.", "Payment Gateway", Impact.HIGH, Urgency.HIGH, 50);
            finish(timeout, priya, "Increased the payment service connection pool and restarted the gateway.", 4,
                    timeoutReported, 4, 41);

            // 3. This morning: a low priority one the technician has acknowledged.
            Instant batteryReported = now.minus(Duration.ofHours(3));
            at(batteryReported, 0);
            Incident battery = report(rohan, "Laptop battery drains quickly", "My laptop battery lasts only one hour.",
                    "Employee Laptops", Impact.LOW, Urgency.LOW, 1);
            User tech = battery.getAssignedTechnician();
            if (tech != null) {
                at(batteryReported, 35);
                incidentService.acknowledge(battery.getId(), tech);
            }

            // 4. An hour ago: the technician is waiting for information from the reporter.
            Instant hrReported = now.minus(Duration.ofMinutes(50));
            at(hrReported, 0);
            Incident hr = report(priya, "Cannot login to HR portal", "I get an 'invalid password' message when I try "
                    + "to login to the HR portal.", "HR Portal", Impact.MEDIUM, Urgency.HIGH, 1);
            User hrTech = hr.getAssignedTechnician();
            if (hrTech != null) {
                at(hrReported, 12);
                incidentService.acknowledge(hr.getId(), hrTech);
                at(hrReported, 15);
                incidentService.startInvestigation(hr.getId(), hrTech);
                at(hrReported, 20);
                incidentService.requestInformation(hr.getId(), hrTech,
                        "Which browser are you using, and did you change your password recently?");
            }
        } finally {
            clock.backToRealTime();
        }

        // 5. Right now: a critical open incident (P1), assigned automatically.
        report(rohan, "Payment application unavailable", "The payment application is down for all users, every "
                + "transaction fails.", "Payment Gateway", Impact.CRITICAL, Urgency.CRITICAL, 300);

        // 6. Very similar to #5: duplicate detection will flag it.
        report(priya, "Unable to make payment", "The payment app shows an error and the transaction fails.",
                "Payment Gateway", Impact.HIGH, Urgency.HIGH, 40);
    }

    /** Sets the clock to some minutes after the given moment, so the next step is recorded at that time. */
    private void at(Instant start, int minutesLater) {
        clock.setTo(start.plus(Duration.ofMinutes(minutesLater)));
    }

    private Incident report(User reporter, String title, String description, String serviceName,
                            Impact impact, Urgency urgency, int affectedUsers) {
        ItService service = services.findAll().stream()
                .filter(s -> s.getName().equals(serviceName)).findFirst().orElseThrow();
        return incidentService.create(reporter, new CreateIncidentRequest(title, description, service.getId(),
                null, impact, urgency, affectedUsers));
    }

    private void finish(Incident incident, User reporter, String resolution, int rating,
                        Instant reported, int acknowledgedAfter, int resolvedAfter) {
        User tech = incident.getAssignedTechnician();
        if (tech == null) {
            return;
        }
        Long id = incident.getId();
        at(reported, acknowledgedAfter);
        incidentService.acknowledge(id, tech);
        incidentService.startInvestigation(id, tech);
        at(reported, acknowledgedAfter + 10);
        incidentService.addInvestigationNote(id, tech, "Reproduced the problem and checked the logs.");
        at(reported, resolvedAfter);
        incidentService.resolve(id, tech, resolution);
        at(reported, resolvedAfter + 25);
        incidentService.verify(id, reporter);
        incidentService.close(id, reporter);
        incidentService.giveFeedback(id, reporter, rating, "Thanks, works now.");
    }
}
