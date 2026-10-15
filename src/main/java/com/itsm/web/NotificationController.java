package com.itsm.web;

import com.itsm.notification.NotificationService;
import com.itsm.security.CurrentUser;
import com.itsm.web.dto.NotificationDto;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "7. Notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUser currentUser;

    public NotificationController(NotificationService notificationService, CurrentUser currentUser) {
        this.notificationService = notificationService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<NotificationDto> mine(Authentication auth) {
        return notificationService.forUser(currentUser.from(auth)).stream().map(NotificationDto::from).toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Authentication auth) {
        return Map.of("unread", notificationService.unreadCount(currentUser.from(auth)));
    }

    @PostMapping("/{id}/read")
    public NotificationDto markRead(@PathVariable Long id, Authentication auth) {
        return NotificationDto.from(notificationService.markRead(id, currentUser.from(auth)));
    }
}
