package com.itsm.integration;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.itsm.exception.NetworkFailureException;
import com.itsm.model.Category;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Adapter between our AiCategoryAdvisor contract and Google's Gemini API (the generateContent REST call).
 * Nothing else in the code sees Gemini's request or response format, so another AI service could be used
 * by writing one more adapter. It stays switched off until an API key is set (GEMINI_API_KEY).
 */
@Component
public class GeminiCategoryAdvisor implements AiCategoryAdvisor {

    private static final Logger log = LoggerFactory.getLogger(GeminiCategoryAdvisor.class);
    private static final int MAX_TEXT_LENGTH = 2000;

    private final String apiKey;
    private final String model;
    private final RestClient client;

    @Autowired
    public GeminiCategoryAdvisor(@Value("${itsm.ai.gemini.api-key:}") String apiKey,
                                 @Value("${itsm.ai.gemini.model}") String model,
                                 @Value("${itsm.ai.gemini.base-url}") String baseUrl) {
        this(apiKey, model, RestClient.builder().baseUrl(baseUrl).requestFactory(withTimeouts()));
    }

    /** Used by tests to plug in a fake server. */
    GeminiCategoryAdvisor(String apiKey, String model, RestClient.Builder builder) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;
        this.client = builder.build();
    }

    // Reporting an incident must not hang because Google is slow; after this we fall back to keywords.
    private static SimpleClientHttpRequestFactory withTimeouts() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        return factory;
    }

    @Override
    public boolean isEnabled() {
        return !apiKey.isEmpty();
    }

    @Override
    public String name() {
        return "Gemini";
    }

    public String getModel() {
        return model;
    }

    @Override
    public Optional<String> pickCategory(String text, List<Category> categories) {
        if (!isEnabled() || categories.isEmpty()) {
            return Optional.empty();
        }
        GenerateRequest request = new GenerateRequest(
                List.of(new Content("user", List.of(new Part(prompt(text, categories))))));
        GenerateResponse response;
        try {
            response = client.post()
                    .uri("/v1beta/models/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(GenerateResponse.class);
        } catch (RestClientException e) {
            throw new NetworkFailureException("Gemini could not be reached: " + e.getMessage());
        }
        String answer = response == null ? "" : response.text();
        Optional<String> category = matchCategory(answer, categories);
        if (category.isEmpty()) {
            log.warn("Gemini answered '{}', which is not one of our categories", answer.strip());
        }
        return category;
    }

    static String prompt(String text, List<Category> categories) {
        String list = categories.stream()
                .map(c -> "- " + c.getName() + ": " + c.getDescription())
                .collect(Collectors.joining("\n"));
        String ticket = text.length() > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;
        return "You sort IT support tickets for a company service desk into categories.\n"
                + "Categories:\n" + list + "\n\n"
                + "Ticket:\n\"\"\"\n" + ticket + "\n\"\"\"\n\n"
                + "Reply with the one category name from the list that fits best, written exactly as in the list, "
                + "and nothing else.";
    }

    /** Finds our category name in the answer, which may come back as "Network", "**NETWORK**" or "NETWORK.". */
    static Optional<String> matchCategory(String answer, List<Category> categories) {
        String words = " " + answer.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]+", " ").trim() + " ";
        return categories.stream()
                .map(Category::getName)
                .filter(name -> words.contains(" " + name.toUpperCase(Locale.ROOT) + " "))
                .findFirst();
    }

    // The parts of Gemini's JSON format we use. Unknown fields in the answer are ignored.

    record GenerateRequest(List<Content> contents) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Content(String role, List<Part> parts) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Part(String text) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Candidate(Content content) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record GenerateResponse(List<Candidate> candidates) {

        String text() {
            if (candidates == null || candidates.isEmpty() || candidates.get(0).content() == null
                    || candidates.get(0).content().parts() == null) {
                return "";
            }
            return candidates.get(0).content().parts().stream()
                    .map(Part::text)
                    .filter(t -> t != null)
                    .collect(Collectors.joining(" "));
        }
    }
}
