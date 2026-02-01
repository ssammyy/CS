package com.chemsys.config

import org.springframework.boot.web.client.RestTemplateBuilder
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.client.RestTemplate
import java.time.Duration

/**
 * Configuration for RestTemplate bean
 * Used for making HTTP requests to M-Pesa Daraja API
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
}
