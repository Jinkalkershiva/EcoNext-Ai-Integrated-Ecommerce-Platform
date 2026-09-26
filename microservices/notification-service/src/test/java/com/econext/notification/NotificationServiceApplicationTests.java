package com.econext.notification;

import com.econext.notification.dto.NotificationDto;
import com.econext.notification.dto.NotificationRequest;
import com.econext.notification.service.NotificationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class NotificationServiceApplicationTests {

    @Autowired
    private NotificationService notificationService;

    @Test
    @DisplayName("Context loads successfully")
    void contextLoads() {
        assertNotNull(notificationService);
    }

    @Test
    @DisplayName("Should create and retrieve notifications for user")
    void shouldCreateAndRetrieveNotifications() {
        Long userId = 999L;

        NotificationRequest req1 = NotificationRequest.builder()
                .userId(userId)
                .type("ORDER_CREATED")
                .title("Order Confirmed")
                .message("Your order #101 is confirmed.")
                .referenceId("ORDER-101")
                .build();

        NotificationRequest req2 = NotificationRequest.builder()
                .userId(userId)
                .type("PAYMENT_SUCCESS")
                .title("Payment Received")
                .message("Payment of ₹499 received.")
                .referenceId("PAY-202")
                .build();

        NotificationDto notif1 = notificationService.createNotification(req1);
        NotificationDto notif2 = notificationService.createNotification(req2);

        assertNotNull(notif1.getId());
        assertNotNull(notif2.getId());

        List<NotificationDto> userNotifs = notificationService.getUserNotifications(userId);
        assertTrue(userNotifs.size() >= 2);

        long unreadCount = notificationService.getUnreadCount(userId);
        assertTrue(unreadCount >= 2);

        // Mark first read
        NotificationDto updated = notificationService.markAsRead(notif1.getId(), userId);
        assertTrue(updated.isRead());

        // Mark all read
        int marked = notificationService.markAllAsRead(userId);
        assertTrue(marked >= 1);
        assertEquals(0, notificationService.getUnreadCount(userId));
    }
}
