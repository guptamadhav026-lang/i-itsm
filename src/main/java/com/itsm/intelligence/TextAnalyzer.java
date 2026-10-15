package com.itsm.intelligence;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Small text-processing toolkit used by the "intelligent" features. No AI library needed:
 * <ol>
 *   <li>split text into lower-case words,</li>
 *   <li>drop filler words ("the", "is", "to"...),</li>
 *   <li>map words that mean the same thing onto one word ("down", "unavailable", "failing" → "failure"),</li>
 *   <li>compare two word sets with the Jaccard similarity: |A ∩ B| / |A ∪ B| (0 = nothing shared, 1 = identical).</li>
 * </ol>
 */
public final class TextAnalyzer {

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "the", "is", "are", "was", "were", "be", "been", "to", "of", "in", "on", "for", "and",
            "or", "with", "my", "our", "we", "i", "it", "its", "this", "that", "at", "from", "by", "as", "has",
            "have", "had", "me", "us", "you", "your", "any", "all", "some", "please", "since", "when", "while",
            "after", "before", "again", "still", "very", "too", "also", "so", "just", "now", "today", "getting",
            "get", "gets", "being", "there", "their", "they", "them", "can", "could", "will", "would", "make",
            "making", "do", "does", "did", "am", "not", "no");

    private static final Map<String, String> SYNONYMS = new HashMap<>();

    static {
        synonyms("failure", "down", "unavailable", "offline", "outage", "failing", "fail", "fails", "failed",
                "failure", "failures", "broken", "unable", "cannot", "cant", "crash", "crashed", "crashing",
                "crashes", "error", "errors", "unreachable", "timeout", "timeouts", "working", "stopped");
        synonyms("payment", "pay", "payment", "payments", "transaction", "transactions", "checkout", "billing");
        synonyms("login", "login", "logon", "signin", "sign", "log", "logging", "authenticate", "authentication");
        synonyms("slow", "slow", "slowness", "lag", "lagging", "latency", "sluggish", "performance");
        synonyms("application", "app", "apps", "application", "applications", "portal", "website", "site");
        synonyms("password", "password", "passwords", "credential", "credentials", "pwd");
        synonyms("email", "email", "emails", "mail", "outlook", "mailbox");
        synonyms("network", "network", "internet", "wifi", "connectivity", "connection", "connect", "connecting");
    }

    private TextAnalyzer() {
    }

    private static void synonyms(String canonical, String... words) {
        for (String word : words) {
            SYNONYMS.put(word, canonical);
        }
    }

    /** The set of meaningful, normalised words in a piece of text. */
    public static Set<String> keywords(String text) {
        Set<String> result = new HashSet<>();
        if (text == null) {
            return result;
        }
        for (String raw : text.toLowerCase(Locale.ROOT).split("[^a-z0-9]+")) {
            if (raw.length() < 2 || STOP_WORDS.contains(raw)) {
                continue;
            }
            String word = SYNONYMS.getOrDefault(raw, stem(raw));
            result.add(SYNONYMS.getOrDefault(word, word));
        }
        return result;
    }

    /** Jaccard similarity of two word sets, from 0.0 to 1.0. */
    public static double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() || b.isEmpty()) {
            return 0.0;
        }
        Set<String> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return (double) intersection.size() / union.size();
    }

    public static double similarity(String textA, String textB) {
        return jaccard(keywords(textA), keywords(textB));
    }

    /** Very small stemmer: "printers" → "printer", "crashing" stays mapped by SYNONYMS. */
    private static String stem(String word) {
        if (word.length() > 4 && word.endsWith("ies")) {
            return word.substring(0, word.length() - 3) + "y";
        }
        if (word.length() > 3 && word.endsWith("s") && !word.endsWith("ss")) {
            return word.substring(0, word.length() - 1);
        }
        return word;
    }
}
