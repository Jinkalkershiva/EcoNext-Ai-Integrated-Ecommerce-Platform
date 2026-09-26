package com.econext.importanalysis.parser;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

public interface DataSourceParser {
    boolean supports(String fileExtension);
    List<String> extractHeaders(InputStream stream) throws Exception;
    List<ParsedRow> parseAndMap(InputStream stream, Map<String, String> columnMapping) throws Exception;
}
