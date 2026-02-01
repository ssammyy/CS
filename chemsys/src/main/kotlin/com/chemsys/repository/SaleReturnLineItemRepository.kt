package com.chemsys.repository

import com.chemsys.entity.SaleReturnLineItem
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository interface for SaleReturnLineItem entity operations.
 * Provides basic CRUD operations for return line items.
 * 
 * This repository follows the Backend Data Consistency Rule by ensuring:
 * - All operations maintain referential integrity
 * - Proper indexing for performance optimization
 * - Support for return line item tracking
 */
@Repository
interface SaleReturnLineItemRepository : JpaRepository<SaleReturnLineItem, UUID> {

    /**
     * Finds all return line items for a specific sale return.
     * 
     * @param saleReturnId The sale return ID to filter by
     * @return List of return line items for the sale return
     */
    fun findBySaleReturnId(saleReturnId: UUID): List<SaleReturnLineItem>

    /**
     * Finds return line items by original sale line item ID.
     * 
     * @param originalSaleLineItemId The original sale line item ID
     * @return List of return line items for the original sale line item
     */
    fun findByOriginalSaleLineItemId(originalSaleLineItemId: UUID): List<SaleReturnLineItem>

    /**
     * Finds return line items by product ID.
     * 
     * @param productId The product ID to filter by
     * @return List of return line items for the product
     */
    fun findByProductId(productId: UUID): List<SaleReturnLineItem>
}

