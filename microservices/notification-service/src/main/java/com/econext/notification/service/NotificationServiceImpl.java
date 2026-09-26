package com.econext.notification.service;

import com.econext.notification.dto.NotificationDto;
import com.econext.notification.dto.NotificationRequest;
import com.econext.notification.entity.Notification;
import com.econext.notification.exception.ResourceNotFoundException;
import com.econext.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDto> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public NotificationDto markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + notificationId));

        if (!notification.getUserId().equals(userId)) {
            throw new IllegalArgumentException("User not authorized to update this notification");
        }

        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);
        log.info("Marked notification id {} as read for user {}", notificationId, userId);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public int markAllAsRead(Long userId) {
        int updated = notificationRepository.markAllAsReadForUser(userId);
        log.info("Marked {} notifications as read for user {}", updated, userId);
        return updated;
    }

    @Override
    @Transactional
    public NotificationDto createNotification(NotificationRequest request) {
        Notification notification = Notification.builder()
                .userId(request.getUserId())
                .type(request.getType())
                .title(request.getTitle())
                .message(request.getMessage())
                .referenceId(request.getReferenceId())
                .isRead(false)
                .build();

        Notification saved = notificationRepository.save(notification);
        log.info("Created notification for user {}: {}", request.getUserId(), request.getTitle());
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDto> getAllNotificationsAdmin() {
        return notificationRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private NotificationDto mapToDto(Notification entity) {
        return NotificationDto.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .type(entity.getType())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .referenceId(entity.getReferenceId())
                .isRead(entity.isRead())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
