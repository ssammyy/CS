package com.chemsys.dto

import java.util.*

/**
 * DTOs for AI Chat functionality
 */

/**
 * Request DTO for chat messages
 */
data class ChatRequest(
    val message: String,
    val branchId: UUID? = null,
    val conversationId: String? = null
)

/**
 * Response DTO for chat messages
 */
data class ChatResponse(
    val response: String,
    val conversationId: String,
    val suggestions: List<String> = emptyList()
)

/**
 * DTO for business context data sent to AI
 */
data class BusinessContextDto(
    val inventorySummary: InventorySummaryDto,
    val salesSummary: SalesSummaryDto,
    val topProducts: List<TopProductSummaryDto>,
    val lowStockProducts: List<LowStockSummaryDto>,
    val creditSummary: CreditSummaryDto,
    val customerSummary: CustomerSummaryDto,
    val supplierSummary: AiSupplierSummaryDto,
    val userSummary: UserSummaryDto,
    val purchaseOrderSummary: AiPurchaseOrderSummaryDto,
    val branchSummary: BranchSummaryDto,
    val productCategorySummary: ProductCategorySummaryDto,
    val saleReturnSummary: SaleReturnSummaryDto,
    val creditPaymentSummary: CreditPaymentSummaryDto,
    val inventoryTransactionSummary: InventoryTransactionSummaryDto,
    val inventoryAuditSummary: InventoryAuditSummaryDto,
    val taxSummary: TaxSummaryDto,
    val paymentMethodSummary: PaymentMethodSummaryDto
)

/**
 * Summary of inventory data for AI context
 */
data class InventorySummaryDto(
    val totalProducts: Long,
    val totalStockValue: String,
    val lowStockCount: Long,
    val outOfStockCount: Long,
    val expiringWithin30Days: Long
)

/**
 * Summary of sales data for AI context
 */
data class SalesSummaryDto(
    val totalSalesToday: String,
    val totalSalesThisWeek: String,
    val totalSalesThisMonth: String,
    val totalSalesThisYear: String,
    val totalSalesAllTime: String,
    val averageSaleValue: String,
    val salesCountToday: Long,
    val salesCountThisWeek: Long,
    val salesCountThisMonth: Long,
    val salesCountThisYear: Long,
    val salesCountAllTime: Long,
    val salesByStatus: Map<String, Long>,
    val salesByStatusValue: Map<String, String>,
    val topSalesDays: List<TopSalesDayDto>,
    val salesTrend: SalesTrendDto
)

/**
 * Top sales day information
 */
data class TopSalesDayDto(
    val date: String,
    val salesCount: Long,
    val totalSales: String
)

/**
 * Sales trend information
 */
data class SalesTrendDto(
    val growthThisMonth: String,
    val growthThisWeek: String,
    val averageDailySales: String,
    val bestDay: String,
    val bestDaySales: String
)

/**
 * Summary of top products for AI context
 */
data class TopProductSummaryDto(
    val productName: String,
    val totalSold: Long,
    val revenue: String
)

/**
 * Summary of low stock products for AI context
 */
data class LowStockSummaryDto(
    val productName: String,
    val currentStock: Int,
    val minStockLevel: Int
)

/**
 * Summary of credit data for AI context
 */
data class CreditSummaryDto(
    val totalActiveAccounts: Long,
    val totalOutstanding: String,
    val overdueAccounts: Long,
    val overdueAmount: String
)

/**
 * Summary of customer data for AI context
 */
data class CustomerSummaryDto(
    val totalCustomers: Long,
    val activeCustomers: Long,
    val newCustomersThisMonth: Long,
    val topCustomers: List<TopCustomerDto>
)

/**
 * Summary of supplier data for AI context
 * Note: This is a simplified version for AI context, different from SupplierDto.SupplierSummaryDto
 */
data class AiSupplierSummaryDto(
    val totalSuppliers: Long,
    val activeSuppliers: Long,
    val suppliersByCategory: Map<String, Long>
)

/**
 * Summary of user/staff data for AI context
 */
data class UserSummaryDto(
    val totalUsers: Long,
    val activeUsers: Long,
    val usersByRole: Map<String, Long>
)

/**
 * Summary of purchase order data for AI context
 * Note: This is a simplified version for AI context, different from PurchaseOrderDto.PurchaseOrderSummaryDto
 */
data class AiPurchaseOrderSummaryDto(
    val totalPurchaseOrders: Long,
    val pendingOrders: Long,
    val totalOrderValue: String,
    val recentOrders: List<RecentPurchaseOrderDto>
)

/**
 * Summary of branch data for AI context
 */
