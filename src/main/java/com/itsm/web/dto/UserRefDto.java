package com.itsm.web.dto;

import com.itsm.model.User;

/** A short reference to a user, used inside other responses. */
public record UserRefDto(Long id, String username, String fullName) {

    public static UserRefDto from(User user) {
        return user == null ? null : new UserRefDto(user.getId(), user.getUsername(), user.getFullName());
    }
}
