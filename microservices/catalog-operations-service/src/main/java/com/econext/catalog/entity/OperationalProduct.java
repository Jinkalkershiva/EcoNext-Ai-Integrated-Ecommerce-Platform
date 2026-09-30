package com.econext.catalog.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "operational_products", indexes = {
    @Index(name = "idx_op_prod_category", columnList = "category_id"),
    @Index(name = "idx_op_prod_name", columnList = "name"),
    @Index(name = "idx_op_prod_stock", columnList = "stock"),
    @Index(name = "idx_op_prod_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationalProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private OperationalCategory category;

    @Column(name = "subcategory_name", length = 128)
    private String subcategoryName;

    @Column(name = "current_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal currentPrice;

    @Column(name = "image_url", length = 1024)
    private String imageUrl;

    @Column(name = "additional_images_json", columnDefinition = "TEXT")
    private String additionalImagesJson;

    @Column(nullable = false)
    @Builder.Default
    private Integer stock = 0;

    @Column(name = "low_stock_threshold")
    @Builder.Default
    private Integer lowStockThreshold = 5;

    @Column(name = "sustainability_score")
    @Builder.Default
    private Double sustainabilityScore = 8.5;

    @Column(name = "popularity_score")
    @Builder.Default
    private Double popularityScore = 5.0;

    @Column(name = "tags_json", columnDefinition = "TEXT")
    private String tagsJson;

    @Column(name = "eco_tags_json", columnDefinition = "TEXT")
    private String ecoTagsJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ProductStatus status = ProductStatus.ACTIVE;

    @Column(name = "django_product_id")
    private Long djangoProductId;

    @Column(name = "created_by_staff", length = 64)
    private String createdByStaff;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
