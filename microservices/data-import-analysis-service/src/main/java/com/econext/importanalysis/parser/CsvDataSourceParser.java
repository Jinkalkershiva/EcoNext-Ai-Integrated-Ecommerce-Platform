package com.econext.importanalysis.parser;

import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Component
public class CsvDataSourceParser implements DataSourceParser {

    @Override
    public boolean supports(String fileExtension) {
        return "csv".equalsIgnoreCase(fileExtension);
    }

    @Override
    public List<String> extractHeaders(InputStream stream) throws Exception {
        try (CSVReader reader = new CSVReaderBuilder(new InputStreamReader(stream, StandardCharsets.UTF_8)).build()) {
            String[] headerRow = reader.readNext();
            if (headerRow == null || headerRow.length == 0) {
                return Collections.emptyList();
            }
            List<String> headers = new ArrayList<>();
            for (String h : headerRow) {
                if (h != null) headers.add(h.trim().replace("\uFEFF", "")); // Remove BOM if present
            }
            return headers;
        }
    }

    @Override
    public List<ParsedRow> parseAndMap(InputStream stream, Map<String, String> columnMapping) throws Exception {
        List<ParsedRow> parsedRows = new ArrayList<>();
        try (CSVReader reader = new CSVReaderBuilder(new InputStreamReader(stream, StandardCharsets.UTF_8)).build()) {
            String[] headerRow = reader.readNext();
            if (headerRow == null) return parsedRows;

            List<String> headers = new ArrayList<>();
            for (String h : headerRow) {
                headers.add(h != null ? h.trim().replace("\uFEFF", "") : "");
            }

            String[] line;
            int rowNum = 1;
            while ((line = reader.readNext()) != null) {
                rowNum++;
                // Skip empty rows
                boolean allBlank = Arrays.stream(line).allMatch(s -> s == null || s.trim().isEmpty());
                if (allBlank) continue;

                Map<String, String> rawValues = new HashMap<>();
                Map<String, Object> mappedValues = new HashMap<>();
                ParsedRow row = ParsedRow.builder()
                        .rowNumber(rowNum)
                        .rawValues(rawValues)
                        .mappedValues(mappedValues)
                        .valid(true)
                        .build();

                for (int i = 0; i < headers.size() && i < line.length; i++) {
                    String colHeader = headers.get(i);
                    String val = line[i] != null ? line[i].trim() : "";
                    rawValues.put(colHeader, val);

                    // If mapped to target field
                    if (columnMapping != null && columnMapping.containsKey(colHeader)) {
                        String targetField = columnMapping.get(colHeader);
                        mappedValues.put(targetField, val);
                    }
                }

                parsedRows.add(row);
            }
        }
        return parsedRows;
    }
}
