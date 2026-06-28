# ==========================================
# STAGE 1: Build the Maven Monorepo
# ==========================================
FROM maven:3.8.5-openjdk-17-slim AS builder
WORKDIR /app

# Copy dependency descriptors first for caching
COPY java-monorepo/pom.xml .
COPY java-monorepo/backend/pom.xml backend/
COPY java-monorepo/frontend/pom.xml frontend/

# Copy actual source code
COPY java-monorepo/backend/src backend/src
COPY java-monorepo/frontend/src frontend/src

# Compile and package in production profile
RUN mvn clean package -DskipTests -Pproduction

# ==========================================
# STAGE 2: Lightweight JRE Container for Production
# ==========================================
FROM openjdk:17-slim
WORKDIR /app

# Install curl for health checking
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy the bundled Spring Boot backend executable jar
COPY --from=builder /app/backend/target/simulator-backend-1.0.0.jar app.jar

# Define environment parameters
ENV PORT=3000
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 3000

# Execute the Spring Boot / Vaadin unified app on startup
ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-jar", "app.jar"]
