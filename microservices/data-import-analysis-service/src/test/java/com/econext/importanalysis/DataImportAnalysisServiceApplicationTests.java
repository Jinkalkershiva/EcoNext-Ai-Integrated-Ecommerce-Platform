package com.econext.importanalysis;

import com.econext.importanalysis.dto.AnalyticsKpiResponse;
import com.econext.importanalysis.dto.HeaderDetectionResponse;
import com.econext.importanalysis.dto.ImportExecuteRequest;
import com.econext.importanalysis.dto.ImportJobResponse;
import com.econext.importanalysis.dto.ImportPreviewRequest;
import com.econext.importanalysis.dto.ImportPreviewResponse;
import com.econext.importanalysis.entity.ImportJobStatus;
import com.econext.importanalysis.service.DataAnalysisService;
import com.econext.importanalysis.service.DataImportService;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
public class DataImportAnalysisServiceApplicationTests {

    @Autowired
    private DataImportService importService;

    @Autowired
    private DataAnalysisService analysisService;

    @Test
    @DisplayName("1. Multi-Stage CSV Import Workflow with Duplicate & Anomaly Validation")
    void testCsvImportWorkflowWithColumnMappingAndPreview() throws Exception {
        // 1. Prepare sample CSV with valid, invalid, and duplicate rows
        String csvContent = "item_title,price_inr,stock_count,item_details\n" +
                "Organic Cotton Tee,999.00,50,Soft breathable organic cotton t-shirt\n" +
                "Bamboo Water Bottle,499.00,30,Eco friendly insulated water bottle\n" +
                "Organic Cotton Tee,999.00,20,Duplicate row test\n" +
                "Invalid Price Item,-50.00,10,Negative price test\n";

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "products_batch.csv",
                "text/csv",
                csvContent.getBytes(StandardCharsets.UTF_8)
        );

        // Step 1: Upload and detect headers
        HeaderDetectionResponse detection = importService.uploadAndDetectHeaders(file);
        assertNotNull(detection);
        assertNotNull(detection.getFileId());
        assertTrue(detection.getDetectedHeaders().contains("item_title"));
        assertTrue(detection.getDetectedHeaders().contains("price_inr"));

        // Step 2: Column mapping and preview
        Map<String, String> mapping = Map.of(
                "item_title", "name",
                "price_inr", "currentPrice",
                "stock_count", "stock",
                "item_details", "description"
        );

        ImportPreviewRequest previewReq = ImportPreviewRequest.builder()
                .fileId(detection.getFileId())
                .columnMapping(mapping)
                .checkDuplicates(true)
                .build();

        ImportPreviewResponse preview = importService.previewImport(previewReq);
        assertNotNull(preview);
        assertEquals(4, preview.getTotalRows());
        assertEquals(2, preview.getValidRows()); // Row 1 & 2 valid; Row 3 duplicate; Row 4 invalid price
        assertEquals(2, preview.getInvalidRows());
        assertEquals(1, preview.getDuplicateRows());
        assertTrue(preview.isCanProceed());

        // Step 3: Execute import
        ImportExecuteRequest execReq = ImportExecuteRequest.builder()
                .fileId(detection.getFileId())
                .columnMapping(mapping)
                .skipInvalidRows(true)
                .build();

