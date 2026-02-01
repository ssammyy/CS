package com.chemsys.it

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.HttpEntity
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType

class AuthIntegrationTest : AbstractIntegrationTest() {

    private val rest = TestRestTemplate()

    @Test
    fun `login returns token for seeded admin`() {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        val body = """{"username":"admin","password":"admin123"}"""
        val resp = rest.exchange(
            "http://localhost:$port/auth/login",
            HttpMethod.POST,
            HttpEntity(body, headers),
            Map::class.java
        )
        assertEquals(200, resp.statusCode.value())
        assertNotNull(resp.body?.get("token"))
    }
}


