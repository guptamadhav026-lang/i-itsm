package com.itsm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Entry point of the I-ITSM backend.
 * Run this class (or "mvnw spring-boot:run") and open http://localhost:8080/swagger-ui.html
 */
@SpringBootApplication
@EnableScheduling
public class ItsmApplication {

    public static void main(String[] args) {
        SpringApplication.run(ItsmApplication.class, args);
    }
}
