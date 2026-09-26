package com.econext.catalog.service;

import com.econext.catalog.dto.*;
import com.econext.catalog.entity.OperationalCategory;
import com.econext.catalog.entity.OperationalProduct;
import com.econext.catalog.entity.ProductStatus;
import com.econext.catalog.exception.GlobalExceptionHandler.*;
import com.econext.catalog.repository.OperationalCategoryRepository;
import com.econext.catalog.repository.OperationalProductRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OperationalCatalogService {

    private final OperationalProductRepository productRepository;
    private final OperationalCategoryRepository categoryRepository;
    private final DjangoSyncService djangoSyncService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ==================== CATEGORIES ====================

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::mapCategoryToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        OperationalCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));
        return mapCategoryToResponse(category);
    }

    @Transactional
    public CategoryResponse createCategory(CategoryCreateRequest request, String actorUsername) {
        String name = request.getName().trim();
        if (categoryRepository.existsByName(name)) {
            throw new BadRequestException("Category with name '" + name + "' already exists");
        }

        OperationalCategory category = OperationalCategory.builder()
                .name(name)
                .description(request.getDescription())
                .build();

        OperationalCategory saved = categoryRepository.save(category);
        Long djangoId = djangoSyncService.syncCategoryToDjango(saved);
        if (djangoId != null) {
            saved.setDjangoCategoryId(djangoId);
            saved = categoryRepository.save(saved);
        }

        return mapCategoryToResponse(saved);
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryUpdateRequest request, String actorUsername) {
        OperationalCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            String newName = request.getName().trim();
            if (!newName.equalsIgnoreCase(category.getName()) && categoryRepository.existsByName(newName)) {
                throw new BadRequestException("Category with name '" + newName + "' already exists");
            }
            category.setName(newName);
        }

        if (request.getDescription() != null) {
            category.setDescription(request.getDescription());
        }

        OperationalCategory updated = categoryRepository.save(category);
        return mapCategoryToResponse(updated);
    }

    @Transactional
    public void deleteCategory(Long id, String actorUsername) {
        OperationalCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        long productCount = productRepository.findByCategoryId(id, Pageable.unpaged()).getTotalElements();
        if (productCount > 0) {
            throw new BadRequestException("Cannot delete category with " + productCount + " associated products");
        }

        categoryRepository.delete(category);
    }

    // ==================== PRODUCTS ====================

    @Transactional(readOnly = true)
    public Page<ProductResponse> searchProducts(
            String search,
            Long categoryId,
            ProductStatus status,
            String stockFilter,
            Pageable pageable
    ) {
        return productRepository.searchProducts(search, categoryId, status, stockFilter, pageable)
                .map(this::mapProductToResponse);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        OperationalProduct product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        return mapProductToResponse(product);
    }

    @Transactional
    public ProductResponse createProduct(ProductCreateRequest request, String actorUsername) {
        OperationalCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));

        String tagsJson = serializeList(request.getTags());
        String ecoTagsJson = serializeList(request.getEcoTags());

        OperationalProduct product = OperationalProduct.builder()
                .name(request.getName().trim())
                .description(request.getDescription().trim())
                .category(category)
                .subcategoryName(request.getSubcategoryName())
                .currentPrice(request.getCurrentPrice())
                .imageUrl(request.getImageUrl())
                .stock(request.getStock() != null ? request.getStock() : 0)
                .lowStockThreshold(request.getLowStockThreshold() != null ? request.getLowStockThreshold() : 5)
                .sustainabilityScore(request.getSustainabilityScore() != null ? request.getSustainabilityScore() : 8.5)
                .popularityScore(request.getPopularityScore() != null ? request.getPopularityScore() : 5.0)
                .tagsJson(tagsJson)
                .ecoTagsJson(ecoTagsJson)
                .status(request.getStatus() != null ? request.getStatus() : ProductStatus.ACTIVE)
                .createdByStaff(actorUsername)
                .build();

        OperationalProduct saved = productRepository.save(product);
        Long djangoId = djangoSyncService.syncProductToDjango(saved);
        if (djangoId != null) {
            saved.setDjangoProductId(djangoId);
            saved = productRepository.save(saved);
        }

        return mapProductToResponse(saved);
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductUpdateRequest request, String actorUsername) {
        OperationalProduct product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        if (request.getName() != null) product.setName(request.getName().trim());
        if (request.getDescription() != null) product.setDescription(request.getDescription().trim());
        if (request.getCategoryId() != null) {
            OperationalCategory category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + request.getCategoryId()));
            product.setCategory(category);
        }
        if (request.getSubcategoryName() != null) product.setSubcategoryName(request.getSubcategoryName());
        if (request.getCurrentPrice() != null) product.setCurrentPrice(request.getCurrentPrice());
        if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());
        if (request.getStock() != null) product.setStock(request.getStock());
        if (request.getLowStockThreshold() != null) product.setLowStockThreshold(request.getLowStockThreshold());
        if (request.getSustainabilityScore() != null) product.setSustainabilityScore(request.getSustainabilityScore());
        if (request.getPopularityScore() != null) product.setPopularityScore(request.getPopularityScore());
        if (request.getTags() != null) product.setTagsJson(serializeList(request.getTags()));
        if (request.getEcoTags() != null) product.setEcoTagsJson(serializeList(request.getEcoTags()));
        if (request.getStatus() != null) product.setStatus(request.getStatus());

        OperationalProduct updated = productRepository.save(product);
        djangoSyncService.syncStockUpdateToDjango(updated.getDjangoProductId(), updated.getStock());

        return mapProductToResponse(updated);
    }

    @Transactional
    public void deleteProduct(Long id, String actorUsername) {
        OperationalProduct product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        product.setStatus(ProductStatus.ARCHIVED);
        productRepository.save(product);
    }

    private String serializeList(List<String> list) {
        if (list == null) return "[]";
        try {
            return objectMapper.writeValueAsString(list);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<String> deserializeList(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private CategoryResponse mapCategoryToResponse(OperationalCategory cat) {
        long count = productRepository.findByCategoryId(cat.getId(), Pageable.unpaged()).getTotalElements();
        return CategoryResponse.builder()
                .id(cat.getId())
                .name(cat.getName())
                .description(cat.getDescription())
                .productCount(count)
                .djangoCategoryId(cat.getDjangoCategoryId())
                .createdAt(cat.getCreatedAt())
                .updatedAt(cat.getUpdatedAt())
                .build();
    }

    private ProductResponse mapProductToResponse(OperationalProduct p) {
        int threshold = p.getLowStockThreshold() != null ? p.getLowStockThreshold() : 5;
        boolean isLow = p.getStock() <= threshold && p.getStock() > 0;
        boolean isOut = p.getStock() == 0;

        return ProductResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .categoryId(p.getCategory().getId())
                .categoryName(p.getCategory().getName())
                .subcategoryName(p.getSubcategoryName())
                .currentPrice(p.getCurrentPrice())
                .imageUrl(p.getImageUrl())
                .stock(p.getStock())
                .lowStockThreshold(threshold)
                .lowStock(isLow)
                .outOfStock(isOut)
                .sustainabilityScore(p.getSustainabilityScore())
                .popularityScore(p.getPopularityScore())
                .tags(deserializeList(p.getTagsJson()))
                .ecoTags(deserializeList(p.getEcoTagsJson()))
                .status(p.getStatus())
                .djangoProductId(p.getDjangoProductId())
                .createdByStaff(p.getCreatedByStaff())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
