package com.chemsys.config

import org.springframework.context.annotation.Configuration
import org.springframework.data.domain.AuditorAware
import org.springframework.data.jpa.repository.config.EnableJpaAuditing
import org.springframework.data.jpa.repository.config.EnableJpaRepositories
import org.springframework.stereotype.Component
import java.util.*

@Configuration
@EnableJpaAuditing
@EnableJpaRepositories(basePackages = ["com.chemsys.repository"])
class JpaConfig

@Component
class TenantAuditorAware : AuditorAware<UUID> {
    override fun getCurrentAuditor(): Optional<UUID> {
        return Optional.ofNullable(TenantContext.getCurrentTenant())
    }
}
