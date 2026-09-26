package com.econext.importanalysis.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class FileStorageService {

    private final Map<String, StoredFile> cache = new ConcurrentHashMap<>();

    public String storeFile(MultipartFile file) throws Exception {
        String fileId = UUID.randomUUID().toString();
        byte[] content = file.getBytes();
        String originalFilename = file.getOriginalFilename() != null ? file.getOriginalFilename() : "import.csv";

        cache.put(fileId, new StoredFile(originalFilename, content));
        log.info("Stored temporary import file [id: {}, name: {}, size: {} bytes]", fileId, originalFilename, content.length);
        return fileId;
    }

    public InputStream getFileInputStream(String fileId) {
        StoredFile stored = cache.get(fileId);
        if (stored == null) {
            throw new IllegalArgumentException("Import file session not found or expired for ID: " + fileId);
        }
        return new ByteArrayInputStream(stored.content());
    }

    public String getFilename(String fileId) {
        StoredFile stored = cache.get(fileId);
        if (stored == null) {
            throw new IllegalArgumentException("Import file session not found for ID: " + fileId);
        }
        return stored.filename();
    }

    public void removeFile(String fileId) {
        cache.remove(fileId);
    }

    public record StoredFile(String filename, byte[] content) {}
}
