package com.chemsys

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class ChemsysApplication

fun main(args: Array<String>) {
    runApplication<ChemsysApplication>(*args)
}
