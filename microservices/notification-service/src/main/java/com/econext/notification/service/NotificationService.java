package com.econext.notification.service;

import com.econext.notification.dto.NotificationDto;
import com.econext.notification.dto.NotificationRequest;

import java.util.List;

public interface NotificationService {

    List<NotificationDto> getUserNotifications(Long userId);

    long getUnreadCount(Long userId);

    NotificationDto markAsRead(Long notificationId, Long userId);

    int markAllAsRead(Long userId);

    NotificationDto createNotification(NotificationRequest request);

    List<NotificationDto> getAllNotificationsAdmin();
}
