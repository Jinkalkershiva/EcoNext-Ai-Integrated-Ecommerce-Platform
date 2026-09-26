package com.econext.admin.repository;

import com.econext.admin.entity.StaffMember;
import com.econext.admin.entity.StaffStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffMemberRepository extends JpaRepository<StaffMember, Long> {
    Optional<StaffMember> findByUsername(String username);
    Optional<StaffMember> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<StaffMember> findByStatus(StaffStatus status);
    List<StaffMember> findByRoleName(String roleName);

    @Query("SELECT COUNT(s) FROM StaffMember s WHERE s.status = :status")
    long countByStatus(@Param("status") StaffStatus status);
}
