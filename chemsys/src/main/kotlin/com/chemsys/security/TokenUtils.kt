package com.chemsys.security

import io.jsonwebtoken.Jwts
import javax.crypto.SecretKey
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.*

@Component
class TokenUtils(@Value("") private val dummy: String = "", @Value("") private val dummy2: String = "") {
    companion object {
        private lateinit var key: SecretKey
        fun init(k: SecretKey) { key = k }
        fun getUsername(token: String): String? = runCatching { Jwts.parser().verifyWith(key).build().parseSignedClaims(token).payload.subject }.getOrNull()
        fun getTenantId(token: String): UUID? = runCatching { UUID.fromString(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).payload["tenant_id"] as String) }.getOrNull()
        fun getRole(token: String): String? = runCatching { Jwts.parser().verifyWith(key).build().parseSignedClaims(token).payload["role"] as String }.getOrNull()
    }
}




