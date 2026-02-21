package com.chemsys.repository

import com.chemsys.entity.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface UserRepository : JpaRepository<User, UUID> {
    fun findByUsername(username: String): User?
    fun findByEmail(email: String): User?
    fun existsByUsername(username: String): Boolean
    fun existsByEmail(email: String): Boolean
    
    @Query("SELECT u FROM User u WHERE u.tenant.id = :tenantId")
    fun findByTenantId(@Param("tenantId") tenantId: UUID): List<User>

    @Query("SELECT COUNT(u) FROM User u WHERE u.tenant.id = :tenantId")
    fun countByTenantId(@Param("tenantId") tenantId: UUID): Long

    @Modifying
    @Query("UPDATE User u SET u.passwordHash = :hash, u.mustChangePassword = false WHERE u.id = :id")
    fun updatePasswordAndClearMustChange(@Param("id") id: UUID, @Param("hash") hash: String)

    /**
     * Updates a user's password hash and optional must-change flag (e.g. for admin reset; set mustChange = true so user changes it on next login).
     */
    @Modifying
    @Query("UPDATE User u SET u.passwordHash = :hash, u.mustChangePassword = :mustChange WHERE u.id = :id")
    fun updatePassword(
        @Param("id") id: UUID,
        @Param("hash") hash: String,
        @Param("mustChange") mustChange: Boolean
    )
}
