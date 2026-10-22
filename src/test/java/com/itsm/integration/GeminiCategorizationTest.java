package com.itsm.integration;

import com.itsm.TestData;
import com.itsm.exception.NetworkFailureException;
import com.itsm.intelligence.CategorySuggestion;
import com.itsm.intelligence.IncidentCategorizer;
import com.itsm.model.Category;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServiceUnavailable;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** The Gemini adapter is tested against a fake HTTP server, so no API key or internet is needed. */
class GeminiCategorizationTest {

    private final List<Category> categories = List.of(
            TestData.category(1, "NETWORK", "vpn, wifi, network"),
            TestData.category(2, "SECURITY", "virus, phishing, malware"));

    @Test
    @DisplayName("TC40 Gemini adapter sends the ticket with the key and reads the category from the answer")
    void geminiAnswerIsRead() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://gemini.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://gemini.test/v1beta/models/test-model:generateContent"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("x-goog-api-key", "secret-key"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("A strange e-mail asked for my password")))
                .andRespond(withSuccess("""
                        {"candidates": [{"content": {"role": "model", "parts": [{"text": "**SECURITY**\\n"}]},
                          "finishReason": "STOP"}], "usageMetadata": {"totalTokenCount": 120}}
                        """, MediaType.APPLICATION_JSON));

        GeminiCategoryAdvisor gemini = new GeminiCategoryAdvisor("secret-key", "test-model", builder);

        assertThat(gemini.isEnabled()).isTrue();
        assertThat(gemini.pickCategory("A strange e-mail asked for my password", categories)).contains("SECURITY");
        server.verify();
    }

    @Test
    @DisplayName("TC41 Gemini down: NetworkFailureException from the adapter; without a key it is never called")
    void geminiDownOrOff() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://gemini.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://gemini.test/v1beta/models/test-model:generateContent"))
                .andRespond(withServiceUnavailable());

        GeminiCategoryAdvisor gemini = new GeminiCategoryAdvisor("secret-key", "test-model", builder);
        assertThatThrownBy(() -> gemini.pickCategory("VPN drops", categories))
                .isInstanceOf(NetworkFailureException.class);

        GeminiCategoryAdvisor noKey = new GeminiCategoryAdvisor("", "test-model", RestClient.builder());
        assertThat(noKey.isEnabled()).isFalse();
        assertThat(noKey.pickCategory("VPN drops", categories)).isEmpty();
    }

    @Test
    @DisplayName("TC42 Categoriser uses the AI's choice, and falls back to keywords if the AI is down or answers nonsense")
    void categoriserFallsBack() {
        String text = "My VPN disconnects, maybe a virus?";

        Optional<CategorySuggestion> byAi = new IncidentCategorizer(TestData.fakeAi("SECURITY", false))
                .categorize(text, categories);
        assertThat(byAi).isPresent();
        assertThat(byAi.get().categoryName()).isEqualTo("SECURITY");
        assertThat(byAi.get().source()).isEqualTo("Fake AI");

        Optional<CategorySuggestion> aiDown = new IncidentCategorizer(TestData.fakeAi(null, true))
                .categorize(text, categories);
        assertThat(aiDown.get().categoryName()).isEqualTo("NETWORK");
        assertThat(aiDown.get().source()).isEqualTo(CategorySuggestion.KEYWORDS);

        Optional<CategorySuggestion> nonsense = new IncidentCategorizer(TestData.fakeAi("PLUMBING", false))
                .categorize(text, categories);
        assertThat(nonsense.get().categoryName()).isEqualTo("NETWORK");
    }
}
