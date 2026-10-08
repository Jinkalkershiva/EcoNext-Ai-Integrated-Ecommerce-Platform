# Multi-stage build for EcoNext Order Operations Lifecycle Service
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy parent POM and install it into local repository without traversing submodules
COPY pom.xml .
RUN mvn -N install

# Copy module POM and source
COPY order-operations-service/pom.xml order-operations-service/
COPY order-operations-service/src order-operations-service/src

# Package target module cleanly
RUN mvn clean package -f order-operations-service/pom.xml -DskipTests

# Production runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S econext && adduser -S econext -G econext

COPY --from=builder /build/order-operations-service/target/*.jar app.jar
RUN chown -R econext:econext /app

USER econext

EXPOSE 8084

ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0" \
    ORDER_OPS_PORT=8084

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
