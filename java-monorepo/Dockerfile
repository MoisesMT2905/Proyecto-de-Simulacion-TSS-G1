# ==========================================
# STAGE 1: Build the Maven Monorepo
# ==========================================
FROM maven:3.8.5-openjdk-17-slim AS builder
WORKDIR /app

# Copy dependency descriptors first for caching
COPY pom.xml .
COPY backend/pom.xml backend/
COPY frontend/pom.xml frontend/

# Fetch dependencies (offline mode) to optimize speed
RUN mvn dependency:go-offline -B

# Copy actual source code
COPY backend/src backend/src
COPY frontend/src frontend/src

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
# Copia el jar generado en el módulo backend usando el nombre fijo que configuraste
COPY --from=builder /app/backend/target/app.jar app.jar

# Define environment parameters
ENV PORT=3000
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 3000

# Execute the Spring Boot / Vaadin unified app on startup
ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-jar", "app.jar"]
