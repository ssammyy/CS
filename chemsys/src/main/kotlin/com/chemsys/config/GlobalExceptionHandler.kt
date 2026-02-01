package com.chemsys.config

import jakarta.validation.ConstraintViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.access.AccessDeniedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ProblemDetail {
        val pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST)
        pd.title = "Validation failed"
        pd.setProperty("errors", ex.bindingResult.fieldErrors.map { mapOf(
            "field" to it.field,
            "message" to (it.defaultMessage ?: "invalid")
        ) })
        return pd
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException): ProblemDetail {
        val pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST)
        pd.title = "Constraint violation"
        pd.setProperty("errors", ex.constraintViolations.map { v ->
            mapOf("property" to v.propertyPath.toString(), "message" to v.message)
        })
        return pd
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadable(ex: HttpMessageNotReadableException): ProblemDetail {
        val pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST)
        pd.title = "Malformed request body"
        pd.detail = ex.mostSpecificCause.message
        return pd
    }

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDenied(ex: AccessDeniedException): ProblemDetail {
        val pd = ProblemDetail.forStatus(HttpStatus.FORBIDDEN)
        pd.title = "Access denied"
        pd.detail = ex.message
        return pd
    }

    @ExceptionHandler(RuntimeException::class)
    fun handleRuntime(ex: RuntimeException): ProblemDetail {
        val pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST)
        pd.title = "Request failed"
        pd.detail = ex.message
        return pd
    }
}



