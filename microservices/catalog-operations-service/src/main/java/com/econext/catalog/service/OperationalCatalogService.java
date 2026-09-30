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
        String additionalImagesJson = serializeList(request.getAdditionalImages());

        OperationalProduct product = OperationalProduct.builder()
                .name(request.getName().trim())
                .description(request.getDescription().trim())
                .category(category)
                .subcategoryName(request.getSubcategoryName())
                .currentPrice(request.getCurrentPrice())
                .imageUrl(request.getImageUrl())
                .additionalImagesJson(additionalImagesJson)
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
        if (request.getAdditionalImages() != null) product.setAdditionalImagesJson(serializeList(request.getAdditionalImages()));
        if (request.getStock() != null) product.setStock(request.getStock());
        if (request.getLowStockThreshold() != null) product.setLowStockThreshold(request.getLowStockThreshold());
        if (request.getSustainabilityScore() != null) product.setSustainabilityScore(request.getSustainabilityScore());
        if (request.getPopularityScore() != null) product.setPopularityScore(request.getPopularityScore());
        if (request.getTags() != null) product.setTagsJson(serializeList(request.getTags()));
        if (request.getEcoTags() != null) product.setEcoTagsJson(serializeList(request.getEcoTags()));
        if (request.getStatus() != null) product.setStatus(request.getStatus());

        OperationalProduct updated = productRepository.save(product);
        djangoSyncService.syncProductUpdateToDjango(updated);

        return mapProductToResponse(updated);
    }

    @Transactional
    public void deleteProduct(Long id, String actorUsername) {
        OperationalProduct product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        product.setStatus(ProductStatus.ARCHIVED);
        productRepository.save(product);
    }

    // ==================== UNIVERSAL IMAGE SEARCH ====================

    @Transactional(readOnly = true)
    public List<ImageSearchResultDto> searchProductImages(String rawQuery, String categoryName) {
        String cleanQuery = (rawQuery != null ? rawQuery.trim() : "").toLowerCase();
        String cleanCategory = (categoryName != null ? categoryName.trim() : "").toLowerCase();
        String combined = (cleanQuery + " " + cleanCategory).trim();

        List<ImageSearchResultDto> results = new ArrayList<>();

        // High-resolution photography library across all catalog categories
        List<ImageSearchResultDto> curatedCatalog = List.of(
            // Apparel & Clothing
            new ImageSearchResultDto("Organic Cotton Crewneck T-Shirt", "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Apparel & Clothing"),
            new ImageSearchResultDto("Sustainable Linen Summer Dress", "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Apparel & Clothing"),
            new ImageSearchResultDto("Recycled Wool Winter Jacket", "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Apparel & Clothing"),
            new ImageSearchResultDto("Eco Hemp Casual Shirt", "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Apparel & Clothing"),
            new ImageSearchResultDto("Organic Denim Jeans", "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Apparel & Clothing"),

            // Footwear
            new ImageSearchResultDto("Recycled Ocean Plastic Sneakers", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Footwear"),
            new ImageSearchResultDto("Natural Cork Sole Casual Shoes", "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Footwear"),
            new ImageSearchResultDto("Eco-friendly Trail Running Shoes", "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Footwear"),
            new ImageSearchResultDto("Organic Canvas Slip-on Shoes", "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Footwear"),

            // Home & Living / Kitchen
            new ImageSearchResultDto("Handmade Bamboo Kitchen Storage Box", "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Home & Living"),
            new ImageSearchResultDto("Reusable Ceramic Coffee Mug", "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Home & Living"),
            new ImageSearchResultDto("Stainless Steel Insulated Water Bottle", "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Home & Living"),
            new ImageSearchResultDto("Organic Cotton Bedding & Throw Pillow", "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Home & Living"),
            new ImageSearchResultDto("Coconut Bowl & Wooden Cutlery Set", "https://images.unsplash.com/photo-1546938576-6e6a64f317cc?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1546938576-6e6a64f317cc?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Home & Living"),

            // Bags & Travel Gear
            new ImageSearchResultDto("Recycled Canvas Everyday Backpack", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Bags & Travel Gear"),
            new ImageSearchResultDto("Organic Cotton Grocery Tote Bag", "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Bags & Travel Gear"),
            new ImageSearchResultDto("Upcycled Waterproof Duffle Bag", "https://images.unsplash.com/photo-1501554728187-ce583db33af7?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1501554728187-ce583db33af7?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Bags & Travel Gear"),

            // Personal Care & Beauty
            new ImageSearchResultDto("Natural Organic Botanical Face Serum", "https://images.unsplash.com/photo-1608248597359-009772a5a58d?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1608248597359-009772a5a58d?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Personal Care"),
            new ImageSearchResultDto("Ayurvedic Herbal Shampoo & Conditioner", "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Personal Care"),
            new ImageSearchResultDto("Zero-Waste Bamboo Toothbrush Set", "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Personal Care"),
            new ImageSearchResultDto("Organic Moisturizing Body Cream", "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Personal Care"),

            // Eco Accessories & Lifestyle
            new ImageSearchResultDto("Handmade Bamboo Polarized Sunglasses", "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Eco Accessories"),
            new ImageSearchResultDto("Recycled Cork Cardholder Wallet", "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Eco Accessories"),

            // Kids & Teens
            new ImageSearchResultDto("Organic Bamboo Cotton Kids Romper", "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Kids"),
            new ImageSearchResultDto("Natural Wooden Building Blocks Toy", "https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1587654780291-39c9404d7dd0?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Kids"),

            // Fitness & Outdoors
            new ImageSearchResultDto("Natural Tree Rubber Yoga Mat", "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Fitness & Sports"),
            new ImageSearchResultDto("Eco-Friendly Resistance Bands Set", "https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Fitness & Sports"),

            // Groceries & Food
            new ImageSearchResultDto("Organic Fair Trade Ground Coffee", "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Groceries"),
            new ImageSearchResultDto("Artisanal Himalayan Green Tea", "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80", "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=300&q=80", "Unsplash Curated", "Groceries")
        );

        // Filter curated items by keyword match
        String[] keywords = combined.split("\\s+");
        for (ImageSearchResultDto item : curatedCatalog) {
            String itemText = (item.getTitle() + " " + item.getCategory()).toLowerCase();
            boolean match = false;
            for (String kw : keywords) {
                if (!kw.isEmpty() && itemText.contains(kw)) {
                    match = true;
                    break;
                }
            }
            if (match || combined.isEmpty()) {
                results.add(item);
            }
        }

        // If specific keyword has fewer matches, add remaining relevant items
        if (results.size() < 4) {
            for (ImageSearchResultDto item : curatedCatalog) {
                if (!results.contains(item)) {
                    results.add(item);
                }
                if (results.size() >= 8) break;
            }
        }

        return results;
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
                .additionalImages(deserializeList(p.getAdditionalImagesJson()))
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
