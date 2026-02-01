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
 * DashboardService provides analytics and statistics for the dashboard
 */
@Service
class DashboardService(
    private val saleRepository: SaleRepository,
    private val productRepository: com.chemsys.repository.ProductRepository,
    private val inventoryRepository: com.chemsys.repository.InventoryRepository,
    private val creditAccountRepository: CreditAccountRepository,
    private val creditPaymentRepository: CreditPaymentRepository
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DashboardService::class.java)
    }

    /**
     * Get comprehensive dashboard statistics
     */
    @Transactional(readOnly = true)
    fun getDashboardStats(branchId: UUID?): DashboardStatsDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        return DashboardStatsDto(
            salesStats = getSalesStats(branchId, currentTenantId),
            inventoryStats = getInventoryStats(branchId, currentTenantId),
            creditStats = getCreditStats(branchId, currentTenantId),
            revenueStats = getRevenueStats(branchId, currentTenantId),
            topProducts = getTopProducts(10, branchId, currentTenantId),
            recentSales = getRecentSales(10, branchId, currentTenantId),
            lowStockProducts = getLowStockProducts(branchId, currentTenantId)
        )
    }

    /**
     * Get sales statistics
     */
    private fun getSalesStats(branchId: UUID?, tenantId: UUID): SalesStatsDto {
        val now = OffsetDateTime.now()
        val today = now.toLocalDate()
        val startOfWeek = today.minusDays(today.dayOfWeek.value.toLong() - 1)
        val startOfMonth = today.withDayOfMonth(1)
        val startOfYear = today.withDayOfYear(1)

        val totalSalesToday = getSalesTotalForPeriod(today.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)
        val totalSalesThisWeek = getSalesTotalForPeriod(startOfWeek.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)
        val totalSalesThisMonth = getSalesTotalForPeriod(startOfMonth.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)
        val totalSalesThisYear = getSalesTotalForPeriod(startOfYear.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)

        val salesCountToday = getSalesCountForPeriod(today.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)
        val salesCountThisWeek = getSalesCountForPeriod(startOfWeek.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)
        val salesCountThisMonth = getSalesCountForPeriod(startOfMonth.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)
        val salesCountThisYear = getSalesCountForPeriod(startOfYear.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)

        val averageSaleValue = if (salesCountThisMonth > 0) 
            totalSalesThisMonth.divide(BigDecimal(salesCountThisMonth), 2, RoundingMode.HALF_UP)
        else 
            BigDecimal.ZERO

        return SalesStatsDto(
            totalSalesToday = totalSalesToday,
            totalSalesThisWeek = totalSalesThisWeek,
            totalSalesThisMonth = totalSalesThisMonth,
            totalSalesThisYear = totalSalesThisYear,
            salesCountToday = salesCountToday,
            salesCountThisWeek = salesCountThisWeek,
            salesCountThisMonth = salesCountThisMonth,
            salesCountThisYear = salesCountThisYear,
            averageSaleValue = averageSaleValue
        )
    }

    /**
     * Get inventory statistics
     */
    private fun getInventoryStats(branchId: UUID?, tenantId: UUID): InventoryStatsDto {
        val totalProducts = if (branchId != null)
            productRepository.countByTenantId(tenantId)
        else
            productRepository.countByTenantId(tenantId)

        val inventoryItems = if (branchId != null)
            inventoryRepository.findByTenantIdAndBranchId(tenantId, branchId)
        else
            inventoryRepository.findByTenantId(tenantId)

        val totalStockValue = inventoryItems.sumOf { it.quantity.toBigDecimal() * (it.sellingPrice ?: BigDecimal.ZERO) }
        
        val lowStockCount = inventoryItems.count { inv ->
            val product = inv.product
            inv.quantity < product.minStockLevel
        }.toLong()

        val outOfStockCount = inventoryItems.count { it.quantity == 0 }.toLong()

        val now = LocalDate.now()
        val expiringWithin30Days = inventoryItems.count { inv ->
            inv.expiryDate?.let { expiry ->
                expiry.isAfter(now) && expiry.isBefore(now.plusDays(30))
            } ?: false
        }.toLong()

        val expiringWithin90Days = inventoryItems.count { inv ->
            inv.expiryDate?.let { expiry ->
                expiry.isAfter(now) && expiry.isBefore(now.plusDays(90))
            } ?: false
        }.toLong()

        return InventoryStatsDto(
            totalProducts = totalProducts,
            totalStockValue = totalStockValue,
            lowStockCount = lowStockCount,
            outOfStockCount = outOfStockCount,
            expiringWithin30Days = expiringWithin30Days,
            expiringWithin90Days = expiringWithin90Days
        )
    }

    /**
     * Get credit statistics
     */
    private fun getCreditStats(branchId: UUID?, tenantId: UUID): CreditStatsDto {
        val now = OffsetDateTime.now()
        val today = now.toLocalDate()
        val startOfWeek = today.minusDays(today.dayOfWeek.value.toLong() - 1)
        val startOfMonth = today.withDayOfMonth(1)

        val activeAccounts = if (branchId != null)
            creditAccountRepository.countByBranchIdAndTenantId(branchId, tenantId)
        else
            creditAccountRepository.countByTenantId(tenantId)

        val totalOutstanding = if (branchId != null)
            creditAccountRepository.getTotalOutstandingAmount(tenantId, branchId)
        else
            creditAccountRepository.getTotalOutstandingAmountForTenant(tenantId)

        val overdueAccounts = if (branchId != null)
            creditAccountRepository.countOverdueAccounts(tenantId, branchId, today)
        else
            creditAccountRepository.countOverdueAccountsForTenant(tenantId, today)

        val overdueAmount = if (branchId != null)
            creditAccountRepository.getOverdueAmount(tenantId, branchId)
        else
            creditAccountRepository.getOverdueAmountForTenant(tenantId)

        val paymentsToday = getPaymentsForPeriod(today.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)
        val paymentsThisWeek = getPaymentsForPeriod(startOfWeek.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)
        val paymentsThisMonth = getPaymentsForPeriod(startOfMonth.atStartOfDay().atOffset(now.offset), now, branchId, tenantId)

        return CreditStatsDto(
            totalActiveCreditAccounts = activeAccounts,
            totalOutstandingAmount = totalOutstanding,
            overdueAccounts = overdueAccounts,
            overdueAmount = overdueAmount,
            paymentsReceivedToday = paymentsToday,
            paymentsReceivedThisWeek = paymentsThisWeek,
            paymentsReceivedThisMonth = paymentsThisMonth
        )
    }

    /**
     * Get revenue statistics with trends
     */
    private fun getRevenueStats(branchId: UUID?, tenantId: UUID): RevenueStatsDto {
        val now = OffsetDateTime.now()
        val last30Days = now.minusDays(30)

        // Get daily revenue for last 30 days
        val dailyRevenue = getDailyRevenue(last30Days, now, branchId, tenantId)
        
        // Get weekly revenue for last 12 weeks
        val weeklyRevenue = getWeeklyRevenue(now.minusWeeks(12), now, branchId, tenantId)
        
        // Get monthly revenue for last 12 months
        val monthlyRevenue = getMonthlyRevenue(now.minusMonths(12), now, branchId, tenantId)
        
        // Get revenue by payment method
        val revenueByPaymentMethod = getRevenueByPaymentMethod(branchId, tenantId)

        return RevenueStatsDto(
            dailyRevenue = dailyRevenue,
            weeklyRevenue = weeklyRevenue,
            monthlyRevenue = monthlyRevenue,
            revenueByPaymentMethod = revenueByPaymentMethod
        )
    }

    /**
     * Get top selling products
     */
    private fun getTopProducts(limit: Int, branchId: UUID?, tenantId: UUID): List<TopProductDto> {
        // This is a simplified version - you'd implement proper aggregation in repository
        return emptyList() // TODO: Implement proper top products query
    }

    /**
     * Get recent sales
     */
    private fun getRecentSales(limit: Int, branchId: UUID?, tenantId: UUID): List<RecentSaleDto> {
        val sales = if (branchId != null)
            saleRepository.findByBranchIdAndTenantId(branchId, tenantId).take(limit)
        else
            saleRepository.findByTenantId(tenantId).take(limit)

        return sales.map { sale ->
            RecentSaleDto(
                saleId = sale.id.toString(),
                saleNumber = sale.saleNumber,
                customerName = sale.customerName ?: "Walk-in Customer",
                totalAmount = sale.totalAmount,
                saleDate = sale.saleDate.toString(),
                status = sale.status.name
            )
        }
    }

    /**
     * Get low stock products
     */
    private fun getLowStockProducts(branchId: UUID?, tenantId: UUID): List<LowStockProductDto> {
        val inventoryItems = if (branchId != null)
            inventoryRepository.findByTenantIdAndBranchId(tenantId, branchId)
        else
            inventoryRepository.findByTenantId(tenantId)

        return inventoryItems
            .filter { it.quantity < it.product.minStockLevel }
            .map { inv ->
                LowStockProductDto(
                    productId = inv.product.id.toString(),
                    productName = inv.product.name,
                    currentStock = inv.quantity.toLong(),
                    minStockLevel = inv.product.minStockLevel,
                    daysUntilStockOut = null // TODO: Calculate based on average daily sales
                )
            }
            .take(10)
    }

    // Helper methods

    private fun getSalesTotalForPeriod(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID): BigDecimal {
        val sales = if (branchId != null)
            saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(start, end, branchId, tenantId, returnStatus = SaleReturnStatus.NONE)
        else
            saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(start, end, tenantId, returnStatus = SaleReturnStatus.NONE)
        
        return sales.sumOf { it.totalAmount }
    }

    private fun getSalesCountForPeriod(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID): Long {
        return if (branchId != null)
            saleRepository.countBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(start, end, branchId, tenantId)
        else
            saleRepository.countBySaleDateBetweenAndTenantIdAndReturnStatus(start, end, tenantId)
    }

    private fun getPaymentsForPeriod(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID): BigDecimal {
        val payments = if (branchId != null)
            creditPaymentRepository.findByPaymentDateBetweenAndBranchId(start, end, branchId, tenantId)
        else
            creditPaymentRepository.findByPaymentDateBetweenAndTenantId(start, end, tenantId)
        
        return payments.sumOf { it.amount }
    }

    private fun getDailyRevenue(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID): List<DailyRevenueDto> {
        val sales = if (branchId != null)
            saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(start, end, branchId, tenantId, returnStatus = SaleReturnStatus.NONE)
        else
            saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(start, end, tenantId, returnStatus = SaleReturnStatus.NONE)

        return sales
            .groupBy { it.saleDate.toLocalDate() }
            .map { (date, salesForDay) ->
                DailyRevenueDto(
                    date = date,
                    revenue = salesForDay.sumOf { it.totalAmount },
                    salesCount = salesForDay.size.toLong()
                )
            }
            .sortedBy { it.date }
    }

    private fun getWeeklyRevenue(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID): List<WeeklyRevenueDto> {
        // Simplified implementation - group by week
        return emptyList() // TODO: Implement proper weekly grouping
    }

    private fun getMonthlyRevenue(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID): List<MonthlyRevenueDto> {
        val sales = if (branchId != null)
            saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(start, end, branchId, tenantId, returnStatus = SaleReturnStatus.NONE)
        else
            saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(start, end, tenantId, returnStatus = SaleReturnStatus.NONE)

        return sales
            .groupBy { it.saleDate.toLocalDate().withDayOfMonth(1) }
            .map { (monthStart, salesForMonth) ->
                MonthlyRevenueDto(
                    month = monthStart.month.name,
                    year = monthStart.year,
                    revenue = salesForMonth.sumOf { it.totalAmount },
                    salesCount = salesForMonth.size.toLong()
                )
            }
            .sortedBy { it.year * 12 + java.time.Month.valueOf(it.month).value }
    }

    private fun getRevenueByPaymentMethod(branchId: UUID?, tenantId: UUID): List<PaymentMethodRevenueDto> {
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)

        val sales = if (branchId != null)
            saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(startOfMonth, now, branchId, tenantId, returnStatus = SaleReturnStatus.NONE)
        else
            saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(startOfMonth, now, tenantId, returnStatus = SaleReturnStatus.NONE)

        val totalRevenue = sales.sumOf { it.totalAmount }
        
        val revenueByMethod = sales
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

        return revenueByMethod
    }
}

