package com.econext.notification.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationDto {

    private Long id;

    @JsonProperty("user_id")
    private Long userId;

    private String type;
    private String title;
    private String message;

    @JsonProperty("reference_id")
    private String referenceId;

    @JsonProperty("is_read")
    private boolean isRead;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;
}
