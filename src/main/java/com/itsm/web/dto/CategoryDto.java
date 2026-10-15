package com.itsm.web.dto;

import com.itsm.model.Category;

public record CategoryDto(Long id, String name, String description, String keywords, boolean active) {

    public static CategoryDto from(Category c) {
        return new CategoryDto(c.getId(), c.getName(), c.getDescription(), c.getKeywords(), c.isActive());
    }
}
