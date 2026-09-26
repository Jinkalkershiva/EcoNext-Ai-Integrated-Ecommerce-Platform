package com.econext.importanalysis.parser;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedRow {
    private int rowNumber;
    @Builder.Default
    private Map<String, String> rawValues = new HashMap<>();
    @Builder.Default
    private Map<String, Object> mappedValues = new HashMap<>();
    @Builder.Default
    private boolean valid = true;
    @Builder.Default
    private boolean duplicate = false;
    @Builder.Default
    private List<String> errorMessages = new ArrayList<>();

    public void addError(String error) {
        this.valid = false;
        this.errorMessages.add(error);
    }
}
