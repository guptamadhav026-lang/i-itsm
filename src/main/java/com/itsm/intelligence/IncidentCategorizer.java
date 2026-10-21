package com.itsm.intelligence;

import com.itsm.model.Category;
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
 */
@Component
public class IncidentCategorizer {

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
        return new CategorySuggestion(category.getId(), category.getName(), matched.size(), matched);
    }

    private static String normalise(String text) {
        return text == null ? "" : text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }
}
