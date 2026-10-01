package com.econext.catalog.repository;

import com.econext.catalog.entity.OperationalProduct;
import com.econext.catalog.entity.ProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OperationalProductRepository extends JpaRepository<OperationalProduct, Long> {

    Optional<OperationalProduct> findByName(String name);
    boolean existsByName(String name);
    Optional<OperationalProduct> findByDjangoProductId(Long djangoProductId);

    Page<OperationalProduct> findByStatus(ProductStatus status, Pageable pageable);
    Page<OperationalProduct> findByCategoryId(Long categoryId, Pageable pageable);

    @Query("SELECT p FROM OperationalProduct p WHERE " +
           "(:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:categoryId IS NULL OR p.category.id = :categoryId) AND " +
           "(:status IS NULL OR p.status = :status) AND " +
           "(:stockFilter IS NULL OR " +
           " (:stockFilter = 'LOW' AND p.stock <= p.lowStockThreshold AND p.stock > 0) OR " +
           " (:stockFilter = 'OUT' AND p.stock = 0) OR " +
           " (:stockFilter = 'IN_STOCK' AND p.stock > p.lowStockThreshold))")
    Page<OperationalProduct> searchProducts(
            @Param("search") String search,
            @Param("categoryId") Long categoryId,
            @Param("status") ProductStatus status,
            @Param("stockFilter") String stockFilter,
            Pageable pageable
    );

    @Query("SELECT COUNT(p) FROM OperationalProduct p WHERE p.stock <= p.lowStockThreshold AND p.stock > 0")
    long countLowStockProducts();

    @Query("SELECT COUNT(p) FROM OperationalProduct p WHERE p.stock = 0")
    long countOutOfStockProducts();

    @Query("SELECT COUNT(p) FROM OperationalProduct p WHERE p.stock > 0")
    long countInStockProducts();

    @Query("SELECT p.category.name, COUNT(p) FROM OperationalProduct p GROUP BY p.category.name")
    List<Object[]> countProductsByCategory();

    @Query("SELECT p FROM OperationalProduct p WHERE p.imageUrl IS NOT NULL AND p.imageUrl <> '' AND " +
           "(:search IS NULL OR :search = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<OperationalProduct> findProductsWithImages(@Param("search") String search, Pageable pageable);
}
