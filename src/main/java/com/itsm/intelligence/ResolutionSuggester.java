package com.itsm.intelligence;

import com.itsm.model.Incident;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Intelligent feature G: suggested resolution.
 * Looks through past incidents that already have a resolution and returns the fixes of the
 * most similar ones, so a technician can reuse what worked before (a simple knowledge base).
 */
@Component
public class ResolutionSuggester {

    static final double MIN_SCORE = 0.2;
    static final int MAX_SUGGESTIONS = 3;

    public List<SuggestedResolution> suggest(Incident incident, Collection<Incident> resolvedIncidents) {
        String text = incident.getTitle() + " " + incident.getDescription();
        return resolvedIncidents.stream()
                .filter(past -> past.getResolution() != null)
                .map(past -> new SuggestedResolution(past.getId(), past.getReference(), past.getTitle(),
                        past.getResolution(), Math.round(score(incident, text, past) * 100) / 100.0))
                .filter(s -> s.score() >= MIN_SCORE)
                .sorted(Comparator.comparingDouble(SuggestedResolution::score).reversed())
                .limit(MAX_SUGGESTIONS)
                .toList();
    }

    private double score(Incident incident, String text, Incident past) {
        double similarity = TextAnalyzer.similarity(text, past.getTitle() + " " + past.getDescription());
        boolean sameCategory = incident.getCategory() != null && past.getCategory() != null
                && Objects.equals(incident.getCategory().getId(), past.getCategory().getId());
        boolean sameService = Objects.equals(incident.getService().getId(), past.getService().getId());
        return Math.min(1.0, similarity + (sameCategory ? 0.15 : 0) + (sameService ? 0.1 : 0));
    }
}
