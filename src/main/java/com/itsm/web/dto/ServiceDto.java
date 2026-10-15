package com.itsm.web.dto;

import com.itsm.model.ItService;

public record ServiceDto(Long id, String name, String description, int businessCriticality, boolean active) {

    public static ServiceDto from(ItService s) {
        return new ServiceDto(s.getId(), s.getName(), s.getDescription(), s.getBusinessCriticality(), s.isActive());
    }
}
