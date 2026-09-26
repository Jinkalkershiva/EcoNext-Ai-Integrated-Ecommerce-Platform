package com.econext.importanalysis;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class DataImportAnalysisServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(DataImportAnalysisServiceApplication.class, args);
    }
}
