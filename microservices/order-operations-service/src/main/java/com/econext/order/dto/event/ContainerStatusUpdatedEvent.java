package com.econext.order.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContainerStatusUpdatedEvent implements Serializable {

    @Builder.Default
    private String eventId = java.util.UUID.randomUUID().toString();

    @Builder.Default
    private String eventType = "CONTAINER_STATUS_UPDATED";

    private Long containerId;
    private String containerCode;
    private String status;
    private String previousStatus;
    private String origin;
    private String destination;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
