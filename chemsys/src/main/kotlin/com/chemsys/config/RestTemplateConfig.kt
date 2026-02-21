package com.chemsys.config

import org.springframework.boot.web.client.RestTemplateBuilder
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestTemplate
import org.springframework.web.reactive.function.client.WebClient
import java.time.Duration

/**
 * Configuration for HTTP client beans
 * - RestTemplate: Used for making HTTP requests to M-Pesa Daraja API
 * - WebClient: Used for making reactive HTTP requests to AI APIs
 */
@Configuration
class RestTemplateConfig {

    @Bean
    fun restTemplate(builder: RestTemplateBuilder): RestTemplate {
        return builder
            .setConnectTimeout(Duration.ofSeconds(10))
            .setReadTimeout(Duration.ofSeconds(30))
            .build()
    }

    @Bean
    fun webClient(): WebClient {
        return WebClient.builder()
            .build()
    }
}
