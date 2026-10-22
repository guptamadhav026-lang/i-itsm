package com.itsm.intelligence;

import java.util.List;

/**
 * Result of automatic categorisation: which category, and why.
 * source is "keywords" when the category's keywords matched, or the AI service's name (e.g. "Gemini").
 */
public record CategorySuggestion(Long categoryId, String categoryName, int matches, List<String> matchedKeywords,
                                 String source) {

    public static final String KEYWORDS = "keywords";

    public boolean fromAi() {
        return !KEYWORDS.equals(source);
    }
}
