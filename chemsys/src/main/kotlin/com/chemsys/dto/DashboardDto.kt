package com.chemsys.dto

import java.math.BigDecimal
import java.time.LocalDate

/**
 * DTOs for dashboard statistics and analytics
 */

data class DashboardStatsDto(
    val salesStats: SalesStatsDto,
    val inventoryStats: InventoryStatsDto,
    val creditStats: CreditStatsDto,
    val revenueStats: RevenueStatsDto,
    val topProducts: List<TopProductDto>,
    val recentSales: List<RecentSaleDto>,
    val lowStockProducts: List<LowStockProductDto>
)

data class SalesStatsDto(
    val totalSalesToday: BigDecimal,
    val totalSalesThisWeek: BigDecimal,
    val totalSalesThisMonth: BigDecimal,
    val totalSalesThisYear: BigDecimal,
    val salesCountToday: Long,
    val salesCountThisWeek: Long,
    val salesCountThisMonth: Long,
    val salesCountThisYear: Long,
    val averageSaleValue: BigDecimal,
    /**
     * Total commission (earnings) for the cashier this month; backward compatible.
     * Prefer cashierEarningsThisMonth for new code.
     */
    val cashierTotalEarnings: BigDecimal? = null,
    /**
     * Cashier commission (15% of profit) per period. Only populated when stats are for a cashier (CASHIER/MANAGER).
     */
    val cashierEarningsToday: BigDecimal? = null,
    val cashierEarningsThisWeek: BigDecimal? = null,
    val cashierEarningsThisMonth: BigDecimal? = null,
    val cashierEarningsThisYear: BigDecimal? = null
)

data class InventoryStatsDto(
    val totalProducts: Long,
    val totalStockValue: BigDecimal,
    val lowStockCount: Long,
    val outOfStockCount: Long,
    val expiringWithin30Days: Long,
    val expiringWithin90Days: Long
)

data class CreditStatsDto(
    val totalActiveCreditAccounts: Long,
    val totalOutstandingAmount: BigDecimal,
    val overdueAccounts: Long,
    val overdueAmount: BigDecimal,
    val paymentsReceivedToday: BigDecimal,
    val paymentsReceivedThisWeek: BigDecimal,
    val paymentsReceivedThisMonth: BigDecimal
)

data class RevenueStatsDto(
    val dailyRevenue: List<DailyRevenueDto>,
    val weeklyRevenue: List<WeeklyRevenueDto>,
    val monthlyRevenue: List<MonthlyRevenueDto>,
    val revenueByPaymentMethod: List<PaymentMethodRevenueDto>
)

data class DailyRevenueDto(
    val date: LocalDate,
    val revenue: BigDecimal,
    val salesCount: Long
)

data class WeeklyRevenueDto(
    val weekStart: LocalDate,
    val weekEnd: LocalDate,
    val revenue: BigDecimal,
    val salesCount: Long
)

data class MonthlyRevenueDto(
    val month: String,
    val year: Int,
    val revenue: BigDecimal,
    val salesCount: Long
)

data class PaymentMethodRevenueDto(
    val paymentMethod: String,
    val amount: BigDecimal,
    val percentage: Double
)

data class TopProductDto(
    val productId: String,
    val productName: String,
    val quantitySold: Long,
    val revenue: BigDecimal,
    val salesCount: Long
)

/**
 * DTO for a recent sale in dashboard stats.
 * @param lineItemsSummary What was sold (e.g. "Paracetamol x2, Soap x1") for quick scanability.
 */
data class RecentSaleDto(
    val saleId: String,
    val saleNumber: String,
    val customerName: String?,
    val totalAmount: BigDecimal,
    val saleDate: String,
    val status: String,
    val lineItemsSummary: String = ""
)

data class LowStockProductDto(
    val productId: String,
    val productName: String,
    val currentStock: Long,
    val minStockLevel: Int,
    val daysUntilStockOut: Int?
)

/**
 * DTOs for onboarding/guided setup flow
 */
data class OnboardingStatusDto(
    val hasBranches: Boolean,
    val hasUsers: Boolean,
    val hasProducts: Boolean,
    val hasInventory: Boolean,
    val currentStep: OnboardingStep,
    val steps: List<OnboardingStepDto>
)

data class OnboardingStepDto(
    val step: OnboardingStep,
    val title: String,
    val description: String,
    val completed: Boolean,
    val route: String,
    val icon: String
)

enum class OnboardingStep {
    SETUP_BRANCHES,
    ADD_USERS,
    ADD_PRODUCTS,
    MANAGE_INVENTORY,
    COMPLETED
}









