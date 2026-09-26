package com.econext.catalog.repository;

import com.econext.catalog.entity.OperationalCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OperationalCategoryRepository extends JpaRepository<OperationalCategory, Long> {
    Optional<OperationalCategory> findByName(String name);
    boolean existsByName(String name);
    Optional<OperationalCategory> findByDjangoCategoryId(Long djangoCategoryId);
}
