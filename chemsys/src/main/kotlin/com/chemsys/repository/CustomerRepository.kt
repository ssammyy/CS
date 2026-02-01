package com.chemsys.repository

import com.chemsys.entity.Customer
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository interface for Customer entity operations.
 * Provides custom query methods for customer management and search functionality.
 * 
 * This repository follows the Backend Data Consistency Rule by ensuring:
 * - All queries are filtered by tenant for proper isolation
 * - Proper indexing for performance optimization
 * - Support for customer search and lookup operations
 */
@Repository
interface CustomerRepository : JpaRepository<Customer, UUID> {

    /**
     * Finds all customers for a specific tenant with pagination.
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of customers for the tenant
     */
    fun findByTenantId(tenantId: UUID, pageable: Pageable): Page<Customer>

    /**
     * Finds a customer by customer number within a tenant.
     * 
     * @param customerNumber The customer number to search for
     * @param tenantId The tenant ID to filter by
     * @return Optional customer if found
     */
    fun findByCustomerNumberAndTenantId(customerNumber: String, tenantId: UUID): Optional<Customer>

    /**
     * Finds customers by first name (partial match, case-insensitive).
     * 
     * @param firstName The first name to search for
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of customers matching the first name
     */
    fun findByFirstNameContainingIgnoreCaseAndTenantId(
        firstName: String,
        tenantId: UUID,
        pageable: Pageable
    ): Page<Customer>

    /**
     * Finds customers by last name (partial match, case-insensitive).
     * 
     * @param lastName The last name to search for
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of customers matching the last name
     */
    fun findByLastNameContainingIgnoreCaseAndTenantId(
        lastName: String,
        tenantId: UUID,
        pageable: Pageable
    ): Page<Customer>

    /**
     * Finds customers by full name (partial match, case-insensitive).
     * 
     * @param firstName The first name to search for
     * @param lastName The last name to search for
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of customers matching the full name
     */
    fun findByFirstNameContainingIgnoreCaseAndLastNameContainingIgnoreCaseAndTenantId(
        firstName: String,
        lastName: String,
        tenantId: UUID,
        pageable: Pageable
    ): Page<Customer>

    /**
     * Finds customers by phone number (exact match).
     * 
     * @param phone The phone number to search for
     * @param tenantId The tenant ID to filter by
     * @return Optional customer if found
     */
    fun findByPhoneAndTenantId(phone: String, tenantId: UUID): Optional<Customer>

    /**
     * Finds customers by email address (exact match, case-insensitive).
     * 
     * @param email The email address to search for
     * @param tenantId The tenant ID to filter by
     * @return Optional customer if found
     */
    fun findByEmailAndTenantId(email: String, tenantId: UUID): Optional<Customer>

    /**
     * Finds customers by insurance provider.
     * 
     * @param insuranceProvider The insurance provider to search for
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of customers with the insurance provider
     */
    fun findByInsuranceProviderAndTenantId(insuranceProvider: String, tenantId: UUID, pageable: Pageable): Page<Customer>

    /**
     * Finds customers by insurance number.
     * 
     * @param insuranceNumber The insurance number to search for
     * @param tenantId The tenant ID to filter by
     * @return Optional customer if found
     */
    fun findByInsuranceNumberAndTenantId(insuranceNumber: String, tenantId: UUID): Optional<Customer>

    /**
     * Finds active customers for a specific tenant.
     * 
     * @param isActive Whether to find active or inactive customers
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of customers with the specified active status
     */
    fun findByIsActiveAndTenantId(isActive: Boolean, tenantId: UUID, pageable: Pageable): Page<Customer>

    /**
     * Simple customer search - just get all customers for a tenant with pagination.
     * The search logic will be handled in the service layer to avoid complex queries.
     * 
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of customers for the tenant
     */
    fun findAllByTenantIdOrderByCreatedAtDesc(tenantId: UUID, pageable: Pageable): Page<Customer>

    /**
     * Checks if a customer number already exists within a tenant.
     * 
     * @param customerNumber The customer number to check
     * @param tenantId The tenant ID to filter by
     * @return True if the customer number exists, false otherwise
     */
    fun existsByCustomerNumberAndTenantId(customerNumber: String, tenantId: UUID): Boolean

    /**
     * Checks if an email address already exists within a tenant.
     * 
     * @param email The email address to check
     * @param tenantId The tenant ID to filter by
     * @return True if the email exists, false otherwise
     */
    fun existsByEmailAndTenantId(email: String, tenantId: UUID): Boolean

    /**
     * Checks if a phone number already exists within a tenant.
     * 
     * @param phone The phone number to check
     * @param tenantId The tenant ID to filter by
     * @return True if the phone number exists, false otherwise
     */
    fun existsByPhoneAndTenantId(phone: String, tenantId: UUID): Boolean

    /**
     * Gets the next customer number for a specific tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @return The next customer number
     */
    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(c.customerNumber, 4) AS INTEGER)), 0) + 1 " +
           "FROM Customer c WHERE c.tenant.id = :tenantId " +
           "AND c.customerNumber LIKE CONCAT('CUS', '%')")
    fun getNextCustomerNumber(@Param("tenantId") tenantId: UUID): Long

    /**
     * Gets the count of active customers for a specific tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @return Count of active customers
     */
    fun countByIsActiveTrueAndTenantId(tenantId: UUID): Long

    /**
     * Gets the count of all customers for a specific tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @return Count of all customers
     */
    fun countByTenantId(tenantId: UUID): Long

    /**
     * Finds customers created within a date range.
     * 
     * @param startDate The start date (inclusive)
     * @param endDate The end date (inclusive)
     * @param tenantId The tenant ID to filter by
     * @param pageable Pagination information
     * @return Page of customers created within the date range
     */
    fun findByCreatedAtBetweenAndTenantId(
        startDate: java.time.OffsetDateTime,
        endDate: java.time.OffsetDateTime,
        tenantId: UUID,
        pageable: Pageable
    ): Page<Customer>

    /**
     * Gets customer statistics for a specific tenant.
     * 
     * @param tenantId The tenant ID to filter by
     * @return Array containing [totalCustomers, activeCustomers, inactiveCustomers]
     */
    @Query("SELECT " +
           "COUNT(c), " +
           "SUM(CASE WHEN c.isActive = true THEN 1 ELSE 0 END), " +
           "SUM(CASE WHEN c.isActive = false THEN 1 ELSE 0 END) " +
           "FROM Customer c WHERE c.tenant.id = :tenantId")
    fun getCustomerStatistics(@Param("tenantId") tenantId: UUID): Array<Long>
}

