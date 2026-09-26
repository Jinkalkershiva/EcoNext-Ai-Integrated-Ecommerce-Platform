package com.econext.admin.repository;

import com.econext.admin.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByActorUsername(String actorUsername, Pageable pageable);
    Page<AuditLog> findByResourceType(String resourceType, Pageable pageable);
    Page<AuditLog> findByAction(String action, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:actor IS NULL OR LOWER(a.actorUsername) LIKE LOWER(CONCAT('%', :actor, '%'))) AND " +
           "(:action IS NULL OR LOWER(a.action) LIKE LOWER(CONCAT('%', :action, '%'))) AND " +
           "(:resourceType IS NULL OR LOWER(a.resourceType) LIKE LOWER(CONCAT('%', :resourceType, '%'))) AND " +
           "(:fromTime IS NULL OR a.timestamp >= :fromTime) AND " +
           "(:toTime IS NULL OR a.timestamp <= :toTime) " +
           "ORDER BY a.timestamp DESC")
    Page<AuditLog> searchLogs(
        @Param("actor") String actor,
        @Param("action") String action,
        @Param("resourceType") String resourceType,
        @Param("fromTime") LocalDateTime fromTime,
        @Param("toTime") LocalDateTime toTime,
        Pageable pageable
    );

    @Query("SELECT a.actorUsername, COUNT(a) FROM AuditLog a GROUP BY a.actorUsername ORDER BY COUNT(a) DESC")
    List<Object[]> countActivitiesByActor();

    List<AuditLog> findTop10ByOrderByTimestampDesc();
}
