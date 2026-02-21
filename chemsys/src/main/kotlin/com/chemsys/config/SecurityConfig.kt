package com.chemsys.config

import com.chemsys.security.JwtAuthenticationFilter
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
open class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter
) {

    @Bean
    open fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .cors { /* use bean below */ }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { authz ->
                authz
                    .requestMatchers("/auth/login", "/auth/signup").permitAll()
                    .requestMatchers("/auth/change-password", "/auth/me").authenticated()
                    .requestMatchers("/actuator/**").permitAll()
                    // Allow authenticated users to access branch information (needed for branch context)
                    .requestMatchers("/api/branches/**").authenticated()
                    .requestMatchers("/api/user-branch-preferences/**").authenticated()
                    // Allow tenant admins to manage/list branches and other tenant-scoped operations
                    .requestMatchers("/tenants/me/**").authenticated()
                    .requestMatchers("/tenants/**").hasAnyRole("PLATFORM_ADMIN", "ADMIN")
                    .anyRequest().authenticated()
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    /**
     * Global CORS configuration allowing the Angular dev server by default.
     * Adjust allowed origins via `CORS_ALLOWED_ORIGINS` env or use '*' for local testing.
     */
    @Bean
    open fun corsConfigurationSource(): CorsConfigurationSource {
        val config = CorsConfiguration()
        val allowedOrigins = System.getenv("CORS_ALLOWED_ORIGINS")?.split(',')?.map { it.trim() }
        config.allowedOrigins = allowedOrigins ?: listOf(
            "http://localhost:4200", 
            "http://127.0.0.1:4200", 
            "http://192.168.100.36:4200",
            "https://saamsoft.tech",
            "https://www.saamsoft.tech"
        )
        config.allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        // Allow all headers to make preflight resilient (includes X-Tenant-ID, X-Branch-ID)
        config.allowedHeaders = listOf("*")
        config.exposedHeaders = listOf("Authorization", "X-Tenant-ID", "X-Branch-ID")
        config.allowCredentials = true
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)
        return source
    }

    @Bean
    open fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    open fun authenticationManager(config: AuthenticationConfiguration): AuthenticationManager {
        return config.authenticationManager
    }
}
