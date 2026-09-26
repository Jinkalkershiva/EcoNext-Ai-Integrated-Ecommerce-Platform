package com.econext.importanalysis.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HeaderDetectionResponse {
    private String fileId;
    private String filename;
    private String fileType;
    private List<String> detectedHeaders;
    private Map<String, String> suggestedMappings;
    private int estimatedRowCount;
}
