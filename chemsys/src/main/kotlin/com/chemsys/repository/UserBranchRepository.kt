package com.chemsys.repository

import com.chemsys.entity.UserBranch
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface UserBranchRepository : JpaRepository<UserBranch, UUID> {
    
    @Query("SELECT ub FROM UserBranch ub WHERE ub.user.id = :userId")
    fun findByUserId(userId: UUID): List<UserBranch>
    
    @Query("SELECT ub FROM UserBranch ub WHERE ub.branch.id = :branchId")
    fun findByBranchId(branchId: UUID): List<UserBranch>
    
    @Query("SELECT ub FROM UserBranch ub WHERE ub.user.id = :userId AND ub.branch.tenant.id = :tenantId")
    fun findByUserIdAndTenantId(userId: UUID, tenantId: UUID): List<UserBranch>
    
    @Query("SELECT ub FROM UserBranch ub WHERE ub.branch.id = :branchId AND ub.branch.tenant.id = :tenantId")
    fun findByBranchIdAndTenantId(branchId: UUID, tenantId: UUID): List<UserBranch>
    
    @Query("SELECT ub FROM UserBranch ub WHERE ub.user.id = :userId AND ub.isPrimary = true")
    fun findPrimaryBranchByUserId(userId: UUID): Optional<UserBranch>
    
    @Query("SELECT COUNT(ub) FROM UserBranch ub WHERE ub.branch.id = :branchId")
    fun countUsersByBranchId(branchId: UUID): Long
    
    @Query("DELETE FROM UserBranch ub WHERE ub.user.id = :userId AND ub.branch.id = :branchId")
    fun deleteByUserIdAndBranchId(userId: UUID, branchId: UUID)
}
