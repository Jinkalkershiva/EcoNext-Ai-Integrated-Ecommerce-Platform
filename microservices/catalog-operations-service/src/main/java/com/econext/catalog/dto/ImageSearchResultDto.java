package com.econext.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageSearchResultDto {
    private String title;
    private String imageUrl;
    private String thumbnailUrl;
    private String source;
    private String category;
}
