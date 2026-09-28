package com.econext.order.repository;

import com.econext.order.entity.Container;
import com.econext.order.entity.ContainerStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContainerRepository extends JpaRepository<Container, Long> {

    Optional<Container> findByContainerCode(String containerCode);

    List<Container> findByStatus(ContainerStatus status);

    @Query("SELECT c FROM Container c WHERE " +
           "(:status IS NULL OR c.status = :status) AND " +
           "(:search IS NULL OR LOWER(c.containerCode) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(c.destination) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(c.origin) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(c.route) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Container> searchContainers(
            @Param("status") ContainerStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    @Query("SELECT c.status, COUNT(c) FROM Container c GROUP BY c.status")
    List<Object[]> countContainersByStatus();

    @Query("SELECT COUNT(c) FROM Container c WHERE c.status != com.econext.order.entity.ContainerStatus.CLOSED")
    long countActiveContainers();
}

