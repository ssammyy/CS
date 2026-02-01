package com.chemsys.repository

import com.chemsys.entity.Branch
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface BranchRepository : JpaRepository<Branch, UUID> {
    
    @Query("SELECT b FROM Branch b WHERE b.tenant.id = :tenantId AND b.isActive = true")
    fun findByTenantIdAndActive(tenantId: UUID): List<Branch>
    
    @Query("SELECT b FROM Branch b WHERE b.tenant.id = :tenantId")
    fun findByTenantId(tenantId: UUID): List<Branch>
    
    @Query("SELECT COUNT(b) FROM Branch b WHERE b.tenant.id = :tenantId AND b.isActive = true")
    fun countByTenantIdAndActive(tenantId: UUID): Long
    
    @Query("SELECT b FROM Branch b WHERE b.id = :branchId AND b.tenant.id = :tenantId")
    fun findByIdAndTenantId(branchId: UUID, tenantId: UUID): Optional<Branch>
    
    @Query("SELECT b FROM Branch b WHERE b.name = :name AND b.tenant.id = :tenantId")
    fun findByNameAndTenantId(name: String, tenantId: UUID): Optional<Branch>
}
