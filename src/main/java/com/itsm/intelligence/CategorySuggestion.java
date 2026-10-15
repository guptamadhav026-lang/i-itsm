package com.itsm.intelligence;

import java.util.List;

/** Result of automatic categorisation: which category and which keywords led to it. */
public record CategorySuggestion(Long categoryId, String categoryName, int matches, List<String> matchedKeywords) {
}
