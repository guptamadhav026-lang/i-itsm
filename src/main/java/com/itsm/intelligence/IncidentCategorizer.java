package com.itsm.intelligence;

import com.itsm.exception.NetworkFailureException;
import com.itsm.integration.AiCategoryAdvisor;
import com.itsm.model.Category;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Intelligent feature F: automatic categorisation.
 * Each category stores keywords (configurable by the admin). The category whose keywords
 * appear most often in the incident's title and description is suggested.
 * "My VPN keeps disconnecting" -> NETWORK because "vpn" is a NETWORK keyword.
 *
 * When an AI service is configured, a new incident is first given to it (it understands sentences with none
 * of our keywords). If it is down or gives an answer we cannot use, the keyword match is used as before.
 */
@Component
public class IncidentCategorizer {

    private static final Logger log = LoggerFactory.getLogger(IncidentCategorizer.class);

    private final AiCategoryAdvisor ai;

    public IncidentCategorizer(AiCategoryAdvisor ai) {
        this.ai = ai;
    }

    /** Used when an incident is reported: asks the AI service first if there is one, then the keywords. */
    public Optional<CategorySuggestion> categorize(String text, List<Category> categories) {
        if (ai.isEnabled()) {
            try {
                Optional<String> picked = ai.pickCategory(text, categories);
                Optional<Category> category = picked.flatMap(name -> categories.stream()
                        .filter(c -> c.getName().equalsIgnoreCase(name)).findFirst());
                if (category.isPresent()) {
                    CategorySuggestion keywords = match(category.get(), " " + normalise(text) + " ");
                    return Optional.of(new CategorySuggestion(category.get().getId(), category.get().getName(),
                            keywords.matches(), keywords.matchedKeywords(), ai.name()));
                }
            } catch (NetworkFailureException e) {
                log.warn("{}; using keywords instead", e.getMessage());
            }
        }
        return suggest(text, categories);
    }

    /** Keywords only. Fast and free, so it is also used for the live preview while the user types. */
    public Optional<CategorySuggestion> suggest(String text, List<Category> categories) {
        String normalised = " " + normalise(text) + " ";
        return categories.stream()
                .map(category -> match(category, normalised))
                .filter(s -> s.matches() > 0)
                .max(Comparator.comparingInt(CategorySuggestion::matches));
    }

    private CategorySuggestion match(Category category, String normalisedText) {
        List<String> matched = new ArrayList<>();
        for (String keyword : category.keywordList()) {
            String k = normalise(keyword);
            if (!k.isEmpty() && (normalisedText.contains(" " + k + " ") || normalisedText.contains(" " + k + "s "))) {
                matched.add(keyword);
            }
        }
        return new CategorySuggestion(category.getId(), category.getName(), matched.size(), matched,
                CategorySuggestion.KEYWORDS);
    }

    private static String normalise(String text) {
        return text == null ? "" : text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }
}
