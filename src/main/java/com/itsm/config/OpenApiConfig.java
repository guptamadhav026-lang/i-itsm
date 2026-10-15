package com.itsm.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger UI (http://localhost:8080/swagger-ui.html): a web page to try every API endpoint. */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI itsmOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("I-ITSM API")
                        .version("0.1.0")
                        .description("Intelligent IT Service Management & Incident Resolution System. "
                                + "Log in with POST /api/auth/login, copy the token, click 'Authorize' and paste it."))
                .components(new Components().addSecuritySchemes("bearerAuth",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
