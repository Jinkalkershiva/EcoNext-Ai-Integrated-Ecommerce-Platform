# Multi-stage build for EcoNext Data Import & Operational Analytics Service
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy parent POM and install it into local repository without traversing submodules
COPY pom.xml .
RUN mvn -N install

# Copy module POM and source
COPY data-import-analysis-service/pom.xml data-import-analysis-service/
COPY data-import-analysis-service/src data-import-analysis-service/src

# Package target module cleanly
RUN mvn clean package -f data-import-analysis-service/pom.xml -DskipTests

# Production runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S econext && adduser -S econext -G econext

COPY --from=builder /build/data-import-analysis-service/target/*.jar app.jar
RUN chown -R econext:econext /app

USER econext

EXPOSE 8086

ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0" \
    IMPORT_ANALYSIS_PORT=8086

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
