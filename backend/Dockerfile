# ---- build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

COPY mvnw .
RUN chmod +x mvnw
COPY .mvn .mvn
COPY pom.xml .
RUN ./mvnw -q -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests package


# ---- run stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

ENV SPRING_PROFILES_ACTIVE=dev
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
