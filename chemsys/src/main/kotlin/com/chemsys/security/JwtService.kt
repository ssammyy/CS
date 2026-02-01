package com.chemsys.security

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import javax.crypto.SecretKey
import java.util.*

@Service
class JwtService(
    @Value("\${spring.security.jwt.secret}")
    private val secret: String,
    
    @Value("\${spring.security.jwt.expiration}")
    private val expiration: Long
) {
    
    private val key: SecretKey = Keys.hmacShaKeyFor(secret.toByteArray())
    
    fun generateToken(username: String, tenantId: UUID, role: String): String {
        val now = Date()
        val expiryDate = Date(now.time + expiration)
        
        return Jwts.builder()
            .setSubject(username)
            .claim("tenant_id", tenantId.toString())
            .claim("role", role)
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(key, Jwts.SIG.HS512)
            .compact()
    }
    
    fun validateToken(token: String): Boolean {
        return try {
            Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
            true
        } catch (e: JwtException) {
            false
        }
    }
    
    fun getUsernameFromToken(token: String): String? {
        return try {
            val claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .payload
            claims.subject
        } catch (e: JwtException) {
            null
        }
    }
    
    fun getTenantIdFromToken(token: String): UUID? {
        return try {
            val claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .payload
            val tenantIdStr = claims["tenant_id"] as String?
            tenantIdStr?.let { UUID.fromString(it) }
        } catch (e: JwtException) {
            null
        }
    }
    
    fun getRoleFromToken(token: String): String? {
        return try {
            val claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .payload
            claims["role"] as String?
        } catch (e: JwtException) {
            null
        }
    }
}
