package com.econext.importanalysis.parser;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;

@Slf4j
@Component
public class ExcelDataSourceParser implements DataSourceParser {

    private final DataFormatter dataFormatter = new DataFormatter();

    @Override
    public boolean supports(String fileExtension) {
        return "xlsx".equalsIgnoreCase(fileExtension) || "xls".equalsIgnoreCase(fileExtension);
    }

    @Override
    public List<String> extractHeaders(InputStream stream) throws Exception {
        try (Workbook workbook = WorkbookFactory.create(stream)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) return Collections.emptyList();

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) return Collections.emptyList();

            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                String val = dataFormatter.formatCellValue(cell).trim();
                headers.add(val);
            }
            return headers;
        }
    }

    @Override
    public List<ParsedRow> parseAndMap(InputStream stream, Map<String, String> columnMapping) throws Exception {
        List<ParsedRow> parsedRows = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(stream)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) return parsedRows;

            Row headerRow = sheet.getRow(0);
            if (headerRow == null) return parsedRows;

            List<String> headers = new ArrayList<>();
            for (Cell cell : headerRow) {
                headers.add(dataFormatter.formatCellValue(cell).trim());
            }

            int rowNum = 1;
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                rowNum = r + 1;

                Map<String, String> rawValues = new HashMap<>();
                Map<String, Object> mappedValues = new HashMap<>();
                boolean allBlank = true;

                for (int c = 0; c < headers.size(); c++) {
                    String header = headers.get(c);
                    Cell cell = row.getCell(c);
                    String val = cell != null ? dataFormatter.formatCellValue(cell).trim() : "";
                    if (!val.isEmpty()) allBlank = false;
                    rawValues.put(header, val);

                    if (columnMapping != null && columnMapping.containsKey(header)) {
                        String targetField = columnMapping.get(header);
                        mappedValues.put(targetField, val);
                    }
                }

                if (!allBlank) {
                    parsedRows.add(ParsedRow.builder()
                            .rowNumber(rowNum)
                            .rawValues(rawValues)
                            .mappedValues(mappedValues)
                            .valid(true)
                            .build());
                }
            }
        }
        return parsedRows;
    }
}
