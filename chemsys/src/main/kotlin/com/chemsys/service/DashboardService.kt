package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.*
import com.chemsys.entity.SaleReturnStatus
import com.chemsys.entity.UserRole
import com.chemsys.repository.*
import org.slf4j.LoggerFactory
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.data.domain.PageRequest
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
    private val saleLineItemRepository: SaleLineItemRepository,
    private val productRepository: com.chemsys.repository.ProductRepository,
    private val inventoryRepository: com.chemsys.repository.InventoryRepository,
    private val creditAccountRepository: CreditAccountRepository,
    private val creditPaymentRepository: CreditPaymentRepository,
    private val userRepository: UserRepository,
    private val userBranchRepository: UserBranchRepository,
    private val branchRepository: BranchRepository
) {

    companion object {
        private val logger = LoggerFactory.getLogger(DashboardService::class.java)
        /** Commission rate for cashiers: 15% of profit (selling price minus cost) per item sold. */
        private val CASHIER_COMMISSION_RATE = BigDecimal("0.15")
    }

    /**
     * Get comprehensive dashboard statistics
     * For CASHIER role, automatically filters to their assigned branches
     */
    @Transactional(readOnly = true)
    fun getDashboardStats(branchId: UUID?): DashboardStatsDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Get current user and enforce branch restrictions for cashiers
        val currentUsername = SecurityContextHolder.getContext()?.authentication?.name
        val currentUser = if (currentUsername != null) {
            userRepository.findByUsername(currentUsername)
        } else {
            null
        }

        // For CASHIER and MANAGER: personalize sales stats to their own sales across all branches
        val filterSalesByCashier = currentUser != null && 
            (currentUser.role == UserRole.CASHIER || currentUser.role == UserRole.MANAGER)
        val cashierIdForStats = if (filterSalesByCashier) currentUser!!.id!! else null

        // For CASHIER role, enforce branch filtering for inventory/credit (non-sales stats)
        val effectiveBranchId = if (currentUser?.role == UserRole.CASHIER) {
            val userBranches = userBranchRepository.findByUserIdAndTenantId(currentUser.id!!, currentTenantId)
            if (userBranches.isEmpty()) {
                // Cashier with no assigned branches - return empty stats

                return DashboardStatsDto(
                    salesStats = SalesStatsDto(
                        totalSalesToday = BigDecimal.ZERO,
                        totalSalesThisWeek = BigDecimal.ZERO,
                        totalSalesThisMonth = BigDecimal.ZERO,
                        totalSalesThisYear = BigDecimal.ZERO,
                        salesCountToday = 0L,
                        salesCountThisWeek = 0L,
                        salesCountThisMonth = 0L,
                        salesCountThisYear = 0L,
                        averageSaleValue = BigDecimal.ZERO,
                        cashierTotalEarnings = BigDecimal.ZERO,
                        cashierEarningsToday = BigDecimal.ZERO,
                        cashierEarningsThisWeek = BigDecimal.ZERO,
                        cashierEarningsThisMonth = BigDecimal.ZERO,
                        cashierEarningsThisYear = BigDecimal.ZERO
                    ),
                    inventoryStats = InventoryStatsDto(
                        totalProducts = 0L,
                        totalStockValue = BigDecimal.ZERO,
                        lowStockCount = 0L,
                        outOfStockCount = 0L,
                        expiringWithin30Days = 0L,
                        expiringWithin90Days = 0L
                    ),
                    creditStats = CreditStatsDto(
                        totalActiveCreditAccounts = 0L,
                        totalOutstandingAmount = BigDecimal.ZERO,
                        overdueAccounts = 0L,
                        overdueAmount = BigDecimal.ZERO,
                        paymentsReceivedToday = BigDecimal.ZERO,
                        paymentsReceivedThisWeek = BigDecimal.ZERO,
                        paymentsReceivedThisMonth = BigDecimal.ZERO
                    ),
                    revenueStats = RevenueStatsDto(emptyList(), emptyList(), emptyList(), emptyList()),
                    topProducts = emptyList(),
                    recentSales = emptyList(),
                    lowStockProducts = emptyList()
                )
            }
            // If cashier specified a branchId, validate it's in their allowed branches
            if (branchId != null) {
                val allowedBranchIds = userBranches.map { it.branch.id!! }
                if (!allowedBranchIds.contains(branchId)) {
                    throw IllegalStateException("Access denied: You can only view data from your assigned branches")
                }
                branchId
            } else {
                // If cashier has only one branch, use it; otherwise use first branch
                if (userBranches.size == 1) {
                    userBranches.first().branch.id!!
                } else {
                    // Multiple branches - use primary or first
                    userBranches.find { it.isPrimary }?.branch?.id ?: userBranches.first().branch.id!!
                }
            }
        } else {
            // ADMIN/MANAGER can see all branches or specific branch
            branchId
        }

        return DashboardStatsDto(
            salesStats = getSalesStats(effectiveBranchId, currentTenantId, cashierIdForStats),
            inventoryStats = getInventoryStats(effectiveBranchId, currentTenantId),
            creditStats = getCreditStats(effectiveBranchId, currentTenantId),
            revenueStats = getRevenueStats(effectiveBranchId, currentTenantId, cashierIdForStats),
            topProducts = getTopProducts(10, effectiveBranchId, currentTenantId),
            recentSales = getRecentSales(10, effectiveBranchId, currentTenantId, cashierIdForStats),
            lowStockProducts = getLowStockProducts(effectiveBranchId, currentTenantId)
        )
    }

    /**
     * Get sales statistics.
     * When cashierId is set (CASHIER/MANAGER), stats are filtered to that user's sales across all branches.
     */
    private fun getSalesStats(branchId: UUID?, tenantId: UUID, cashierId: UUID? = null): SalesStatsDto {
        val now = OffsetDateTime.now()
        val today = now.toLocalDate()
        val startOfWeek = today.minusDays(today.dayOfWeek.value.toLong() - 1)
        val startOfMonth = today.withDayOfMonth(1)
        val startOfYear = today.withDayOfYear(1)

        val totalSalesToday = getSalesTotalForPeriod(today.atStartOfDay().atOffset(now.offset), now, branchId, tenantId, cashierId)
        val totalSalesThisWeek = getSalesTotalForPeriod(startOfWeek.atStartOfDay().atOffset(now.offset), now, branchId, tenantId, cashierId)
        val totalSalesThisMonth = getSalesTotalForPeriod(startOfMonth.atStartOfDay().atOffset(now.offset), now, branchId, tenantId, cashierId)
        val totalSalesThisYear = getSalesTotalForPeriod(startOfYear.atStartOfDay().atOffset(now.offset), now, branchId, tenantId, cashierId)

        val salesCountToday = getSalesCountForPeriod(today.atStartOfDay().atOffset(now.offset), now, branchId, tenantId, cashierId)
        val salesCountThisWeek = getSalesCountForPeriod(startOfWeek.atStartOfDay().atOffset(now.offset), now, branchId, tenantId, cashierId)
        val salesCountThisMonth = getSalesCountForPeriod(startOfMonth.atStartOfDay().atOffset(now.offset), now, branchId, tenantId, cashierId)
        val salesCountThisYear = getSalesCountForPeriod(startOfYear.atStartOfDay().atOffset(now.offset), now, branchId, tenantId, cashierId)

        val averageSaleValue = if (salesCountThisMonth > 0)
            totalSalesThisMonth.divide(BigDecimal(salesCountThisMonth), 2, RoundingMode.HALF_UP)
        else
            BigDecimal.ZERO

        // Cashier commission per period (15% of profit); only when stats are for a cashier
        val cashierEarningsToday = if (cashierId != null) {
            computeCashierEarningsForPeriod(cashierId, tenantId, today.atStartOfDay().atOffset(now.offset), now)
        } else null
        val cashierEarningsThisWeek = if (cashierId != null) {
            computeCashierEarningsForPeriod(cashierId, tenantId, startOfWeek.atStartOfDay().atOffset(now.offset), now)
        } else null
        val cashierEarningsThisMonth = if (cashierId != null) {
            computeCashierEarningsForPeriod(cashierId, tenantId, startOfMonth.atStartOfDay().atOffset(now.offset), now)
        } else null
        val cashierEarningsThisYear = if (cashierId != null) {
            computeCashierEarningsForPeriod(cashierId, tenantId, startOfYear.atStartOfDay().atOffset(now.offset), now)
        } else null

        return SalesStatsDto(
            totalSalesToday = totalSalesToday,
            totalSalesThisWeek = totalSalesThisWeek,
            totalSalesThisMonth = totalSalesThisMonth,
            totalSalesThisYear = totalSalesThisYear,
            salesCountToday = salesCountToday,
            salesCountThisWeek = salesCountThisWeek,
            salesCountThisMonth = salesCountThisMonth,
            salesCountThisYear = salesCountThisYear,
            averageSaleValue = averageSaleValue,
            cashierTotalEarnings = cashierEarningsThisMonth,
            cashierEarningsToday = cashierEarningsToday,
            cashierEarningsThisWeek = cashierEarningsThisWeek,
            cashierEarningsThisMonth = cashierEarningsThisMonth,
            cashierEarningsThisYear = cashierEarningsThisYear
        )
    }

    /**
     * Computes cashier commission for a date range: 15% of profit per line item.
     */
    private fun computeCashierEarningsForPeriod(
        cashierId: UUID,
        tenantId: UUID,
        start: OffsetDateTime,
        end: OffsetDateTime
    ): BigDecimal {
        val lineItems = saleLineItemRepository.findByCashierIdAndSaleDateBetweenWithInventory(
            cashierId, tenantId, start, end, SaleReturnStatus.NONE
        )
        return lineItems.sumOf { li ->
            val costPerUnit = li.inventory.product.unitCost ?: li.inventory.unitCost ?: BigDecimal.ZERO
            val profitPerUnit = (li.unitPrice - costPerUnit).max(BigDecimal.ZERO)
            val quantitySold = BigDecimal(li.quantity - li.returnedQuantity).max(BigDecimal.ZERO)
            profitPerUnit.multiply(quantitySold).multiply(CASHIER_COMMISSION_RATE)
        }.setScale(2, RoundingMode.HALF_UP)
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

        val totalStockValue = inventoryItems.sumOf { it.quantity.toBigDecimal() * (it.product.sellingPrice ?: it.sellingPrice ?: BigDecimal.ZERO) }
        
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
     * Get revenue statistics with trends.
     * When cashierId is set, revenue is filtered to that user's sales.
     */
    private fun getRevenueStats(branchId: UUID?, tenantId: UUID, cashierId: UUID? = null): RevenueStatsDto {
        val now = OffsetDateTime.now()
        val last30Days = now.minusDays(30)

        // Get daily revenue for last 30 days
        val dailyRevenue = getDailyRevenue(last30Days, now, branchId, tenantId, cashierId)
        
        // Get weekly revenue for last 12 weeks
        val weeklyRevenue = getWeeklyRevenue(now.minusWeeks(12), now, branchId, tenantId, cashierId)
        
        // Get monthly revenue for last 12 months
        val monthlyRevenue = getMonthlyRevenue(now.minusMonths(12), now, branchId, tenantId, cashierId)
        
        // Get revenue by payment method
        val revenueByPaymentMethod = getRevenueByPaymentMethod(branchId, tenantId, cashierId)

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
     * Get recent sales.
     * When cashierId is set, returns only that user's sales across all branches.
     */
    private fun getRecentSales(limit: Int, branchId: UUID?, tenantId: UUID, cashierId: UUID? = null): List<RecentSaleDto> {
        val sales = when {
            cashierId != null -> saleRepository.findByCashierIdAndTenantIdOrderBySaleDateDesc(
                cashierId, tenantId, PageRequest.of(0, limit)
            ).content
            branchId != null -> saleRepository.findByBranchIdAndTenantId(branchId, tenantId).take(limit)
            else -> saleRepository.findByTenantId(tenantId).take(limit)
        }

        return sales.map { sale ->
            val lineItemsSummary = sale.lineItems
                .joinToString(", ") { item -> "${item.product.name} x${item.quantity}" }
                .ifEmpty { "—" }
            RecentSaleDto(
                saleId = sale.id.toString(),
                saleNumber = sale.saleNumber,
                customerName = sale.customerName ?: "Walk-in Customer",
                totalAmount = sale.totalAmount,
                saleDate = sale.saleDate.toString(),
                status = sale.status.name,
                lineItemsSummary = lineItemsSummary
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

    /**
     * Get onboarding status for the current tenant
     * Checks if branches, users, products, and inventory have been set up
     */
    @Transactional(readOnly = true)
    fun getOnboardingStatus(): OnboardingStatusDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Check if branches exist (at least 1)
        val hasBranches = branchRepository.countByTenantIdAndActive(currentTenantId) > 0

        // Check if users exist (more than just the initial admin - count > 1 to exclude platform admin)
        val userCount = userRepository.countByTenantId(currentTenantId)
        val hasUsers = userCount > 1 // More than just the platform admin

        // Check if products exist
        val hasProducts = productRepository.countByTenantId(currentTenantId) > 0

        // Check if inventory exists (at least one inventory item)
        val inventoryCount = inventoryRepository.findByTenantId(currentTenantId).size
        val hasInventory = inventoryCount > 0

        // Determine current step
        val currentStep = when {
            !hasBranches -> OnboardingStep.SETUP_BRANCHES
            !hasUsers -> OnboardingStep.ADD_USERS
            !hasProducts -> OnboardingStep.ADD_PRODUCTS
            !hasInventory -> OnboardingStep.MANAGE_INVENTORY
            else -> OnboardingStep.COMPLETED
        }

        // Build steps list
        val steps = listOf(
            OnboardingStepDto(
                step = OnboardingStep.SETUP_BRANCHES,
                title = "Setup Your First Branch",
                description = "Create a branch to organize your business locations. You'll need at least one branch to get started.",
                completed = hasBranches,
                route = "/branches",
                icon = "store"
            ),
            OnboardingStepDto(
                step = OnboardingStep.ADD_USERS,
                title = "Add Team Members",
                description = "Invite users and assign them to branches. Each user can have different roles and permissions.",
                completed = hasUsers,
                route = "/users",
                icon = "group"
            ),
            OnboardingStepDto(
                step = OnboardingStep.ADD_PRODUCTS,
                title = "Add Products to Catalog",
                description = "Add products to your inventory catalog. You can add details like name, price, and stock levels.",
                completed = hasProducts,
                route = "/products",
                icon = "inventory"
            ),
            OnboardingStepDto(
                step = OnboardingStep.MANAGE_INVENTORY,
                title = "Manage Inventory",
                description = "Add stock to your branches. You can receive goods, transfer between branches, and track inventory levels.",
                completed = hasInventory,
                route = "/inventory",
                icon = "warehouse"
            )
        )

        return OnboardingStatusDto(
            hasBranches = hasBranches,
            hasUsers = hasUsers,
            hasProducts = hasProducts,
            hasInventory = hasInventory,
            currentStep = currentStep,
            steps = steps
        )
    }

    // Helper methods

    private fun getSalesTotalForPeriod(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID, cashierId: UUID? = null): BigDecimal {
        val sales = when {
            cashierId != null -> saleRepository.findBySaleDateBetweenAndCashierIdAndTenantIdAndReturnStatus(
                start, end, cashierId, tenantId, SaleReturnStatus.NONE
            )
            branchId != null -> saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(start, end, branchId, tenantId, returnStatus = SaleReturnStatus.NONE)
            else -> saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(start, end, tenantId, returnStatus = SaleReturnStatus.NONE)
        }
        return sales.sumOf { it.totalAmount }
    }

    private fun getSalesCountForPeriod(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID, cashierId: UUID? = null): Long {
        return when {
            cashierId != null -> saleRepository.countBySaleDateBetweenAndCashierIdAndTenantIdAndReturnStatus(
                start, end, cashierId, tenantId, SaleReturnStatus.NONE
            )
            branchId != null -> saleRepository.countBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(start, end, branchId, tenantId)
            else -> saleRepository.countBySaleDateBetweenAndTenantIdAndReturnStatus(start, end, tenantId)
        }
    }

    private fun getPaymentsForPeriod(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID): BigDecimal {
        val payments = if (branchId != null)
            creditPaymentRepository.findByPaymentDateBetweenAndBranchId(start, end, branchId, tenantId)
        else
            creditPaymentRepository.findByPaymentDateBetweenAndTenantId(start, end, tenantId)
        
        return payments.sumOf { it.amount }
    }

    private fun getDailyRevenue(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID, cashierId: UUID? = null): List<DailyRevenueDto> {
        val sales = when {
            cashierId != null -> saleRepository.findBySaleDateBetweenAndCashierIdAndTenantIdAndReturnStatus(start, end, cashierId, tenantId, SaleReturnStatus.NONE)
            branchId != null -> saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(start, end, branchId, tenantId, returnStatus = SaleReturnStatus.NONE)
            else -> saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(start, end, tenantId, returnStatus = SaleReturnStatus.NONE)
        }

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

    private fun getWeeklyRevenue(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID, cashierId: UUID? = null): List<WeeklyRevenueDto> {
        // Simplified implementation - group by week
        return emptyList() // TODO: Implement proper weekly grouping
    }

    private fun getMonthlyRevenue(start: OffsetDateTime, end: OffsetDateTime, branchId: UUID?, tenantId: UUID, cashierId: UUID? = null): List<MonthlyRevenueDto> {
        val sales = when {
            cashierId != null -> saleRepository.findBySaleDateBetweenAndCashierIdAndTenantIdAndReturnStatus(start, end, cashierId, tenantId, SaleReturnStatus.NONE)
            branchId != null -> saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(start, end, branchId, tenantId, returnStatus = SaleReturnStatus.NONE)
            else -> saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(start, end, tenantId, returnStatus = SaleReturnStatus.NONE)
        }

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

    private fun getRevenueByPaymentMethod(branchId: UUID?, tenantId: UUID, cashierId: UUID? = null): List<PaymentMethodRevenueDto> {
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)

        val sales = when {
            cashierId != null -> saleRepository.findBySaleDateBetweenAndCashierIdAndTenantIdAndReturnStatus(startOfMonth, now, cashierId, tenantId, SaleReturnStatus.NONE)
            branchId != null -> saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(startOfMonth, now, branchId, tenantId, returnStatus = SaleReturnStatus.NONE)
            else -> saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(startOfMonth, now, tenantId, returnStatus = SaleReturnStatus.NONE)
        }

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