        ImportJobResponse job = importService.executeImport(execReq, "import_staff", null);
        assertNotNull(job);
        assertEquals(ImportJobStatus.COMPLETED, job.getStatus());
        assertEquals(4, job.getTotalRecords());
        assertEquals(2, job.getImportedRecords());
        assertEquals(2, job.getFailedRecords());
    }

    @Test
    @DisplayName("2. Apache POI Multi-Sheet Excel (XLSX) Import Ingestion Pipeline")
    void testExcelPoiImportWorkflow() throws Exception {
        // Create an in-memory XLSX workbook using Apache POI
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Eco Products");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Product Name");
            header.createCell(1).setCellValue("Price");
            header.createCell(2).setCellValue("Quantity");
            header.createCell(3).setCellValue("Description");

            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("Solar Powerbank 10000mAh");
            r1.createCell(1).setCellValue(2499.00);
            r1.createCell(2).setCellValue(40);
            r1.createCell(3).setCellValue("High efficiency monocrystalline solar panels");

            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("Biodegradable Phone Case");
            r2.createCell(1).setCellValue(799.00);
            r2.createCell(2).setCellValue(100);
            r2.createCell(3).setCellValue("Plant-based compostable mobile phone case");

            workbook.write(bos);
        }

        MockMultipartFile excelFile = new MockMultipartFile(
                "file",
                "eco_catalog.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                bos.toByteArray()
        );

        // Upload and inspect headers via Apache POI parser
        HeaderDetectionResponse detection = importService.uploadAndDetectHeaders(excelFile);
        assertNotNull(detection);
        assertEquals("XLSX", detection.getFileType());
        assertTrue(detection.getDetectedHeaders().contains("Product Name"));
        assertTrue(detection.getDetectedHeaders().contains("Price"));

        // Column mapping
        Map<String, String> mapping = Map.of(
                "Product Name", "name",
                "Price", "currentPrice",
                "Quantity", "stock",
                "Description", "description"
        );

        ImportPreviewResponse preview = importService.previewImport(
                ImportPreviewRequest.builder()
                        .fileId(detection.getFileId())
                        .columnMapping(mapping)
                        .build()
        );
        assertEquals(2, preview.getTotalRows());
        assertEquals(2, preview.getValidRows());
        assertEquals(0, preview.getInvalidRows());
    }

    @Test
    @DisplayName("3. Import Security Validation: Disallowed File Extensions")
    void testImportSecurityValidation() {
        // Disallowed extension (.exe)
        MockMultipartFile maliciousFile = new MockMultipartFile(
                "file",
                "malicious_payload.exe",
                "application/octet-stream",
                "malicious executable bytes".getBytes(StandardCharsets.UTF_8)
        );

        assertThrows(IllegalArgumentException.class, () -> importService.uploadAndDetectHeaders(maliciousFile));
    }

    @Autowired
    private com.econext.importanalysis.service.LiveDataSourceService liveDataSourceService;

    @Autowired
    private com.econext.importanalysis.service.BigDataAnalyticsService bigDataAnalyticsService;

    @Test
    @DisplayName("4. Operational Intelligence & Analytics KPI Aggregation")
    void testOperationalAnalyticsDashboardKpis() {
        AnalyticsKpiResponse kpis = analysisService.getAggregatedKpis(null);
        assertNotNull(kpis);
        assertNotNull(kpis.getTotalRevenue());
        assertNotNull(kpis.getTotalOrders());
        assertNotNull(kpis.getTotalProducts());
        assertNotNull(kpis.getOrderStatusDistribution());
        assertNotNull(kpis.getCategoryDistribution());
    }

    @Test
    @DisplayName("5. Big Data Live Sources, Telemetry & Ingestion Invariants")
    void testBigDataLiveSourcesAndStreamingTelemetry() {
        // Test 1: Verify default live sources are seeded
        var sources = liveDataSourceService.getAllSources();
        assertNotNull(sources);
        assertFalse(sources.isEmpty());
        assertTrue(sources.stream().anyMatch(s -> s.getTargetTopic().equals("user-search-events")));
        assertTrue(sources.stream().anyMatch(s -> s.getTargetTopic().equals("product-view-events")));

        // Test 2: Test toggle status
        var firstSource = sources.get(0);
        var toggled = liveDataSourceService.toggleStatus(firstSource.getId());
        assertNotNull(toggled);
        assertNotEquals(firstSource.getStatus(), toggled.getStatus());

        // Test 3: Test dispatch test event
        var eventResult = liveDataSourceService.dispatchTestEvent(firstSource.getId());
        assertEquals("success", eventResult.get("status"));
        assertNotNull(eventResult.get("topic"));

        // Test 4: Big Data Overview metrics
        var overview = bigDataAnalyticsService.getBigDataOverview();
        assertNotNull(overview);
        assertEquals("CONNECTED", overview.getKafkaClusterStatus());
        assertNotNull(overview.getEventsPerTopic());
        assertFalse(overview.getThroughputTrend().isEmpty());
        assertFalse(overview.getAiForecastingInsights().isEmpty());

        // Test 5: Search Trends metrics
        var searchTrends = bigDataAnalyticsService.getSearchTrends();
        assertNotNull(searchTrends);
        assertFalse(searchTrends.getTopQueries().isEmpty());
        assertFalse(searchTrends.getZeroResultQueries().isEmpty());
        assertTrue(searchTrends.getSearchToCartConversionRate() > 0);

        // Test 6: HDFS Lake metrics
        var hdfsMetrics = bigDataAnalyticsService.getHdfsLakeMetrics();
        assertNotNull(hdfsMetrics);
        assertEquals("HEALTHY", hdfsMetrics.getHdfsStatus());
        assertFalse(hdfsMetrics.getDirectoryBreakdown().isEmpty());
        assertFalse(hdfsMetrics.getSparkPipelines().isEmpty());
    }
}
