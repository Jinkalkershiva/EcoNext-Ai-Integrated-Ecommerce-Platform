package com.econext.order.service;

import com.econext.order.dto.CreateDriverRequest;
import com.econext.order.dto.DriverResponse;
import com.econext.order.entity.Driver;
import com.econext.order.entity.DriverStatus;
import com.econext.order.exception.GlobalExceptionHandler.BadRequestException;
import com.econext.order.exception.GlobalExceptionHandler.ResourceNotFoundException;
import com.econext.order.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DriverService {

    private final DriverRepository driverRepository;

    @Transactional(readOnly = true)
    public List<DriverResponse> getDrivers(String warehouse, DriverStatus status, String search) {
        List<Driver> drivers;
        if (warehouse != null && !warehouse.isBlank() && !"All Warehouses".equalsIgnoreCase(warehouse)) {
            if (status != null) {
                drivers = driverRepository.findByWarehouseAndStatus(warehouse.trim(), status);
            } else {
                drivers = driverRepository.findByWarehouse(warehouse.trim());
            }
        } else if (status != null) {
            drivers = driverRepository.findByStatus(status);
        } else {
            drivers = driverRepository.findAll();
        }

        if (search != null && !search.isBlank()) {
            String term = search.trim().toLowerCase();
            drivers = drivers.stream().filter(d ->
                    (d.getDriverCode() != null && d.getDriverCode().toLowerCase().contains(term)) ||
                    (d.getName() != null && d.getName().toLowerCase().contains(term)) ||
                    (d.getPhone() != null && d.getPhone().toLowerCase().contains(term)) ||
                    (d.getCurrentVehicleNumber() != null && d.getCurrentVehicleNumber().toLowerCase().contains(term))
            ).collect(Collectors.toList());
        }

        return drivers.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DriverResponse> getAvailableDrivers(String warehouse) {
        if (warehouse != null && !warehouse.isBlank() && !"All Warehouses".equalsIgnoreCase(warehouse)) {
            return driverRepository.findByWarehouseAndStatus(warehouse.trim(), DriverStatus.AVAILABLE)
                    .stream().map(this::mapToResponse).collect(Collectors.toList());
        }
        return driverRepository.findByStatus(DriverStatus.AVAILABLE)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DriverResponse getDriverById(Long id) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with ID: " + id));
        return mapToResponse(driver);
    }

    @Transactional
    public DriverResponse createDriver(CreateDriverRequest request) {
        if (driverRepository.findByDriverCode(request.getDriverCode().trim().toUpperCase()).isPresent()) {
            throw new BadRequestException("Driver with code " + request.getDriverCode() + " already exists.");
        }

        Driver driver = Driver.builder()
                .driverCode(request.getDriverCode().trim().toUpperCase())
                .name(request.getName().trim())
                .phone(request.getPhone())
                .email(request.getEmail())
                .licenseNumber(request.getLicenseNumber())
                .warehouse(request.getWarehouse().trim())
                .status(DriverStatus.AVAILABLE)
                .currentVehicleNumber(request.getCurrentVehicleNumber())
                .build();

        Driver saved = driverRepository.save(driver);
        log.info("Provisioned driver [{}] - {} for warehouse [{}]", saved.getDriverCode(), saved.getName(), saved.getWarehouse());
        return mapToResponse(saved);
    }

    @Transactional
    public DriverResponse updateDriverStatus(Long id, DriverStatus status) {
        Driver driver = driverRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with ID: " + id));
        driver.setStatus(status);
        if (status == DriverStatus.AVAILABLE || status == DriverStatus.OFFLINE) {
            driver.setAssignedShipmentId(null);
            driver.setAssignedContainerId(null);
        }
        Driver saved = driverRepository.save(driver);
        log.info("Driver [{}] status updated to {}", saved.getDriverCode(), status);
        return mapToResponse(saved);
    }

    public DriverResponse mapToResponse(Driver d) {
        return DriverResponse.builder()
                .id(d.getId())
                .driverCode(d.getDriverCode())
                .name(d.getName())
                .phone(d.getPhone())
                .email(d.getEmail())
                .licenseNumber(d.getLicenseNumber())
                .warehouse(d.getWarehouse())
                .status(d.getStatus())
                .currentVehicleNumber(d.getCurrentVehicleNumber())
                .assignedShipmentId(d.getAssignedShipmentId())
                .assignedContainerId(d.getAssignedContainerId())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
