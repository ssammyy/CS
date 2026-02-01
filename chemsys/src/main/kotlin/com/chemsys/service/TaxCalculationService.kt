package com.chemsys.service

import com.chemsys.entity.Product
import com.chemsys.entity.TaxClassification
import com.chemsys.entity.TaxPricingMode
import com.chemsys.entity.TenantTaxSettings
import com.chemsys.repository.TenantTaxSettingsRepository
import org.springframework.stereotype.Service
import java.math.BigDecimal
import java.math.RoundingMode

/**
 * Data class for tax calculation results
 */
data class TaxCalculation(
    val netAmount: BigDecimal,      // Amount before tax
    val taxAmount: BigDecimal,      // Tax amount
    val grossAmount: BigDecimal,    // Amount including tax
    val taxRate: BigDecimal,        // Effective tax rate applied
    val taxType: String             // Tax classification
)

/**
 * TaxCalculationService handles all tax calculations for sales.
 * Supports both VAT-inclusive and VAT-exclusive pricing modes.
 * Handles different tax classifications (STANDARD, REDUCED, ZERO, EXEMPT).
 */
@Service
class TaxCalculationService(
    private val tenantTaxSettingsRepository: TenantTaxSettingsRepository
) {

    companion object {
        private val SCALE = 2
        private val ROUNDING_MODE = RoundingMode.HALF_UP
    }

    /**
     * Calculate tax for a product based on tenant settings and product tax classification
     *
     * @param product The product being sold
     * @param quantity Quantity being sold
     * @param unitPrice Price per unit (before or after tax depending on tenant settings)
     * @param tenantId The tenant ID to get tax settings
     * @return TaxCalculation with net, tax, and gross amounts
     */
    fun calculateTax(
        product: Product,
        quantity: Int,
        unitPrice: BigDecimal,
        tenantId: java.util.UUID
    ): TaxCalculation {
        // Get tenant tax settings
        val taxSettings = tenantTaxSettingsRepository.findByTenantId(tenantId)
            ?: throw IllegalArgumentException("No tax settings found for tenant $tenantId")

        // If tenant doesn't charge VAT, return zero tax
        if (!taxSettings.chargeVat) {
            val totalAmount = unitPrice * BigDecimal(quantity)
            return TaxCalculation(
                netAmount = totalAmount,
                taxAmount = BigDecimal.ZERO,
                grossAmount = totalAmount,
                taxRate = BigDecimal.ZERO,
                taxType = product.taxClassification.name
            )
        }

        // Determine the tax rate to apply
        val applicableTaxRate = getApplicableTaxRate(product, taxSettings)

        // If tax rate is 0 (ZERO or EXEMPT), no tax
        if (applicableTaxRate == BigDecimal.ZERO) {
            val totalAmount = unitPrice * BigDecimal(quantity)
            return TaxCalculation(
                netAmount = totalAmount,
                taxAmount = BigDecimal.ZERO,
                grossAmount = totalAmount,
                taxRate = BigDecimal.ZERO,
                taxType = product.taxClassification.name
            )
        }

        // Calculate tax based on pricing mode
        return when (taxSettings.pricingMode) {
            TaxPricingMode.INCLUSIVE -> calculateFromInclusivePrice(
                unitPrice,
                quantity,
                applicableTaxRate,
                product.taxClassification.name
            )
            TaxPricingMode.EXCLUSIVE -> calculateFromExclusivePrice(
                unitPrice,
                quantity,
                applicableTaxRate,
                product.taxClassification.name
            )
        }
    }

    /**
     * Get the applicable tax rate for a product
     * Priority: Product-specific rate > Product classification rate > Tenant default rate
     */
    private fun getApplicableTaxRate(
        product: Product,
        taxSettings: TenantTaxSettings
    ): BigDecimal {
        return when (product.taxClassification) {
            TaxClassification.STANDARD -> product.taxRate ?: taxSettings.defaultVatRate
            TaxClassification.REDUCED -> product.taxRate ?: BigDecimal("8.00")  // Default reduced rate
            TaxClassification.ZERO -> BigDecimal.ZERO
            TaxClassification.EXEMPT -> BigDecimal.ZERO
        }
    }

    /**
     * Calculate tax from VAT-exclusive price
     * Formula: tax = price * (taxRate / 100)
     *          grossPrice = price + tax
     */
    private fun calculateFromExclusivePrice(
        unitPrice: BigDecimal,
        quantity: Int,
        taxRate: BigDecimal,
        taxType: String
    ): TaxCalculation {
        val totalNetAmount = unitPrice * BigDecimal(quantity)

        // Calculate tax: net * (rate / 100)
        val taxAmount = totalNetAmount
            .multiply(taxRate)
            .divide(BigDecimal(100), SCALE, ROUNDING_MODE)

        val totalGrossAmount = totalNetAmount + taxAmount

        return TaxCalculation(
            netAmount = totalNetAmount.setScale(SCALE, ROUNDING_MODE),
            taxAmount = taxAmount,
            grossAmount = totalGrossAmount,
            taxRate = taxRate,
            taxType = taxType
        )
    }

    /**
     * Calculate tax from VAT-inclusive price
     * Formula: tax = price * (taxRate / (100 + taxRate))
     *          netPrice = price - tax
     */
    private fun calculateFromInclusivePrice(
        unitPrice: BigDecimal,
        quantity: Int,
        taxRate: BigDecimal,
        taxType: String
    ): TaxCalculation {
        val totalGrossAmount = unitPrice * BigDecimal(quantity)

        // Calculate tax from inclusive price
        // tax = gross * (rate / (100 + rate))
        val denominator = BigDecimal(100) + taxRate
        val taxAmount = totalGrossAmount
            .multiply(taxRate)
            .divide(denominator, SCALE, ROUNDING_MODE)

        val totalNetAmount = totalGrossAmount - taxAmount

        return TaxCalculation(
            netAmount = totalNetAmount.setScale(SCALE, ROUNDING_MODE),
            taxAmount = taxAmount,
            grossAmount = totalGrossAmount.setScale(SCALE, ROUNDING_MODE),
            taxRate = taxRate,
            taxType = taxType
        )
    }

    /**
     * Calculate tax for multiple line items
     */
    fun calculateLineItemsTax(
        lineItems: List<Pair<Product, Pair<Int, BigDecimal>>>,  // (Product, (Quantity, UnitPrice))
        tenantId: java.util.UUID
    ): List<TaxCalculation> {
        return lineItems.map { (product, quantityPrice) ->
            val (quantity, unitPrice) = quantityPrice
            calculateTax(product, quantity, unitPrice, tenantId)
        }
    }

    /**
     * Calculate aggregated tax for entire sale
     */
    fun calculateSaleTotals(
        calculations: List<TaxCalculation>
    ): TaxCalculation {
        val totalNetAmount = calculations.sumOf { it.netAmount }
        val totalTaxAmount = calculations.sumOf { it.taxAmount }
        val totalGrossAmount = calculations.sumOf { it.grossAmount }

        // Weighted average tax rate
        val weightedTaxRate = if (totalNetAmount > BigDecimal.ZERO) {
            totalTaxAmount
                .divide(totalNetAmount, SCALE, ROUNDING_MODE)
                .multiply(BigDecimal(100))
        } else {
            BigDecimal.ZERO
        }

        return TaxCalculation(
            netAmount = totalNetAmount,
            taxAmount = totalTaxAmount,
            grossAmount = totalGrossAmount,
            taxRate = weightedTaxRate,
            taxType = "SALE_TOTAL"
        )
    }
}
