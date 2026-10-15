package com.itsm.model;

import jakarta.persistence.*;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Incident category (NETWORK, DATABASE...).
 * Categories are data, not an enum, so an administrator can add a new one at runtime
 * without changing any code - exactly what the brief asks for. The keywords drive
 * the automatic categorisation feature.
 */
@Entity
@Table(name = "category")
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(length = 500)
    private String description;

    /** Comma-separated words that suggest this category, e.g. "vpn, wifi, router". */
    @Column(length = 2000)
    private String keywords;

    private boolean active = true;

    protected Category() {
    }

    public Category(String name, String description, String keywords) {
        this.name = name.trim().toUpperCase(Locale.ROOT);
        this.description = description;
        this.keywords = keywords;
    }

    public List<String> keywordList() {
        if (keywords == null || keywords.isBlank()) {
            return List.of();
        }
        return Arrays.stream(keywords.split(","))
                .map(k -> k.trim().toLowerCase(Locale.ROOT))
                .filter(k -> !k.isEmpty())
                .toList();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getKeywords() { return keywords; }
    public boolean isActive() { return active; }

    public void setDescription(String description) { this.description = description; }
    public void setKeywords(String keywords) { this.keywords = keywords; }
    public void setActive(boolean active) { this.active = active; }
}
