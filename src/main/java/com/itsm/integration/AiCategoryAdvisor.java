package com.itsm.integration;

import com.itsm.model.Category;

import java.util.List;
import java.util.Optional;

/**
 * An outside AI service that reads an incident and picks one of our categories.
 * The categoriser only knows this interface, not which AI service is behind it.
 */
public interface AiCategoryAdvisor {

    /** False when the service is not configured (for example, no API key), so it is never called. */
    boolean isEnabled();

    /** Shown to users, e.g. "Gemini". */
    String name();

    /**
     * The name of the category the AI chose, or empty if its answer did not match any category.
     * Throws NetworkFailureException when the service cannot be reached.
     */
    Optional<String> pickCategory(String text, List<Category> categories);
}
