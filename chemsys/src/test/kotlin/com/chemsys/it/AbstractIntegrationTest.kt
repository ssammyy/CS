package com.chemsys.it

import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.TestInstance
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Testcontainers

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
abstract class AbstractIntegrationTest {

    @LocalServerPort
    protected var port: Int = 0

    companion object {
        @JvmStatic
        private var postgres: PostgreSQLContainer<*>? = null

        @JvmStatic
        @BeforeAll
        fun setupContainer() {
            val useLocal = System.getenv("USE_LOCAL_DB")?.equals("true", ignoreCase = true) == true
            if (!useLocal) {
                try {
                    postgres = PostgreSQLContainer("postgres:16-alpine")
                        .withDatabaseName("chemsys")
                        .withUsername("test")
                        .withPassword("test")
                    postgres!!.start()
                } catch (_: Throwable) {
                    postgres = null
                }
            }
        }

        @JvmStatic
        @DynamicPropertySource
        fun registerProperties(registry: DynamicPropertyRegistry) {
            val container = postgres
            if (container != null && container.isRunning) {
                registry.add("spring.datasource.url") { container.jdbcUrl }
                registry.add("spring.datasource.username") { container.username }
                registry.add("spring.datasource.password") { container.password }
            } else {
                val url = System.getenv("DB_URL") ?: "jdbc:postgresql://localhost:5454/chemsys"
                val user = System.getenv("DB_USERNAME") ?: "bonnie"
                val pass = System.getenv("DB_PASSWORD") ?: "Targeted9@21"
                registry.add("spring.datasource.url") { url }
                registry.add("spring.datasource.username") { user }
                registry.add("spring.datasource.password") { pass }
            }
            registry.add("spring.jpa.hibernate.ddl-auto") { "validate" }
            registry.add("spring.flyway.enabled") { true }
        }
    }
}


