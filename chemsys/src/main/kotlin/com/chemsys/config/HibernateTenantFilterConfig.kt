package com.chemsys.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.hibernate.Session
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import jakarta.persistence.EntityManager
import java.util.*

@Component
open class HibernateTenantFilterConfig(
    private val entityManager: EntityManager
) : OncePerRequestFilter() {

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val tenantId: UUID? = TenantContext.getCurrentTenant()
        val session = entityManager.unwrap(Session::class.java)
        if (tenantId != null) {
            session.enableFilter("tenantFilter")
                .setParameter("tenantId", tenantId)
        } else {
            session.disableFilter("tenantFilter")
        }
        filterChain.doFilter(request, response)
    }
}


