package com.econext.importanalysis.dto;

import com.econext.importanalysis.parser.ParsedRow;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImportPreviewResponse {
    private String fileId;
    private int totalRows;
    private int validRows;
    private int invalidRows;
    private int duplicateRows;
    private boolean canProceed;
    private List<ParsedRow> previewRows;
}
