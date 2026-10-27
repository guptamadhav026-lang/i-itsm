package com.itsm.config;

import com.itsm.security.JwtService;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.HandlerExceptionResolver;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.List;

/**
 * Security rules for the REST API.
 *
 * - Passwords are stored as BCrypt hashes, never in plain text.
 * - After logging in, a user gets a signed JWT token. Every other request must carry it
 *   in the "Authorization: Bearer ..." header. No server-side session is kept (stateless).
 * - The token's "roles" claim becomes ROLE_EMPLOYEE / ROLE_TECHNICIAN / ROLE_ADMIN, which the
 *   controllers check with @PreAuthorize (role-based access control).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private static final String[] PUBLIC_URLS = {
            "/api/auth/login", "/api/auth/register", "/api/auth/options",
            "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/error"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationConverter jwtConverter,
                                                   @Qualifier("handlerExceptionResolver") HandlerExceptionResolver errors)
            throws Exception {
        // 401 and 403 raised by the security filters get the same JSON error body (GlobalExceptionHandler)
        // as every other API error, instead of an empty response.
        AuthenticationEntryPoint unauthorized = (request, response, ex) -> {
            if (errors.resolveException(request, response, null, ex) == null) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            }
        };
        AccessDeniedHandler forbidden = (request, response, ex) -> {
            if (errors.resolveException(request, response, null, ex) == null) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN);
            }
        };
        http
                .csrf(csrf -> csrf.disable())          // not needed: no cookies, the token is sent explicitly
                .cors(cors -> { })
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // async/error dispatches belong to a request that was already checked (e.g. live updates)
                        .dispatcherTypeMatchers(DispatcherType.ASYNC, DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(PUBLIC_URLS).permitAll()
                        .requestMatchers("/api/**").authenticated()
                        // everything else is the web app itself (HTML, JavaScript, CSS): public
                        .anyRequest().permitAll())
                .exceptionHandling(e -> e.authenticationEntryPoint(unauthorized).accessDeniedHandler(forbidden))
                .oauth2ResourceServer(oauth -> oauth
                        .bearerTokenResolver(tokenResolver())
                        .authenticationEntryPoint(unauthorized)
                        .accessDeniedHandler(forbidden)
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter)));
        return http.build();
    }

    /**
     * Reads the "Authorization: Bearer" header, except on the public login URLs: an old token left in the
     * header must not stop someone from logging in again.
     */
    private static BearerTokenResolver tokenResolver() {
        DefaultBearerTokenResolver header = new DefaultBearerTokenResolver();
        return request -> {
            String path = request.getRequestURI();
            boolean publicAuthUrl = path.equals("/api/auth/login") || path.equals("/api/auth/register")
                    || path.equals("/api/auth/options");
            return publicAuthUrl ? null : header.resolve(request);
        };
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * The key that signs login tokens. Without ITSM_JWT_SECRET a random key is made at every start, so nobody can
     * forge a token with a secret copied from the source code (the price: everyone logs in again after a restart).
     */
    @Bean
    public SecretKey jwtSecretKey(@Value("${itsm.security.jwt-secret:}") String secret) {
        byte[] bytes;
        if (secret.isBlank()) {
            bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            log.warn("ITSM_JWT_SECRET is not set: using a random signing key, so logins end when the app restarts");
        } else {
            bytes = secret.getBytes(StandardCharsets.UTF_8);
            if (bytes.length < 32) {
                throw new IllegalStateException("itsm.security.jwt-secret must be at least 32 characters long");
            }
        }
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(jwtSecretKey));
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
    }

    /** Turns the token's "roles" claim into Spring Security authorities (ROLE_ADMIN etc.). */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName(JwtService.ROLES_CLAIM);
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    /** Lets a frontend running on another port (e.g. a React dev server) call this API. */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${itsm.cors.allowed-origins:http://localhost:5173,http://localhost:3000}") List<String> origins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
