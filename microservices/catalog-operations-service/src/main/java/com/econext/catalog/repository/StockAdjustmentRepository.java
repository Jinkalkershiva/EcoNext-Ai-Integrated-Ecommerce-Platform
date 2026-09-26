package com.econext.catalog.repository;

import com.econext.catalog.entity.StockAdjustment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockAdjustmentRepository extends JpaRepository<StockAdjustment, Long> {
    Page<StockAdjustment> findByProductIdOrderByTimestampDesc(Long productId, Pageable pageable);
    Page<StockAdjustment> findByStaffUsernameOrderByTimestampDesc(String staffUsername, Pageable pageable);
    List<StockAdjustment> findTop10ByOrderByTimestampDesc();
}
