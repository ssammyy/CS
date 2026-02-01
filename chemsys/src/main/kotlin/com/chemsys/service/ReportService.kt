package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.*
import com.chemsys.entity.SaleReturnStatus
import com.chemsys.repository.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.OffsetDateTime
import java.util.*

/**
 * ReportService provides comprehensive reporting capabilities for financial, inventory, and variance reports
 */
@Service
class ReportService(
    private val saleRepository: SaleRepository,
    private val inventoryRepository: InventoryRepository,
    private val productRepository: ProductRepository,
    private val creditAccountRepository: CreditAccountRepository,
    private val purchaseOrderRepository: PurchaseOrderRepository,
    private val creditPaymentRepository: CreditPaymentRepository
) {

    companion object {
        private val logger = LoggerFactory.getLogger(ReportService::class.java)
    }

    /**
     * Get financial report with sales, revenue, and credit metrics
     */
    @Transactional(readOnly = true)
    fun getFinancialReport(
        startDate: LocalDate,
        endDate: LocalDate,
        branchId: UUID? = null
    ): FinancialReportDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val startDateTime = startDate.atStartOfDay().atOffset(OffsetDateTime.now().offset)
        val endDateTime = endDate.plusDays(1).atStartOfDay().atOffset(OffsetDateTime.now().offset)

        val sales = getSalesForPeriod(startDateTime, endDateTime, branchId, currentTenantId)
        val totalRevenue = sales.sumOf { it.totalAmount }
        val totalCost = calculateTotalCost(sales)
        val grossProfit = totalRevenue - totalCost
        val grossProfitMargin = if (totalRevenue > BigDecimal.ZERO)
            (grossProfit.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal(100))).toDouble()
        else
            0.0

        val creditSales = sales.filter { it.isCreditSale }
        val totalCreditSales = creditSales.sumOf { it.totalAmount }

        val payments = getPaymentsForPeriod(startDateTime, endDateTime, branchId, currentTenantId)
        val totalPaymentsReceived = payments.sumOf { it.amount }

        val revenueByPaymentMethod = getRevenueByPaymentMethodForPeriod(startDateTime, endDateTime, branchId, currentTenantId)

        val dailyRevenue = sales
            .groupBy { it.saleDate.toLocalDate() }
            .map { (date, salesForDay) ->
                DailyRevenueDto(
                    date = date,
                    revenue = salesForDay.sumOf { it.totalAmount },
                    salesCount = salesForDay.size.toLong()
                )
            }
            .sortedBy { it.date }

        return FinancialReportDto(
            startDate = startDate,
            endDate = endDate,
            totalRevenue = totalRevenue,
            totalCost = totalCost,
            grossProfit = grossProfit,
            grossProfitMargin = grossProfitMargin,
            totalSales = sales.size.toLong(),
            totalCreditSales = totalCreditSales,
            totalCashSales = totalRevenue - totalCreditSales,
            creditPaymentsReceived = totalPaymentsReceived,
            revenueByPaymentMethod = revenueByPaymentMethod,
            dailyRevenue = dailyRevenue
        )
    }

    /**
     * Get inventory report with stock status and valuation
     */
    @Transactional(readOnly = true)
    fun getInventoryReport(
        branchId: UUID? = null
    ): InventoryReportDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val inventoryItems = if (branchId != null)
            inventoryRepository.findByTenantIdAndBranchId(currentTenantId, branchId)
        else
            inventoryRepository.findByTenantId(currentTenantId)

        val totalItems = inventoryItems.size.toLong()
        val totalQuantity = inventoryItems.sumOf { it.quantity.toLong() }
        val totalStockValue = inventoryItems.sumOf { (it.quantity.toBigDecimal() * (it.sellingPrice ?: BigDecimal.ZERO)) }
        val totalCostValue = inventoryItems.sumOf { (it.quantity.toBigDecimal() * (it.unitCost ?: BigDecimal.ZERO)) }

        val now = LocalDate.now()
        val lowStockItems = inventoryItems
            .filter { it.quantity < it.product.minStockLevel }
            .map { inv ->
                LowStockItemDto(
                    productId = inv.product.id.toString(),
                    productName = inv.product.name,
                    currentStock = inv.quantity.toLong(),
                    minStockLevel = inv.product.minStockLevel.toLong(),
                    stockValue = inv.quantity.toBigDecimal() * (inv.sellingPrice ?: BigDecimal.ZERO)
                )
            }

        val expiringItems = inventoryItems
            .filter { inv ->
                inv.expiryDate?.let { expiry ->
                    expiry.isAfter(now) && expiry.isBefore(now.plusDays(30))
                } ?: false
            }
            .map { inv ->
                ExpiringItemDto(
                    productId = inv.product.id.toString(),
                    productName = inv.product.name,
                    quantity = inv.quantity.toLong(),
                    expiryDate = inv.expiryDate!!,
                    daysUntilExpiry = (inv.expiryDate!!.toEpochDay() - now.toEpochDay()).toInt(),
                    stockValue = inv.quantity.toBigDecimal() * (inv.sellingPrice ?: BigDecimal.ZERO)
                )
            }
            .sortedBy { it.expiryDate }

        val outOfStockItems = inventoryItems
            .filter { it.quantity == 0 }
            .map { inv ->
                OutOfStockItemDto(
                    productId = inv.product.id.toString(),
                    productName = inv.product.name,
                    lastRestockDate = inv.lastRestocked?.toLocalDate()
                )
            }

        return InventoryReportDto(
            totalItems = totalItems,
            totalQuantity = totalQuantity,
            totalStockValue = totalStockValue,
            totalCostValue = totalCostValue,
            lowStockItems = lowStockItems,
            expiringItems = expiringItems,
            outOfStockItems = outOfStockItems
        )
    }

    /**
     * Get variance report comparing expected vs actual inventory
     */
    @Transactional(readOnly = true)
    fun getVarianceReport(
        startDate: LocalDate,
        endDate: LocalDate,
        branchId: UUID? = null
    ): VarianceReportDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val startDateTime = startDate.atStartOfDay().atOffset(OffsetDateTime.now().offset)
        val endDateTime = endDate.plusDays(1).atStartOfDay().atOffset(OffsetDateTime.now().offset)

        // Get sales for the period (expected inventory deductions)
        val sales = getSalesForPeriod(startDateTime, endDateTime, branchId, currentTenantId)

        // Get current inventory
        val currentInventory = if (branchId != null)
            inventoryRepository.findByTenantIdAndBranchId(currentTenantId, branchId)
        else
            inventoryRepository.findByTenantId(currentTenantId)

        // Calculate expected usage from sales
        val expectedUsageByProduct = mutableMapOf<UUID?, Long>()
        sales.forEach { sale ->
            sale.lineItems.forEach { item ->
                val productId = item.product.id
                expectedUsageByProduct[productId] = (expectedUsageByProduct[productId] ?: 0L) + item.quantity.toLong()
            }
        }

        // Calculate variances
        val variances = mutableListOf<VarianceItemDto>()
        val totalExpectedUsage = expectedUsageByProduct.values.sum()
        var totalInventoryVariance = BigDecimal.ZERO

        currentInventory.forEach { inv ->
            val expectedUsage = expectedUsageByProduct[inv.product.id] ?: 0L
            val varianceQuantity = inv.quantity.toLong() - expectedUsage
            val varianceValue = varianceQuantity.toBigDecimal() * (inv.sellingPrice ?: BigDecimal.ZERO)

            totalInventoryVariance += varianceValue

            variances.add(
                VarianceItemDto(
                    productId = inv.product.id.toString(),
                    productName = inv.product.name,
                    expectedQuantity = expectedUsage,
                    actualQuantity = inv.quantity.toLong(),
                    varianceQuantity = varianceQuantity,
                    varianceValue = varianceValue,
                    variancePercentage = if (expectedUsage > 0)
                        ((varianceQuantity.toBigDecimal() / expectedUsage.toBigDecimal()) * BigDecimal(100)).toDouble()
                    else
                        0.0
                )
            )
        }

        val significantVariances = variances.filter { it.varianceQuantity != 0L }

        return VarianceReportDto(
            startDate = startDate,
            endDate = endDate,
            totalExpectedUsage = totalExpectedUsage,
            totalActualQuantity = currentInventory.sumOf { it.quantity.toLong() },
            totalVarianceQuantity = totalExpectedUsage - currentInventory.sumOf { it.quantity.toLong() },
            totalInventoryVariance = totalInventoryVariance,
            significantVariances = significantVariances.sortedByDescending { it.varianceValue.compareTo(BigDecimal.ZERO) * if (it.varianceValue < BigDecimal.ZERO) -1 else 1 }
        )
    }

    // Helper methods

    private fun getSalesForPeriod(
        start: OffsetDateTime,
        end: OffsetDateTime,
        branchId: UUID?,
        tenantId: UUID
    ) = if (branchId != null)
        saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(start, end, branchId, tenantId, returnStatus = SaleReturnStatus.NONE)
    else
        saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(start, end, tenantId, returnStatus = SaleReturnStatus.NONE)

    private fun getPaymentsForPeriod(
        start: OffsetDateTime,
        end: OffsetDateTime,
        branchId: UUID?,
        tenantId: UUID
    ) = if (branchId != null)
        creditPaymentRepository.findByPaymentDateBetweenAndBranchId(start, end, branchId, tenantId)
    else
        creditPaymentRepository.findByPaymentDateBetweenAndTenantId(start, end, tenantId)

    private fun getRevenueByPaymentMethodForPeriod(
        start: OffsetDateTime,
        end: OffsetDateTime,
        branchId: UUID?,
        tenantId: UUID
    ): List<PaymentMethodRevenueDto> {
        val sales = getSalesForPeriod(start, end, branchId, tenantId)
        val totalRevenue = sales.sumOf { it.totalAmount }

        return sales
            .flatMap { sale -> sale.payments.map { it.paymentMethod to it.amount } }
            .groupBy { it.first }
            .map { (method, payments) ->
                val amount = payments.sumOf { it.second }
                val percentage = if (totalRevenue > BigDecimal.ZERO)
                    (amount.divide(totalRevenue, 4, RoundingMode.HALF_UP).multiply(BigDecimal(100))).toDouble()
                else
                    0.0

                PaymentMethodRevenueDto(
                    paymentMethod = method.name,
                    amount = amount,
                    percentage = percentage
                )
            }
    }

    /**
     * Get VAT report with input VAT, output VAT, and net VAT payable
     */
    @Transactional(readOnly = true)
    fun getVatReport(
        startDate: LocalDate,
        endDate: LocalDate,
        branchId: UUID? = null
    ): VatReportDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val startDateTime = startDate.atStartOfDay().atOffset(OffsetDateTime.now().offset)
        val endDateTime = endDate.plusDays(1).atStartOfDay().atOffset(OffsetDateTime.now().offset)

        // Get sales for the period (output VAT)
        val sales = getSalesForPeriod(startDateTime, endDateTime, branchId, currentTenantId)

        // Get purchases for the period (input VAT)
        val purchases = if (branchId != null)
            purchaseOrderRepository.findByPurchaseDateBetweenAndBranchIdAndTenantId(startDateTime, endDateTime, branchId, currentTenantId)
        else
            purchaseOrderRepository.findByPurchaseDateBetweenAndTenantId(startDateTime, endDateTime, currentTenantId)

        // Calculate output VAT by tax classification
        val salesByClassification = mutableMapOf<String, MutableList<com.chemsys.entity.Sale>>()
        sales.forEach { sale ->
            val classification = sale.taxClassification.name
            salesByClassification.getOrPut(classification) { mutableListOf() }.add(sale)
        }

        val salesByTaxCategory = salesByClassification.map { (classification, salesList) ->
            val totalAmount = salesList.sumOf { it.subtotal }
            val totalVat = salesList.sumOf { it.taxAmount ?: BigDecimal.ZERO }
            val vatRate = if (totalAmount > BigDecimal.ZERO)
                (totalVat.divide(totalAmount, 4, RoundingMode.HALF_UP) * BigDecimal(100))
            else
                BigDecimal.ZERO

            SalesByTaxCategoryDto(
                classification = classification,
                vatRate = vatRate,
                numberOfTransactions = salesList.size.toLong(),
                totalAmount = totalAmount,
                totalVat = totalVat,
                amountIncludingVat = salesList.sumOf { it.totalAmount }
            )
        }

        // Calculate input VAT by tax classification (from purchases)
        val purchasesByClassification = mutableMapOf<String, MutableList<com.chemsys.entity.PurchaseOrder>>()
        purchases.forEach { purchase ->
            val classification = "STANDARD" // Default - can be extended if purchases track tax classification
            purchasesByClassification.getOrPut(classification) { mutableListOf() }.add(purchase)
        }

        val purchasesByTaxCategory = purchasesByClassification.map { (classification, purchasesList) ->
            val totalAmount = purchasesList.sumOf { it.totalAmount }
            val totalVat = purchasesList.sumOf { it.taxAmount ?: BigDecimal.ZERO }
            val vatRate = if (totalAmount > BigDecimal.ZERO)
                (totalVat.divide(totalAmount, 4, RoundingMode.HALF_UP) * BigDecimal(100))
            else
                BigDecimal.ZERO

            PurchasesByTaxCategoryDto(
                classification = classification,
                vatRate = vatRate,
                numberOfTransactions = purchasesList.size.toLong(),
                totalAmount = totalAmount,
                totalVat = totalVat,
                amountIncludingVat = purchasesList.sumOf { it.totalAmount + (it.taxAmount ?: BigDecimal.ZERO) }
            )
        }

        // Calculate totals
        val totalOutputVat = sales.sumOf { it.taxAmount ?: BigDecimal.ZERO }
        val totalInputVat = purchases.sumOf { it.taxAmount ?: BigDecimal.ZERO }
        val netVatPayable = totalOutputVat - totalInputVat
        val totalSalesExcludingVat = sales.sumOf { it.subtotal }
        val totalSalesIncludingVat = sales.sumOf { it.totalAmount }
        val totalPurchasesExcludingVat = purchases.sumOf { it.totalAmount }
        val totalPurchasesIncludingVat = purchases.sumOf { it.totalAmount + (it.taxAmount ?: BigDecimal.ZERO) }

        // VAT by classification - combined view
        val allClassifications = (salesByClassification.keys + purchasesByClassification.keys).toSet()
        val vatByClassification = allClassifications.map { classification ->
            val salesForClass = salesByClassification[classification] ?: emptyList()
            val purchasesForClass = purchasesByClassification[classification] ?: emptyList()

            val totalSalesAmount = salesForClass.sumOf { it.subtotal }
            val vatCollected = salesForClass.sumOf { it.taxAmount ?: BigDecimal.ZERO }
            val totalPurchasesAmount = purchasesForClass.sumOf { it.totalAmount }
            val vatPaid = purchasesForClass.sumOf { it.taxAmount ?: BigDecimal.ZERO }

            VatClassificationDetailDto(
                classification = classification,
                vatRate = if (totalSalesAmount > BigDecimal.ZERO)
                    (vatCollected.divide(totalSalesAmount, 4, RoundingMode.HALF_UP) * BigDecimal(100))
                else
                    BigDecimal.ZERO,
                totalSalesAmount = totalSalesAmount,
                vatCollected = vatCollected,
                totalPurchasesAmount = totalPurchasesAmount,
                vatPaid = vatPaid,
                netVat = vatCollected - vatPaid
            )
        }

        return VatReportDto(
            startDate = startDate,
            endDate = endDate,
            totalOutputVat = totalOutputVat,
            totalInputVat = totalInputVat,
            netVatPayable = netVatPayable,
            totalSalesExcludingVat = totalSalesExcludingVat,
            totalSalesIncludingVat = totalSalesIncludingVat,
            totalPurchasesExcludingVat = totalPurchasesExcludingVat,
            totalPurchasesIncludingVat = totalPurchasesIncludingVat,
            vatByClassification = vatByClassification,
            salesByTaxCategory = salesByTaxCategory,
            purchasesByTaxCategory = purchasesByTaxCategory
        )
    }

    private fun calculateTotalCost(sales: List<com.chemsys.entity.Sale>): BigDecimal {
        return sales.flatMap { it.lineItems }
            .sumOf { item ->
                (item.quantity.toBigDecimal() * (item.product.minStockLevel.toBigDecimal())) // Simplified cost calculation
            }
    }
}
