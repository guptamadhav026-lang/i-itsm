package com.itsm.intelligence;

import com.itsm.TestData;
import com.itsm.model.Category;
import com.itsm.model.Impact;
import com.itsm.model.Incident;
import com.itsm.model.ItService;
import com.itsm.model.Urgency;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/** Tests of the "intelligent" features. */
class IntelligenceTest {

    private final ItService payment = TestData.service(1, "Payment Gateway", 5);
    private final ItService email = TestData.service(2, "Email", 3);

    @Test
    @DisplayName("TC17 Duplicate detection: 'Payment application unavailable' ≈ 'Unable to make payment'")
    void duplicates() {
        Incident original = TestData.incident(1, "Payment application unavailable",
                "The payment application is down, every transaction fails", payment, Impact.HIGH, Urgency.HIGH, 50);
        Incident newOne = TestData.incident(2, "Unable to make payment",
                "The payment app shows an error and the transaction fails", payment, Impact.HIGH, Urgency.HIGH, 5);
        Incident unrelated = TestData.incident(3, "Printer out of toner",
                "Third floor printer needs toner", email, Impact.LOW, Urgency.LOW, 1);

        List<SimilarIncident> similar = new DuplicateDetector().findSimilar(newOne, List.of(original, unrelated, newOne));

        assertThat(similar).extracting(SimilarIncident::incidentId).containsExactly(1L);
        assertThat(similar.get(0).score()).isGreaterThanOrEqualTo(DuplicateDetector.THRESHOLD);
    }

    @Test
    @DisplayName("TC18 Synonyms are understood: 'login' ≈ 'sign in', 'down' ≈ 'unavailable'")
    void synonyms() {
        assertThat(TextAnalyzer.keywords("Cannot sign in")).contains("login");
        assertThat(TextAnalyzer.similarity("Email server down", "email unavailable")).isGreaterThan(0.5);
    }

    @Test
    @DisplayName("TC19 Automatic categorisation picks the category with most keyword matches")
    void categorisation() {
        List<Category> categories = List.of(
                TestData.category(1, "NETWORK", "vpn, wifi, network"),
                TestData.category(2, "HARDWARE", "laptop, battery, printer"));
        Optional<CategorySuggestion> suggestion = new IncidentCategorizer(TestData.noAi())
                .suggest("My VPN disconnects when the wifi is weak", categories);
        assertThat(suggestion).isPresent();
        assertThat(suggestion.get().categoryName()).isEqualTo("NETWORK");
        assertThat(suggestion.get().matchedKeywords()).containsExactlyInAnyOrder("vpn", "wifi");
        assertThat(new IncidentCategorizer(TestData.noAi()).suggest("Something odd happened", categories)).isEmpty();
    }

    @Test
    @DisplayName("TC20 Correlation groups several open incidents on the same service")
    void correlation() {
        Incident a = TestData.incident(1, "Payments failing", "x", payment, Impact.HIGH, Urgency.HIGH, 10);
        Incident b = TestData.incident(2, "Checkout broken", "y", payment, Impact.HIGH, Urgency.HIGH, 10);
        Incident c = TestData.incident(3, "Mailbox full", "z", email, Impact.LOW, Urgency.LOW, 1);

        List<CorrelationCluster> clusters = new IncidentCorrelator().correlate(List.of(a, b, c));

        assertThat(clusters).hasSize(1);
        assertThat(clusters.get(0).serviceName()).isEqualTo("Payment Gateway");
        assertThat(clusters.get(0).incidentCount()).isEqualTo(2);
    }
}
