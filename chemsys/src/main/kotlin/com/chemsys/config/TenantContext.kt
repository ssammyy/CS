package com.chemsys.config

import java.util.*

object TenantContext {
    private val currentTenant = ThreadLocal<UUID>()
    
    fun setCurrentTenant(tenantId: UUID) {
        currentTenant.set(tenantId)
    }
    
    fun getCurrentTenant(): UUID? {
        return currentTenant.get()
    }
    
    fun clear() {
        currentTenant.remove()
    }
}
