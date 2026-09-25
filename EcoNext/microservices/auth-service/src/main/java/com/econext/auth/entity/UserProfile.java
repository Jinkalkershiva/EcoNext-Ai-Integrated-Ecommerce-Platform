package com.econext.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 20)
    @Builder.Default
    private String phone = "";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String address = "";

    @Column(length = 100)
    @Builder.Default
    private String city = "";

    @Column(length = 100)
    @Builder.Default
    private String state = "";

    @Column(length = 20)
    @Builder.Default
    private String zipcode = "";

    @Column(length = 100)
    @Builder.Default
    private String country = "";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String preferences = "{}";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
