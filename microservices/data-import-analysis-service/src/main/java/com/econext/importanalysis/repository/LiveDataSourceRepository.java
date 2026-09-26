package com.econext.importanalysis.repository;

import com.econext.importanalysis.entity.DataSourceType;
import com.econext.importanalysis.entity.LiveDataSource;
import com.econext.importanalysis.entity.SourceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LiveDataSourceRepository extends JpaRepository<LiveDataSource, Long> {

    Optional<LiveDataSource> findBySourceName(String sourceName);

    Optional<LiveDataSource> findByTargetTopic(String targetTopic);

    List<LiveDataSource> findByStatus(SourceStatus status);

    List<LiveDataSource> findBySourceType(DataSourceType sourceType);
}
