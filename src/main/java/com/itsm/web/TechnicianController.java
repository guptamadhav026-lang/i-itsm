package com.itsm.web;

import com.itsm.security.CurrentUser;
import com.itsm.service.UserService;
import com.itsm.web.dto.AvailabilityRequest;
import com.itsm.web.dto.UserDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/technician")
@PreAuthorize("hasRole('TECHNICIAN')")
@Tag(name = "4. Technician")
public class TechnicianController {

    private final UserService userService;
    private final CurrentUser currentUser;

    public TechnicianController(UserService userService, CurrentUser currentUser) {
        this.userService = userService;
        this.currentUser = currentUser;
    }

    @PutMapping("/availability")
    @Operation(summary = "Mark yourself available or unavailable for new assignments")
    public UserDto setAvailability(@Valid @RequestBody AvailabilityRequest request, Authentication auth) {
        return UserDto.from(userService.setAvailability(currentUser.from(auth), request.available()));
    }
}
