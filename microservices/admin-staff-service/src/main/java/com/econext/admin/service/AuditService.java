package com.econext.admin.service;

import com.econext.admin.dto.request.AuditLogCreateRequest;
import com.econext.admin.dto.response.AuditLogResponse;
import com.econext.admin.dto.response.StaffActivityMetricResponse;
import com.econext.admin.entity.AuditLog;
import com.econext.admin.entity.StaffMember;
import com.econext.admin.repository.AuditLogRepository;
import com.econext.admin.repository.StaffMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditRepository;
    private final StaffMemberRepository staffRepository;

    @Transactional
    public AuditLogResponse recordAudit(
            Long actorId,
            String actorUsername,
            String actorRole,
            String action,
            String resourceType,
            String resourceId,
            String details,
            String ipAddress
    ) {
        AuditLog logEntry = AuditLog.builder()
                .actorId(actorId)
                .actorUsername(actorUsername != null ? actorUsername : "system")
                .actorRole(actorRole != null ? actorRole : "SYSTEM")
                .action(action)
                .resourceType(resourceType)
                .resourceId(resourceId)
                .details(details)
                .ipAddress(ipAddress)
                .build();

        AuditLog saved = auditRepository.save(logEntry);
        return mapToResponse(saved);
    }

    @Transactional
    public AuditLogResponse recordAuditFromRequest(AuditLogCreateRequest request) {
        return recordAudit(
                request.getActorId(),
                request.getActorUsername(),
                request.getActorRole(),
                request.getAction(),
                request.getResourceType(),
                request.getResourceId(),
                request.getDetails(),
                request.getIpAddress()
        );
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> searchAuditLogs(
            String actor,
            String action,
            String resourceType,
            LocalDateTime fromTime,
            LocalDateTime toTime,
            Pageable pageable
    ) {
        return auditRepository.searchLogs(actor, action, resourceType, fromTime, toTime, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getRecentActivity() {
        return auditRepository.findTop10ByOrderByTimestampDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StaffActivityMetricResponse> getStaffActivityMetrics() {
        List<StaffMember> staffMembers = staffRepository.findAll();
        List<StaffActivityMetricResponse> metrics = new ArrayList<>();

        for (StaffMember staff : staffMembers) {
            long total = auditRepository.searchLogs(staff.getUsername(), null, null, null, null, Pageable.unpaged()).getTotalElements();
            long catalogOps = auditRepository.searchLogs(staff.getUsername(), null, "CATALOG", null, null, Pageable.unpaged()).getTotalElements()
                    + auditRepository.searchLogs(staff.getUsername(), null, "PRODUCT", null, null, Pageable.unpaged()).getTotalElements();
            long inventoryOps = auditRepository.searchLogs(staff.getUsername(), null, "INVENTORY", null, null, Pageable.unpaged()).getTotalElements();
            long orderOps = auditRepository.searchLogs(staff.getUsername(), null, "ORDER", null, null, Pageable.unpaged()).getTotalElements();
            long importOps = auditRepository.searchLogs(staff.getUsername(), null, "IMPORT", null, null, Pageable.unpaged()).getTotalElements();

            metrics.add(StaffActivityMetricResponse.builder()
                    .staffId(staff.getId())
                    .username(staff.getUsername())
                    .name(staff.getName())
                    .roleName(staff.getRoleName())
                    .totalActions(total)
                    .catalogOperations(catalogOps)
                    .inventoryAdjustments(inventoryOps)
                    .ordersProcessed(orderOps)
                    .dataImports(importOps)
                    .lastActive(staff.getLastLoginAt())
                    .build());
        }

        return metrics;
    }

    private AuditLogResponse mapToResponse(AuditLog log) {
        return AuditLogResponse.builder()
                .id(log.getId())
                .actorId(log.getActorId())
                .actorUsername(log.getActorUsername())
                .actorRole(log.getActorRole())
                .action(log.getAction())
                .resourceType(log.getResourceType())
                .resourceId(log.getResourceId())
                .details(log.getDetails())
                .ipAddress(log.getIpAddress())
                .timestamp(log.getTimestamp())
                .build();
    }
}
