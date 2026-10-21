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
}
