package com.itsm.web;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end tests through the REST API: real security, real database (in memory), demo data loaded.
 * Each test is rolled back afterwards (@Transactional), so they don't affect each other.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class IncidentApiTest {

    private static final String PASSWORD = "password123";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private com.itsm.repository.AppSettingRepository settings;

    private String login(String username) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(body, "$.token");
    }

    private ResultActions postJson(String url, String token, String json) throws Exception {
        return mvc.perform(post(url).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    /** Id of the demo incident with this exact title (found through the admin search). */
    private int incidentId(String title) throws Exception {
        String body = mvc.perform(get("/api/incidents/search").param("keyword", title)
                        .header("Authorization", login("kavita")))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.<java.util.List<Integer>>read(body, "$[?(@.title == '" + title + "')].id").get(0);
    }

    private int report(String token, String title, String description, String service, String impact,
                       String urgency, int users) throws Exception {
        String body = postJson("/api/incidents", token, """
                {"title":"%s","description":"%s","serviceId":%d,"impact":"%s","urgency":"%s","affectedUsers":%d}"""
                .formatted(title, description, serviceId(token, service), impact, urgency, users))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.id");
    }

    private ResultActions putJson(String url, String token, String json) throws Exception {
        return mvc.perform(put(url).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private long serviceId(String token, String name) throws Exception {
        String body = mvc.perform(get("/api/catalog/services").header("Authorization", token))
                .andReturn().getResponse().getContentAsString();
        Number id = JsonPath.<java.util.List<Number>>read(body, "$[?(@.name == '" + name + "')].id").get(0);
        return id.longValue();
    }

    @Test
    @DisplayName("TC24 Wrong password gives 401, no token gives 401")
    void authentication() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"rohan\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Invalid username or password")));
        mvc.perform(get("/api/incidents")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("TC25 Role-based access: employees and technicians cannot use admin endpoints")
    void roleBasedAccess() throws Exception {
        mvc.perform(get("/api/admin/users").header("Authorization", login("rohan")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/reports/overview").header("Authorization", login("ananya")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").header("Authorization", login("kavita")))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("TC26 Full workflow: report -> auto-classify/prioritise/assign -> work -> resolve -> verify -> close")
    void fullWorkflow() throws Exception {
        String rohan = login("rohan");
        long network = serviceId(rohan, "Corporate Network");

        String created = postJson("/api/incidents", rohan, """
                {"title":"Office wifi not working","description":"The wifi on floor 3 keeps dropping",
                 "serviceId":%d,"impact":"MEDIUM","urgency":"HIGH","affectedUsers":25}""".formatted(network))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("ASSIGNED")))
                .andExpect(jsonPath("$.category.name", is("NETWORK")))          // auto-categorised
                .andExpect(jsonPath("$.priority", is("P2")))                    // 2*3*4*1.25 = 30
                .andExpect(jsonPath("$.assignedTechnician.username", is("ananya"))) // network skills
                .andExpect(jsonPath("$.responseDeadline", notNullValue()))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(created, "$.id");

        String ananya = login("ananya");
        postJson("/api/incidents/" + id + "/acknowledge", ananya, "").andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("ACKNOWLEDGED")));
        postJson("/api/incidents/" + id + "/start", ananya, "").andExpect(jsonPath("$.status", is("IN_PROGRESS")));
        postJson("/api/incidents/" + id + "/info-request", ananya, "{\"text\":\"Which access point?\"}")
                .andExpect(jsonPath("$.awaitingReporterInfo", is(true)));
        postJson("/api/incidents/" + id + "/info-response", rohan, "{\"text\":\"AP-3B near the lifts\"}")
                .andExpect(jsonPath("$.awaitingReporterInfo", is(false)));
        postJson("/api/incidents/" + id + "/resolve", ananya, "{\"resolution\":\"Replaced faulty access point\"}")
                .andExpect(jsonPath("$.status", is("RESOLVED")));
        postJson("/api/incidents/" + id + "/verify", rohan, "").andExpect(jsonPath("$.status", is("VERIFIED")));
        postJson("/api/incidents/" + id + "/close", rohan, "").andExpect(jsonPath("$.status", is("CLOSED")));
        postJson("/api/incidents/" + id + "/feedback", rohan, "{\"rating\":5,\"comment\":\"Quick fix\"}")
                .andExpect(jsonPath("$.feedbackRating", is(5)));

        mvc.perform(get("/api/incidents/" + id + "/audit").header("Authorization", rohan))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].action", hasItem("CREATED")))
                .andExpect(jsonPath("$[*].action", hasItem("CLOSED")));
        mvc.perform(get("/api/notifications").header("Authorization", ananya))
                .andExpect(jsonPath("$[*].subject", hasItem("INC%04d assigned to Ananya Rao".formatted(id))));
    }

    @Test
    @DisplayName("TC27 Illegal actions are rejected: wrong technician 403, skipped state 409")
    void illegalActions() throws Exception {
        String rohan = login("rohan");
        long laptops = serviceId(rohan, "Employee Laptops");
        String created = postJson("/api/incidents", rohan, """
                {"title":"Laptop keyboard broken","description":"Several keys do not work",
                 "serviceId":%d,"impact":"LOW","urgency":"MEDIUM","affectedUsers":1}""".formatted(laptops))
                .andExpect(jsonPath("$.assignedTechnician.username", is("sneha")))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(created, "$.id");

        postJson("/api/incidents/" + id + "/acknowledge", login("vikram"), "")
                .andExpect(status().isForbidden());                      // not the assigned technician
        postJson("/api/incidents/" + id + "/resolve", login("sneha"), "{\"resolution\":\"done\"}")
                .andExpect(status().isConflict())                        // must acknowledge first
                .andExpect(jsonPath("$.message", notNullValue()));
        mvc.perform(get("/api/incidents/" + id).header("Authorization", login("priya")))
                .andExpect(status().isForbidden());                      // another employee's incident
    }

    @Test
    @DisplayName("TC28 Invalid input gives 400 with the field that is wrong")
    void validation() throws Exception {
        postJson("/api/incidents", login("rohan"), """
                {"title":"","description":"x","serviceId":1,"impact":"HIGH","urgency":"HIGH","affectedUsers":0}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title", notNullValue()))
                .andExpect(jsonPath("$.fieldErrors.affectedUsers", notNullValue()));
        postJson("/api/incidents", login("rohan"), """
                {"title":"Valid title","description":"x","serviceId":1,"impact":"ENORMOUS","urgency":"HIGH","affectedUsers":1}""")
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC29 Search by criteria; employees only ever see their own incidents")
    void search() throws Exception {
        String admin = login("kavita");
        mvc.perform(get("/api/incidents/search").param("priority", "P1").param("keyword", "payment")
                        .header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].priority", everyItem(is("P1"))))
                .andExpect(jsonPath("$[*].title", hasItem("Payment application unavailable")));
        mvc.perform(get("/api/incidents/search").param("status", "CLOSED").header("Authorization", login("rohan")))
                .andExpect(jsonPath("$[*].reporter.username", everyItem(is("rohan"))))
                .andExpect(jsonPath("$[*].reporter.username", not(hasItem("priya"))));
        mvc.perform(get("/api/incidents/search").param("reference", "INC0003").header("Authorization", admin))
                .andExpect(jsonPath("$[0].reference", is("INC0003")));
    }

    @Test
    @DisplayName("TC30 Admin can switch strategy at runtime and add a category without code changes")
    void adminConfiguration() throws Exception {
        String admin = login("kavita");
        mvc.perform(put("/api/admin/strategies/assignment").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"load_based\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.active == true)].name", hasItem("LOAD_BASED")));
        postJson("/api/admin/categories", admin,
                "{\"name\":\"Printing\",\"description\":\"Printers\",\"keywords\":\"printer, toner, scan\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name", is("PRINTING")));
        postJson("/api/catalog/suggest-category", admin, "{\"text\":\"The printer is out of toner\"}")
                .andExpect(jsonPath("$.categoryName", is("PRINTING")));
        // put the default back for other tests sharing this application context
        mvc.perform(put("/api/admin/strategies/assignment").header("Authorization", admin)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"SMART\"}"));
    }

    @Test
    @DisplayName("TC31 Reports: overview, workload, SLA risk and correlations")
    void reports() throws Exception {
        String admin = login("kavita");
        mvc.perform(get("/api/reports/overview").header("Authorization", admin))
                .andExpect(jsonPath("$.totalIncidents", is(6)))
                .andExpect(jsonPath("$.criticalOpenIncidents", is(2)));
        mvc.perform(get("/api/reports/technician-workload").header("Authorization", admin))
                .andExpect(jsonPath("$[*].username", hasItem("ananya")));
        mvc.perform(get("/api/reports/correlations").header("Authorization", admin))
                .andExpect(jsonPath("$[0].serviceName", is("Payment Gateway")));
        mvc.perform(get("/api/reports/sla-risk").header("Authorization", admin)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("TC37 Every user sees which services already have open problems, but not the incidents")
    void serviceStatus() throws Exception {
        mvc.perform(get("/api/catalog/service-status").header("Authorization", login("priya")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].serviceName", is("Payment Gateway")))
                .andExpect(jsonPath("$[0].openIncidents", is(2)))
                .andExpect(jsonPath("$[0].highestPriority", is("P1")))
                .andExpect(jsonPath("$[0].title").doesNotExist());
    }

    @Test
    @DisplayName("TC38 A service can have its own SLA targets; other services use the defaults")
    void serviceSlaPolicies() throws Exception {
        String priya = login("priya");
        long hr = serviceId(priya, "HR Portal");
        long email = serviceId(priya, "Email");
        mvc.perform(get("/api/catalog/services/" + hr + "/sla").header("Authorization", priya))
                .andExpect(jsonPath("$[2].priority", is("P3")))
                .andExpect(jsonPath("$[2].serviceName", is("HR Portal")))
                .andExpect(jsonPath("$[2].responseMinutes", is(120)))
                .andExpect(jsonPath("$[0].serviceName").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$[0].resolutionMinutes", is(30)));
        mvc.perform(get("/api/catalog/services/" + email + "/sla").header("Authorization", priya))
                .andExpect(jsonPath("$[2].responseMinutes", is(60)));

        // INC0004 is Priya's P3 incident on the HR portal: 2 hours to respond instead of the default 1 hour
        String detail = mvc.perform(get("/api/incidents/4").header("Authorization", priya))
                .andExpect(jsonPath("$.serviceSlaPolicy", is(true)))
                .andReturn().getResponse().getContentAsString();
        java.time.Duration toRespond = java.time.Duration.between(
                java.time.Instant.parse(JsonPath.read(detail, "$.createdAt")),
                java.time.Instant.parse(JsonPath.read(detail, "$.responseDeadline")));
        org.assertj.core.api.Assertions.assertThat(toRespond).isEqualTo(java.time.Duration.ofMinutes(120));

        String admin = login("kavita");
        String override = "{\"serviceId\":" + email + ",\"priority\":\"P1\",\"responseMinutes\":3,"
                + "\"resolutionMinutes\":20,\"warningThresholdPercent\":80}";
        postJson("/api/admin/sla-policies/services", admin, override).andExpect(status().isCreated());
        postJson("/api/admin/sla-policies/services", admin, override).andExpect(status().isConflict());

        // The defaults come first in the list and cannot be removed
        String policies = mvc.perform(get("/api/admin/sla-policies").header("Authorization", admin))
                .andExpect(jsonPath("$[0].serviceName").value(org.hamcrest.Matchers.nullValue()))
                .andReturn().getResponse().getContentAsString();
        Number defaultP1 = JsonPath.read(policies, "$[0].id");
        mvc.perform(delete("/api/admin/sla-policies/services/" + defaultP1).header("Authorization", admin))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC39 SLA report per priority shows real response and resolution times and breaches")
    void slaByPriority() throws Exception {
        String admin = login("kavita");
        mvc.perform(get("/api/reports/sla-by-priority").header("Authorization", admin))
                .andExpect(jsonPath("$.length()", is(4)))
                .andExpect(jsonPath("$[0].priority", is("P1")))
                // P1: the demo payment timeout was acknowledged after 4 minutes and fixed after 41 (deadline 30)
                .andExpect(jsonPath("$[0].incidents", is(3)))
                .andExpect(jsonPath("$[0].averageResponseMinutes", is(4.0)))
                .andExpect(jsonPath("$[0].averageResolutionMinutes", is(41.0)))
                .andExpect(jsonPath("$[0].responseBreaches", is(0)))
                .andExpect(jsonPath("$[0].resolutionBreaches", is(1)))
                .andExpect(jsonPath("$[1].incidents", is(0)))
                .andExpect(jsonPath("$[1].averageResponseMinutes").value(org.hamcrest.Matchers.nullValue()))
                // P3: the VPN incident (18 minutes) and the HR portal one (12 minutes)
                .andExpect(jsonPath("$[2].averageResponseMinutes", is(15.0)));
        mvc.perform(get("/api/reports/overview").header("Authorization", admin))
                .andExpect(jsonPath("$.averageResponseMinutes", notNullValue()));
        mvc.perform(get("/api/admin/integrations").header("Authorization", admin))
                .andExpect(jsonPath("$[0].name", is("Gemini")))
                .andExpect(jsonPath("$[0].enabled", is(false)));
    }

    @Test
    @DisplayName("TC33 The live-update stream needs a login and then stays open as text/event-stream")
    void liveStream() throws Exception {
        mvc.perform(get("/api/live")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/live").header("Authorization", login("ananya")))
                .andExpect(status().isOk())
                .andExpect(request().asyncStarted())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.startsWith("text/event-stream")));
    }

    @Test
    @DisplayName("TC34 Reporting the same open problem twice is refused (409); another person may report it")
    void repeatedReport() throws Exception {
        String rohan = login("rohan");
        long network = serviceId(rohan, "Corporate Network");
        String report = """
                {"title":"%s","description":"The wifi on floor 3 keeps dropping",
                 "serviceId":%d,"impact":"MEDIUM","urgency":"HIGH","affectedUsers":25}""";

        String first = postJson("/api/incidents", rohan, report.formatted("Office wifi not working", network))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String reference = JsonPath.read(first, "$.reference");

        // Same person, same service, same title (different spacing and case): rejected.
        postJson("/api/incidents", rohan, report.formatted("office  WIFI not working ", network))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString(reference)));

        // A colleague with the same problem is allowed; duplicate detection only links the two.
        postJson("/api/incidents", login("priya"), report.formatted("Office wifi not working", network))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.potentialDuplicateOf", is(reference)));
    }

    @Test
    @DisplayName("TC48 Employees never see other people's incidents through 'similar incidents' or suggested fixes")
    void intelligencePrivacy() throws Exception {
        int priyas = incidentId("Unable to make payment");
        String rohansReference = "INC%04d".formatted(incidentId("Payment application unavailable"));

        mvc.perform(get("/api/incidents/" + priyas + "/similar").header("Authorization", login("priya")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].reference", not(hasItem(rohansReference))));
        mvc.perform(get("/api/incidents/" + priyas + "/similar").header("Authorization", login("vikram")))
                .andExpect(jsonPath("$[*].reference", hasItem(rohansReference)));
        mvc.perform(get("/api/incidents/" + priyas + "/suggested-resolutions").header("Authorization", login("priya")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].reference", everyItem(is("INC%04d".formatted(
                        incidentId("Payment gateway timeout at checkout"))))));
    }

    @Test
    @DisplayName("TC49 A 4000-character note is saved in full; the audit line is shortened instead of failing")
    void longTexts() throws Exception {
        String rohan = login("rohan");
        int id = report(rohan, "Laptop fan very loud", "The fan never stops", "Employee Laptops", "LOW", "LOW", 1);
        String sneha = login("sneha");
        String note = "x".repeat(4000);
        postJson("/api/incidents/" + id + "/notes", sneha, "{\"text\":\"" + note + "\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes[-1].text", is(note)));
        postJson("/api/incidents/" + id + "/comments", rohan, "{\"text\":\"" + "y".repeat(3990) + "\"}")
                .andExpect(status().isOk());
        String audit = mvc.perform(get("/api/incidents/" + id + "/audit").header("Authorization", rohan))
                .andReturn().getResponse().getContentAsString();
        java.util.List<String> descriptions = JsonPath.read(audit, "$[*].description");
        org.assertj.core.api.Assertions.assertThat(descriptions).allMatch(d -> d.length() <= 1000);
    }

    @Test
    @DisplayName("TC50 Every API error is JSON with the right status: 404, 405, 415, 401, and clear 400 messages")
    void errorResponses() throws Exception {
        String rohan = login("rohan");
        mvc.perform(get("/api/does-not-exist").header("Authorization", rohan))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.status", is(404)));
        mvc.perform(delete("/api/incidents/1").header("Authorization", rohan))
                .andExpect(status().isMethodNotAllowed()).andExpect(jsonPath("$.status", is(405)));
        mvc.perform(post("/api/incidents/1/comments").header("Authorization", rohan)
                        .contentType(MediaType.TEXT_PLAIN).content("hello"))
                .andExpect(status().isUnsupportedMediaType());
        mvc.perform(get("/api/incidents/search").param("status", "FOO").header("Authorization", rohan))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", is("'status' has an invalid value 'FOO'")));
        mvc.perform(get("/api/incidents").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)));
        // an old token left in the header does not block logging in again
        mvc.perform(post("/api/auth/login").header("Authorization", "Bearer expired-or-forged")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"rohan\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk());
        postJson("/api/auth/register", "", """
                {"username":"longpass","password":"%s","fullName":"Long Pass","email":"lp@itsm.local"}"""
                .formatted("p".repeat(80)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password", notNullValue()));
    }

    @Test
    @DisplayName("TC51 A P1 report reaches the administrators at once (in-app and e-mail)")
    void highPriorityReportReachesAdmins() throws Exception {
        int id = report(login("rohan"), "Card payments rejected", "Every card payment is rejected",
                "Payment Gateway", "CRITICAL", "CRITICAL", 300);
        String subject = "INC%04d reported: Card payments rejected (P1)".formatted(id);
        mvc.perform(get("/api/notifications").header("Authorization", login("kavita")))
                .andExpect(jsonPath("$[?(@.subject == '" + subject + "')].channel", hasItem("IN_APP")))
                .andExpect(jsonPath("$[?(@.subject == '" + subject + "')].channel", hasItem("EMAIL")));
    }

    @Test
    @DisplayName("TC52 Reopening removes the rejected fix; feedback only after the fix is confirmed, and only once")
    void reopenAndFeedback() throws Exception {
        String rohan = login("rohan");
        int id = report(rohan, "Mouse not detected", "The USB mouse is not detected", "Employee Laptops",
                "LOW", "MEDIUM", 1);
        String sneha = login("sneha");
        postJson("/api/incidents/" + id + "/acknowledge", sneha, "").andExpect(status().isOk());
        postJson("/api/incidents/" + id + "/start", sneha, "").andExpect(status().isOk());
        postJson("/api/incidents/" + id + "/resolve", sneha, "{\"resolution\":\"Replugged it\"}")
                .andExpect(status().isOk());
        postJson("/api/incidents/" + id + "/feedback", rohan, "{\"rating\":5}").andExpect(status().isBadRequest());

        postJson("/api/incidents/" + id + "/reopen", rohan, "{\"reason\":\"Still not detected\"}")
                .andExpect(jsonPath("$.status", is("IN_PROGRESS")))
                .andExpect(jsonPath("$.resolution").doesNotExist());
        postJson("/api/incidents/" + id + "/resolve", sneha, "{\"resolution\":\"Replaced the USB port driver\"}")
                .andExpect(status().isOk());
        postJson("/api/incidents/" + id + "/verify", rohan, "").andExpect(status().isOk());
        postJson("/api/incidents/" + id + "/feedback", rohan, "{\"rating\":4}")
                .andExpect(jsonPath("$.feedbackRating", is(4)));
        postJson("/api/incidents/" + id + "/feedback", rohan, "{\"rating\":1}").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC53 Every re-assessment is in the history, also when the priority stays the same")
    void reassessAudited() throws Exception {
        String rohan = login("rohan");
        int id = report(rohan, "Laptop speaker crackles", "Sound crackles", "Employee Laptops", "LOW", "LOW", 1);
        postJson("/api/incidents/" + id + "/reassess", login("sneha"),
                "{\"impact\":\"LOW\",\"urgency\":\"MEDIUM\",\"affectedUsers\":2}")
                .andExpect(jsonPath("$.priority", is("P4")));
        mvc.perform(get("/api/incidents/" + id + "/audit").header("Authorization", rohan))
                .andExpect(jsonPath("$[*].action", hasItem("REASSESSED")));
    }

    @Test
    @DisplayName("TC54 Correcting an incident: the reporter until work starts; the technician can re-classify it")
    void editIncident() throws Exception {
        String rohan = login("rohan");
        int id = report(rohan, "Screen goes black", "My laptop screen goes black", "Employee Laptops",
                "LOW", "MEDIUM", 1);
        putJson("/api/incidents/" + id, rohan, "{\"title\":\"Laptop screen goes black after lunch\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Laptop screen goes black after lunch")));
        putJson("/api/incidents/" + id, rohan, "{\"categoryId\":1}").andExpect(status().isForbidden());

        String sneha = login("sneha");
        postJson("/api/incidents/" + id + "/acknowledge", sneha, "").andExpect(status().isOk());
        putJson("/api/incidents/" + id, rohan, "{\"title\":\"Too late to edit\"}").andExpect(status().isBadRequest());

        String categories = mvc.perform(get("/api/catalog/categories").header("Authorization", sneha))
                .andReturn().getResponse().getContentAsString();
        Number software = JsonPath.<java.util.List<Number>>read(categories, "$[?(@.name == 'SOFTWARE')].id").get(0);
        putJson("/api/incidents/" + id, sneha, "{\"categoryId\":" + software + "}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category.name", is("SOFTWARE")));
        mvc.perform(get("/api/incidents/" + id + "/audit").header("Authorization", rohan))
                .andExpect(jsonPath("$[?(@.action == 'DETAILS_CHANGED')].description",
                        hasItem(org.hamcrest.Matchers.containsString("category HARDWARE to SOFTWARE"))));
    }

    @Test
    @DisplayName("TC55 User management: edit details, reset and change passwords, all in the audit log")
    void userManagement() throws Exception {
        String kavita = login("kavita");
        String users = mvc.perform(get("/api/admin/users").header("Authorization", kavita))
                .andReturn().getResponse().getContentAsString();
        Number priya = JsonPath.<java.util.List<Number>>read(users, "$[?(@.username == 'priya')].id").get(0);

        putJson("/api/admin/users/" + priya, kavita, "{\"fullName\":\"Priya N. Nair\",\"department\":\"Marketing\"}")
                .andExpect(jsonPath("$.fullName", is("Priya N. Nair")))
                .andExpect(jsonPath("$.department", is("Marketing")));
        putJson("/api/admin/users/" + priya + "/password", kavita, "{\"newPassword\":\"temporary-123\"}")
                .andExpect(status().isOk());

        String priyaToken = "Bearer " + JsonPath.read(mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"priya\",\"password\":\"temporary-123\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), "$.token");
        putJson("/api/auth/password", priyaToken, "{\"currentPassword\":\"wrong-one\",\"newPassword\":\"my-own-pass-1\"}")
                .andExpect(status().isBadRequest());
        putJson("/api/auth/password", priyaToken,
                "{\"currentPassword\":\"temporary-123\",\"newPassword\":\"my-own-pass-1\"}")
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/admin/audit").header("Authorization", kavita))
                .andExpect(jsonPath("$[*].action", hasItem("USER_UPDATED")))
                .andExpect(jsonPath("$[*].action", hasItem("PASSWORD_RESET")))
                .andExpect(jsonPath("$[*].action", hasItem("PASSWORD_CHANGED")));
    }

    @Test
    @DisplayName("TC56 A technician with open work cannot be deactivated; a deactivated account cannot open live updates")
    void deactivation() throws Exception {
        String kavita = login("kavita");
        report(login("rohan"), "Router lights blinking red", "The office router blinks red", "Corporate Network",
                "MEDIUM", "MEDIUM", 5);
        String users = mvc.perform(get("/api/admin/users").header("Authorization", kavita))
                .andReturn().getResponse().getContentAsString();
        Number ananya = JsonPath.<java.util.List<Number>>read(users, "$[?(@.username == 'ananya')].id").get(0);
        mvc.perform(put("/api/admin/users/" + ananya + "/active").param("active", "false")
                        .header("Authorization", kavita))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", org.hamcrest.Matchers.containsString("Reassign")));

        String created = postJson("/api/admin/users", kavita, """
                {"role":"TECHNICIAN","username":"temp.tech","password":"password123","fullName":"Temp Tech",
                 "email":"temp@itsm.local","skills":["network"]}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.skills[0]", is("NETWORK")))
                .andReturn().getResponse().getContentAsString();
        int tempId = JsonPath.read(created, "$.id");
        String tempToken = login("temp.tech");
        mvc.perform(put("/api/admin/users/" + tempId + "/active").param("active", "false")
                        .header("Authorization", kavita))
                .andExpect(jsonPath("$.active", is(false)));
        mvc.perform(get("/api/live").header("Authorization", tempToken)).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/admin/users/" + tempId + "/active").param("active", "true")
                .header("Authorization", kavita));
        postJson("/api/admin/users", kavita, """
                {"role":"TECHNICIAN","username":"bad.skill","password":"password123","fullName":"Bad Skill",
                 "email":"bad@itsm.local","skills":["COFFEE"]}""")
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC57 The chosen strategy is saved and every switch is in the audit log")
    void strategySaved() throws Exception {
        String admin = login("kavita");
        putJson("/api/admin/strategies/priority", admin, "{\"name\":\"ITIL_MATRIX\"}").andExpect(status().isOk());
        org.assertj.core.api.Assertions.assertThat(settings.findById("priority-strategy"))
                .hasValueSatisfying(s -> org.assertj.core.api.Assertions.assertThat(s.getValue()).isEqualTo("ITIL_MATRIX"));
        postJson("/api/incidents/priority-preview", login("rohan"), """
                {"serviceId":%d,"impact":"HIGH","urgency":"HIGH","affectedUsers":10}"""
                .formatted(serviceId(admin, "Email")))
                .andExpect(jsonPath("$.priority", is("P2")));            // ITIL: 3 + 3 = 6
        mvc.perform(get("/api/admin/audit").header("Authorization", admin))
                .andExpect(jsonPath("$[?(@.action == 'STRATEGY_CHANGED')].description",
                        hasItem("Priority strategy changed from WEIGHTED to ITIL_MATRIX")));
        putJson("/api/admin/strategies/priority", admin, "{\"name\":\"WEIGHTED\"}");   // back for the other tests
    }

    @Test
    @DisplayName("TC58 Search: open incidents only, the user's own time zone, and % or _ are not wildcards")
    void searchOptions() throws Exception {
        String admin = login("kavita");
        mvc.perform(get("/api/incidents/search").param("open", "true").header("Authorization", admin))
                .andExpect(jsonPath("$[*].status", everyItem(org.hamcrest.Matchers.oneOf(
                        "NEW", "CLASSIFIED", "ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS"))));
        mvc.perform(get("/api/incidents/search").param("keyword", "_").header("Authorization", admin))
                .andExpect(jsonPath("$.length()", is(0)));
        mvc.perform(get("/api/incidents/search").param("createdFrom", "2020-01-01")
                        .param("timeZone", "America/Los_Angeles").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", org.hamcrest.Matchers.greaterThan(0)));
    }
}
