# Multi-stage build for EcoNext Catalog & Inventory Operations Service
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy parent POM and install it into local repository without traversing submodules
COPY pom.xml .
RUN mvn -N install

# Copy module POM and source
COPY catalog-operations-service/pom.xml catalog-operations-service/
COPY catalog-operations-service/src catalog-operations-service/src

# Package target module cleanly
RUN mvn clean package -f catalog-operations-service/pom.xml -DskipTests

# Production runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S econext && adduser -S econext -G econext

COPY --from=builder /build/catalog-operations-service/target/*.jar app.jar
RUN chown -R econext:econext /app

USER econext

EXPOSE 8082

ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0" \
    CATALOG_OPS_PORT=8082

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
