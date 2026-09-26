package com.econext.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "age_group", length = 50)
    private String ageGroup;

    @Column(name = "gender_category", length = 50)
    private String genderCategory;

    @Column(name = "budget_min", precision = 10, scale = 2)
    private BigDecimal budgetMin;

    @Column(name = "budget_max", precision = 10, scale = 2)
    private BigDecimal budgetMax;

    @Column(name = "preferred_categories", columnDefinition = "TEXT")
    @Builder.Default
    private String preferredCategories = "[]";

    @Column(name = "eco_preferences", columnDefinition = "TEXT")
    @Builder.Default
    private String ecoPreferences = "[]";

    @Column(name = "color_preferences", columnDefinition = "TEXT")
    @Builder.Default
    private String colorPreferences = "[]";

    @Column(name = "style_preferences", columnDefinition = "TEXT")
    @Builder.Default
    private String stylePreferences = "[]";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
