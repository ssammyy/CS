package com.chemsys.dto

import java.math.BigDecimal
import java.time.LocalDate

/**
 * DTOs for comprehensive reporting features
 */

// ==================== Financial Report ====================

data class FinancialReportDto(
    val startDate: LocalDate,
    val endDate: LocalDate,
    val totalRevenue: BigDecimal,
    val totalCost: BigDecimal,
    val grossProfit: BigDecimal,
    val grossProfitMargin: Double,
    val totalSales: Long,
    val totalCreditSales: BigDecimal,
    val totalCashSales: BigDecimal,
    val creditPaymentsReceived: BigDecimal,
    val revenueByPaymentMethod: List<PaymentMethodRevenueDto>,
    val dailyRevenue: List<DailyRevenueDto>
)

// ==================== Inventory Report ====================

data class InventoryReportDto(
    val totalItems: Long,
    val totalQuantity: Long,
    val totalStockValue: BigDecimal,
    val totalCostValue: BigDecimal,
    val lowStockItems: List<LowStockItemDto>,
    val expiringItems: List<ExpiringItemDto>,
    val outOfStockItems: List<OutOfStockItemDto>
)

data class LowStockItemDto(
    val productId: String,
    val productName: String,
    val currentStock: Long,
    val minStockLevel: Long,
    val stockValue: BigDecimal
)

data class ExpiringItemDto(
    val productId: String,
    val productName: String,
    val quantity: Long,
    val expiryDate: LocalDate,
    val daysUntilExpiry: Int,
    val stockValue: BigDecimal
)

data class OutOfStockItemDto(
    val productId: String,
    val productName: String,
    val lastRestockDate: LocalDate?
)

// ==================== Variance Report ====================

data class VarianceReportDto(
    val startDate: LocalDate,
    val endDate: LocalDate,
    val totalExpectedUsage: Long,
    val totalActualQuantity: Long,
    val totalVarianceQuantity: Long,
    val totalInventoryVariance: BigDecimal,
    val significantVariances: List<VarianceItemDto>
)

data class VarianceItemDto(
    val productId: String,
    val productName: String,
    val expectedQuantity: Long,
    val actualQuantity: Long,
    val varianceQuantity: Long,
    val varianceValue: BigDecimal,
    val variancePercentage: Double
)

// ==================== VAT Report ====================

data class VatReportDto(
    val startDate: LocalDate,
    val endDate: LocalDate,
    val totalOutputVat: BigDecimal,  // VAT collected from sales
    val totalInputVat: BigDecimal,   // VAT paid on purchases
    val netVatPayable: BigDecimal,   // Output VAT - Input VAT
    val totalSalesExcludingVat: BigDecimal,
    val totalSalesIncludingVat: BigDecimal,
    val totalPurchasesExcludingVat: BigDecimal,
    val totalPurchasesIncludingVat: BigDecimal,
    val vatByClassification: List<VatClassificationDetailDto>,
    val salesByTaxCategory: List<SalesByTaxCategoryDto>,
    val purchasesByTaxCategory: List<PurchasesByTaxCategoryDto>
)

data class VatClassificationDetailDto(
    val classification: String,
    val vatRate: BigDecimal,
    val totalSalesAmount: BigDecimal,
    val vatCollected: BigDecimal,
    val totalPurchasesAmount: BigDecimal,
    val vatPaid: BigDecimal,
    val netVat: BigDecimal
)

data class SalesByTaxCategoryDto(
    val classification: String,
    val vatRate: BigDecimal,
    val numberOfTransactions: Long,
    val totalAmount: BigDecimal,
    val totalVat: BigDecimal,
    val amountIncludingVat: BigDecimal
)

data class PurchasesByTaxCategoryDto(
    val classification: String,
    val vatRate: BigDecimal,
    val numberOfTransactions: Long,
    val totalAmount: BigDecimal,
    val totalVat: BigDecimal,
    val amountIncludingVat: BigDecimal
)
