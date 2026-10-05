# ==========================================
# Stage 1: Build the Spring Boot jar
# ==========================================
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache dependencies first (only re-runs when pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -B

# ==========================================
# Stage 2: Runtime (Debian-based JRE: Tika/PDFBox work without font/lib issues)
# ==========================================
FROM eclipse-temurin:21-jre
WORKDIR /app

# Non-root user
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser
COPY --from=build --chown=appuser:appgroup /app/target/*.jar app.jar
USER appuser

# Render injects PORT; 5643 is the local fallback
ENV PORT=5643
EXPOSE 5643

# Tuned for small containers (Render free/starter = 512MB-1GB RAM)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=70.0 -XX:+UseSerialGC -Xss512k"

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT} -jar app.jar"]
