package com.econext.importanalysis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportPreviewRequest {
    @NotBlank(message = "File ID is required")
    private String fileId;

    @NotEmpty(message = "Column mapping configuration is required")
    private Map<String, String> columnMapping;

    @Builder.Default
    private boolean checkDuplicates = true;
}
