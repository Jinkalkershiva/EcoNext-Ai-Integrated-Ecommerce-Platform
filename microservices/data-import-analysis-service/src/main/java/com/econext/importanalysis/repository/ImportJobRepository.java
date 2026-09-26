package com.econext.importanalysis.repository;

import com.econext.importanalysis.entity.ImportJob;
import com.econext.importanalysis.entity.ImportJobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ImportJobRepository extends JpaRepository<ImportJob, Long> {
    Page<ImportJob> findByStaffUsernameOrderByCreatedAtDesc(String staffUsername, Pageable pageable);
    Page<ImportJob> findByStatusOrderByCreatedAtDesc(ImportJobStatus status, Pageable pageable);
    List<ImportJob> findTop10ByOrderByCreatedAtDesc();
}