data class BranchSummaryDto(
    val totalBranches: Long,
    val activeBranches: Long,
    val branches: List<BranchInfoDto>
)

/**
 * Branch information for AI context with performance metrics
 */
data class BranchInfoDto(
    val branchName: String,
    val location: String,
    val isActive: Boolean,
    val userCount: Long,
    val salesMetrics: BranchSalesMetricsDto,
    val customerMetrics: BranchCustomerMetricsDto,
    val inventoryMetrics: BranchInventoryMetricsDto
)

/**
 * Sales metrics for a branch
 */
data class BranchSalesMetricsDto(
    val totalSalesThisMonth: String,
    val salesCountThisMonth: Long,
    val averageSaleValue: String,
    val totalSalesToday: String,
    val salesCountToday: Long,
    val totalSalesAllTime: String
)

/**
 * Customer transaction metrics for a branch
 */
data class BranchCustomerMetricsDto(
    val totalCustomers: Long,
    val activeCustomers: Long,
    val transactionsThisMonth: Long,
    val averageTransactionValue: String
)

/**
 * Inventory metrics for a branch
 */
data class BranchInventoryMetricsDto(
    val totalProducts: Long,
    val totalStockValue: String,
    val lowStockCount: Long,
    val outOfStockCount: Long
)

/**
 * Summary of product categories for AI context
 */
data class ProductCategorySummaryDto(
    val totalCategories: Long,
    val categoriesByProductCount: Map<String, Long>
)

/**
 * Top customer information
 */
data class TopCustomerDto(
    val customerName: String,
    val totalPurchases: String,
    val purchaseCount: Long
)

/**
 * Recent purchase order information
 */
data class RecentPurchaseOrderDto(
    val orderNumber: String,
    val supplierName: String,
    val totalAmount: String,
    val status: String
)

/**
 * Summary of sale returns for AI context
 */
data class SaleReturnSummaryDto(
    val totalReturns: Long,
    val totalReturnValue: String,
    val returnsThisMonth: Long,
    val returnsThisMonthValue: String,
    val topReturnedProducts: List<TopReturnedProductDto>
)

/**
 * Top returned product information
 */
data class TopReturnedProductDto(
    val productName: String,
    val returnCount: Long,
    val totalReturnValue: String
)

/**
 * Summary of credit payments for AI context
 */
data class CreditPaymentSummaryDto(
    val totalPayments: Long,
    val totalPaymentAmount: String,
    val paymentsThisMonth: Long,
    val paymentsThisMonthAmount: String,
    val averagePaymentAmount: String,
    val recentPayments: List<RecentCreditPaymentDto>
)

/**
 * Recent credit payment information
 */
data class RecentCreditPaymentDto(
    val customerName: String,
    val amount: String,
    val paymentDate: String,
    val creditAccountNumber: String
)

/**
 * Summary of inventory transactions for AI context
 */
data class InventoryTransactionSummaryDto(
    val totalTransactions: Long,
    val transactionsThisMonth: Long,
    val transactionsByType: Map<String, Long>,
    val totalTransactionValue: String,
    val recentTransactions: List<RecentInventoryTransactionDto>
)

/**
 * Recent inventory transaction information
 */
data class RecentInventoryTransactionDto(
    val productName: String,
    val transactionType: String,
    val quantity: Int,
    val branchName: String,
    val date: String
)

/**
 * Summary of inventory audit logs for AI context
 */
data class InventoryAuditSummaryDto(
    val totalAuditEntries: Long,
    val auditEntriesThisMonth: Long,
    val auditEntriesByType: Map<String, Long>,
    val recentAuditEntries: List<RecentAuditEntryDto>
)

/**
 * Recent audit entry information
 */
data class RecentAuditEntryDto(
    val productName: String,
    val transactionType: String,
    val quantityChanged: Int,
    val branchName: String,
    val sourceReference: String,
    val date: String
)

/**
 * Summary of tax configuration and settings for AI context
 */
data class TaxSummaryDto(
    val isVatEnabled: Boolean,
    val vatRate: String?,
    val totalTaxCollected: String,
    val taxCollectedThisMonth: String,
    val taxConfigurations: List<TaxConfigurationDto>
)

/**
 * Tax configuration information
 */
data class TaxConfigurationDto(
    val classification: String,
    val rate: String,
    val description: String
)

/**
 * Summary of payment methods for AI context
 */
data class PaymentMethodSummaryDto(
    val paymentMethods: Map<String, PaymentMethodStatsDto>,
    val totalPayments: Long,
    val totalPaymentAmount: String
)

/**
 * Payment method statistics
 */
data class PaymentMethodStatsDto(
    val count: Long,
    val totalAmount: String,
    val percentage: String
)
