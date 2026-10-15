package com.itsm.intelligence;

import com.itsm.model.Incident;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * INTELLIGENT FEATURE A - duplicate incident detection.
 * Compares a new incident with other open incidents:
 * <pre>
 *   score = 0.6 × similarity of titles + 0.4 × similarity of title+description + 0.15 if same IT service
 * </pre>
 * Anything scoring at least {@value #THRESHOLD} is reported as a possible duplicate.
 * "Payment application unavailable", "Payment transaction failing" and "Unable to make payment"
 * all reduce to the words {payment, failure, ...} and are therefore linked.
 */
@Component
public class DuplicateDetector {

    public static final double THRESHOLD = 0.45;

    public List<SimilarIncident> findSimilar(Incident incident, Collection<Incident> candidates) {
        return candidates.stream()
                .filter(other -> !Objects.equals(other.getId(), incident.getId()))
                .map(other -> new SimilarIncident(other.getId(), other.getReference(), other.getTitle(),
                        other.getStatus(), round(score(incident, other))))
                .filter(s -> s.score() >= THRESHOLD)
                .sorted(Comparator.comparingDouble(SimilarIncident::score).reversed())
                .toList();
    }

    public double score(Incident a, Incident b) {
        double titleSimilarity = TextAnalyzer.similarity(a.getTitle(), b.getTitle());
        double fullSimilarity = TextAnalyzer.similarity(
                a.getTitle() + " " + a.getDescription(), b.getTitle() + " " + b.getDescription());
        boolean sameService = a.getService() != null && b.getService() != null
                && Objects.equals(a.getService().getId(), b.getService().getId());
        return Math.min(1.0, 0.6 * titleSimilarity + 0.4 * fullSimilarity + (sameService ? 0.15 : 0.0));
    }

    private static double round(double value) {
        return Math.round(value * 100) / 100.0;
    }
}
