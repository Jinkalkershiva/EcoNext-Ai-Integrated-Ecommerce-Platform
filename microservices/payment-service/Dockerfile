# Multi-stage build for EcoNext Payment Service
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy parent POM and install it into local repository without traversing submodules
COPY pom.xml .
RUN mvn -N install

# Copy module POM and source
COPY payment-service/pom.xml payment-service/
COPY payment-service/src payment-service/src

# Package target module cleanly
RUN mvn clean package -f payment-service/pom.xml -DskipTests

# Production runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S econext && adduser -S econext -G econext

COPY --from=builder /build/payment-service/target/*.jar app.jar
RUN chown -R econext:econext /app

USER econext

EXPOSE 8087

ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0" \
    PAYMENT_SERVICE_PORT=8087

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
