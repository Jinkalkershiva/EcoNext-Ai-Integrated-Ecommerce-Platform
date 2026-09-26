package com.econext.importanalysis.parser;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ParserFactory {

    private final List<DataSourceParser> parsers;

    public DataSourceParser getParser(String filename) {
        String ext = getFileExtension(filename);
        return parsers.stream()
                .filter(p -> p.supports(ext))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported file type: ." + ext + ". Supported formats: .csv, .xlsx, .xls"));
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
