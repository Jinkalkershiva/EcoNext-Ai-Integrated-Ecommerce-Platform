package com.econext.order.repository;

import com.econext.order.entity.Driver;
import com.econext.order.entity.DriverStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {
    Optional<Driver> findByDriverCode(String driverCode);
    List<Driver> findByWarehouse(String warehouse);
    List<Driver> findByWarehouseAndStatus(String warehouse, DriverStatus status);
    List<Driver> findByStatus(DriverStatus status);
}
