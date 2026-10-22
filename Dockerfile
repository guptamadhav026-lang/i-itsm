# Stage 1: build the React app and the Spring Boot jar (the "ui" profile builds the frontend too).
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline
COPY frontend frontend
COPY src src
RUN ./mvnw -B -q -Pui -DskipTests package

# Stage 2: only the Java runtime and the jar, so the image stays small.
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/i-itsm-0.1.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
