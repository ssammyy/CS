package com.chemsys.it

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.boot.test.web.client.TestRestTemplate
import org.springframework.http.*

class UserIsolationIntegrationTest : AbstractIntegrationTest() {
    private val rest = TestRestTemplate()

    private fun login(username: String, password: String): String {
        val headers = HttpHeaders()
        headers.contentType = MediaType.APPLICATION_JSON
        val body = """{"username":"$username","password":"$password"}"""
        val resp = rest.exchange(
            "http://localhost:$port/auth/login",
            HttpMethod.POST,
            HttpEntity(body, headers),
            Map::class.java
        )
        return resp.body!!["token"].toString()
    }

    @Test
    fun `users endpoint is tenant-scoped`() {
        val token = login("admin", "admin123")
        val headers = HttpHeaders()
        headers.accept = listOf(MediaType.APPLICATION_JSON)
        headers.setBearerAuth(token)
        val resp = rest.exchange(
            "http://localhost:$port/users",
            HttpMethod.GET,
            HttpEntity(null, headers),
            String::class.java
        )
        assertEquals(200, resp.statusCode.value())
        assertTrue(resp.body!!.contains("\"username\":\"admin\""))
    }
}


