package com.econext.auth.repository;

import com.econext.auth.entity.User;
import com.econext.auth.entity.UserPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPreferenceRepository extends JpaRepository<UserPreference, Long> {

    Optional<UserPreference> findByUser(User user);

    Optional<UserPreference> findByUserId(Long userId);
}
