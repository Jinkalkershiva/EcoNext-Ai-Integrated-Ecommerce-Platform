package com.econext.notification.controller;

import com.econext.notification.dto.ApiResponse;
import com.econext.notification.dto.NotificationDto;
import com.econext.notification.dto.NotificationRequest;
import com.econext.notification.security.UserPrincipal;
import com.econext.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getMyNotifications(
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("Fetching notifications for user id: {}", principal.getId());
        List<NotificationDto> list = notificationService.getUserNotifications(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved", list));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        long count = notificationService.getUnreadCount(principal.getId());
        Map<String, Object> data = new HashMap<>();
        data.put("unread_count", count);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationDto>> markRead(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        NotificationDto updated = notificationService.markAsRead(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Marked as read", updated));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> markAllRead(
            @AuthenticationPrincipal UserPrincipal principal) {
        int count = notificationService.markAllAsRead(principal.getId());
        Map<String, Object> data = new HashMap<>();
        data.put("updated_count", count);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", data));
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<NotificationDto>> sendNotification(
            @Valid @RequestBody NotificationRequest request) {
        log.info("Sending direct notification to user id: {}", request.getUserId());
        NotificationDto created = notificationService.createNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Notification created successfully", created));
    }

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getAllAdmin(
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("Admin {} fetching all system notifications", principal.getUsername());
        List<NotificationDto> list = notificationService.getAllNotificationsAdmin();
        return ResponseEntity.ok(ApiResponse.success("All notifications retrieved", list));
    }
}
