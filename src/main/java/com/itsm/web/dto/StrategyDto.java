package com.itsm.web.dto;

import com.itsm.strategy.NamedStrategy;

public record StrategyDto(String name, String description, boolean active) {

    public static StrategyDto from(NamedStrategy s, String activeName) {
        return new StrategyDto(s.name(), s.description(), s.name().equals(activeName));
    }
}
