package com.econext.order.service;

import com.econext.order.entity.*;
import com.econext.order.repository.ContainerRepository;
import com.econext.order.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LogisticsBootstrapService implements CommandLineRunner {

    private final DriverRepository driverRepository;
    private final ContainerRepository containerRepository;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Initializing baseline warehouse logistics fleet and driver resources...");
        initializeDrivers();
        initializeContainers();
    }

    private void initializeDrivers() {
        if (driverRepository.count() == 0) {
            List<Driver> drivers = List.of(
                    Driver.builder()
                            .driverCode("DR-101")
                            .name("Rajesh Kumar")
                            .phone("+91 98250 11223")
                            .email("rajesh.kumar@econext.com")
                            .licenseNumber("GJ-01-2019-004812")
                            .warehouse("Gujarat Central Hub")
                            .status(DriverStatus.AVAILABLE)
                            .currentVehicleNumber("KA-01-EQ-9124 (EV Heavy Truck)")
                            .build(),
                    Driver.builder()
                            .driverCode("DR-102")
                            .name("Suresh Patel")
                            .phone("+91 98250 33445")
                            .email("suresh.patel@econext.com")
                            .licenseNumber("GJ-01-2020-008921")
                            .warehouse("Gujarat Central Hub")
                            .status(DriverStatus.AVAILABLE)
                            .currentVehicleNumber("GJ-01-EV-4410 (Eco Delivery Van)")
                            .build(),
                    Driver.builder()
                            .driverCode("DR-103")
                            .name("Vikram Desai")
                            .phone("+91 98250 55667")
                            .email("vikram.desai@econext.com")
                            .licenseNumber("GJ-05-2018-001234")
                            .warehouse("Gujarat Central Hub")
                            .status(DriverStatus.AVAILABLE)
                            .currentVehicleNumber("GJ-05-EV-9901 (EV Freight Carrier)")
                            .build(),
                    Driver.builder()
                            .driverCode("DR-201")
                            .name("Amit Sharma")
                            .phone("+91 98200 44556")
                            .email("amit.sharma@econext.com")
                            .licenseNumber("MH-01-2019-009123")
                            .warehouse("Maharashtra Logistics Hub")
                            .status(DriverStatus.AVAILABLE)
                            .currentVehicleNumber("MH-04-EV-8821 (EV 16T Heavy Carrier)")
                            .build(),
                    Driver.builder()
                            .driverCode("DR-202")
                            .name("Nitin Kulkarni")
                            .phone("+91 98200 66778")
                            .email("nitin.k@econext.com")
                            .licenseNumber("MH-12-2021-003456")
                            .warehouse("Maharashtra Logistics Hub")
                            .status(DriverStatus.AVAILABLE)
                            .currentVehicleNumber("MH-12-EV-7733 (Eco Carrier)")
                            .build(),
                    Driver.builder()
                            .driverCode("DR-301")
                            .name("Ramesh Reddy")
                            .phone("+91 98490 11223")
                            .email("ramesh.reddy@econext.com")
                            .licenseNumber("TS-09-2020-005678")
                            .warehouse("Telangana Regional Hub")
                            .status(DriverStatus.AVAILABLE)
                            .currentVehicleNumber("TS-09-EV-1122 (EV Freight Truck)")
                            .build(),
                    Driver.builder()
                            .driverCode("DR-401")
                            .name("Manjunath Gowda")
                            .phone("+91 98800 22334")
                            .email("manjunath.g@econext.com")
                            .licenseNumber("KA-01-2019-006789")
                            .warehouse("Bengaluru Central Fulfillment Hub")
                            .status(DriverStatus.AVAILABLE)
                            .currentVehicleNumber("KA-01-EV-5544 (Heavy EV Transport)")
                            .build(),
                    Driver.builder()
                            .driverCode("DR-501")
                            .name("Virender Singh")
                            .phone("+91 98110 33445")
                            .email("virender.singh@econext.com")
                            .licenseNumber("DL-01-2018-007890")
                            .warehouse("Delhi-NCR North Logistics Center")
                            .status(DriverStatus.AVAILABLE)
                            .currentVehicleNumber("DL-01-EV-3302 (Eco Transport)")
                            .build()
            );
            driverRepository.saveAll(drivers);
            log.info("Provisioned {} baseline logistics drivers", drivers.size());
        }
    }

    private void initializeContainers() {
        if (containerRepository.count() == 0) {
            List<Container> containers = List.of(
                    Container.builder()
                            .containerCode("TRUCK-101")
                            .warehouse("Gujarat Central Hub")
                            .vehicleNumber("KA-01-EQ-9124 (EV Heavy Truck)")
                            .origin("Gujarat Central Hub")
                            .destination("Maharashtra Logistics Hub")
                            .route("Gujarat Warehouse -> Maharashtra Hub")
                            .status(ContainerStatus.CREATED)
                            .maxWeightKg(new BigDecimal("25000.00"))
                            .maxVolumeM3(new BigDecimal("80.00"))
                            .build(),
                    Container.builder()
                            .containerCode("TRUCK-102")
                            .warehouse("Gujarat Central Hub")
                            .vehicleNumber("GJ-01-EV-4410 (EV Freight 16T)")
                            .origin("Gujarat Central Hub")
                            .destination("Bengaluru Central Fulfillment Hub")
                            .route("Gujarat Warehouse -> Maharashtra Hub -> Telangana Hub -> Bengaluru Hub")
                            .status(ContainerStatus.CREATED)
                            .maxWeightKg(new BigDecimal("25000.00"))
                            .maxVolumeM3(new BigDecimal("80.00"))
                            .build(),
                    Container.builder()
                            .containerCode("TRUCK-103")
                            .warehouse("Gujarat Central Hub")
                            .vehicleNumber("GJ-05-EV-9901 (EV City Freight)")
                            .origin("Gujarat Central Hub")
                            .destination("Surat Hub, Gujarat")
                            .route("Ahmedabad -> Vadodara -> Surat")
                            .status(ContainerStatus.CREATED)
                            .maxWeightKg(new BigDecimal("10000.00"))
                            .maxVolumeM3(new BigDecimal("35.00"))
                            .build(),
                    Container.builder()
                            .containerCode("TRUCK-201")
                            .warehouse("Maharashtra Logistics Hub")
                            .vehicleNumber("MH-04-EV-8821 (EV 16T Heavy Carrier)")
                            .origin("Maharashtra Logistics Hub")
                            .destination("Pune Hub, Maharashtra")
                            .route("Mumbai -> Navi Mumbai -> Pune")
                            .status(ContainerStatus.CREATED)
                            .maxWeightKg(new BigDecimal("20000.00"))
                            .maxVolumeM3(new BigDecimal("60.00"))
                            .build(),
                    Container.builder()
                            .containerCode("TRUCK-301")
                            .warehouse("Bengaluru Central Fulfillment Hub")
                            .vehicleNumber("KA-01-EV-5544 (Heavy EV Transport)")
                            .origin("Bengaluru Central Fulfillment Hub")
                            .destination("Telangana Regional Hub")
                            .route("Bengaluru -> Anantapur -> Hyderabad")
                            .status(ContainerStatus.CREATED)
                            .maxWeightKg(new BigDecimal("25000.00"))
                            .maxVolumeM3(new BigDecimal("80.00"))
                            .build()
            );
            containerRepository.saveAll(containers);
            log.info("Provisioned {} baseline freight containers/trucks", containers.size());
        }
    }
}
