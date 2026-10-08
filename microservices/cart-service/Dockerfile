# Multi-stage build for EcoNext Cart Service
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy parent POM and install it into local repository without traversing submodules
COPY pom.xml .
RUN mvn -N install

# Copy module POM and source
COPY cart-service/pom.xml cart-service/
COPY cart-service/src cart-service/src

# Package target module cleanly
RUN mvn clean package -f cart-service/pom.xml -DskipTests

# Production runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

RUN addgroup -S econext && adduser -S econext -G econext

COPY --from=builder /build/cart-service/target/*.jar app.jar
RUN chown -R econext:econext /app

USER econext

EXPOSE 8083

ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0" \
    CART_SERVICE_PORT=8083

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
