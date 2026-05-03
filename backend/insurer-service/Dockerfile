# syntax=docker/dockerfile:1
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY common/pom.xml common/
COPY gateway/pom.xml gateway/
COPY farmer-service/pom.xml farmer-service/
COPY admin-service/pom.xml admin-service/
COPY claims-service/pom.xml claims-service/
COPY cce-service/pom.xml cce-service/
COPY report-service/pom.xml report-service/
COPY location-service/pom.xml location-service/
COPY kyc-service/pom.xml kyc-service/
COPY land-api-service/pom.xml land-api-service/
COPY notification-service/pom.xml notification-service/
COPY carbon-service/pom.xml carbon-service/
COPY analytics-service/pom.xml analytics-service/
COPY insurer-service/pom.xml insurer-service/
COPY scheduler-service/pom.xml scheduler-service/
COPY carbon-service/pom.xml carbon-service/
COPY analytics-service/pom.xml analytics-service/
COPY insurer-service/pom.xml insurer-service/
COPY scheduler-service/pom.xml scheduler-service/


COPY common/src          common/src
COPY insurer-service/src  insurer-service/src
RUN mvn -T 1 -B -pl insurer-service -am package -DskipTests --no-transfer-progress

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/insurer-service/target/insurer-service-*.jar app.jar
EXPOSE 8092
ENV JAVA_OPTS="-XX:+UseZGC -XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
