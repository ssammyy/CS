package com.chemsys.config

import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Profile
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Component

@Component
@Profile("dev")
class DevPasswordHashPrinter(
    private val passwordEncoder: PasswordEncoder
) : ApplicationRunner {
    override fun run(args: ApplicationArguments?) {
        val hash = passwordEncoder.encode("admin123")
        println("DEV_ENCODED_ADMIN123=$hash")
    }
}



