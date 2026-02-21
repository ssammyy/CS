package com.chemsys.service

import com.chemsys.config.TenantContext
import com.chemsys.dto.*
import com.chemsys.repository.*
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.reactive.function.client.WebClient
import org.springframework.web.reactive.function.client.bodyToMono
import reactor.core.publisher.Mono
import reactor.util.retry.Retry
import java.math.BigDecimal
import java.time.Duration
import java.time.OffsetDateTime
import java.util.*
import java.util.concurrent.ConcurrentHashMap

/**
 * AI Chat Service provides intelligent business insights using AI.
 * 
 * This service:
 * - Fetches current business data (inventory, sales, etc.)
 * - Formats data into context for AI analysis
 * - Calls OpenAI API (or similar) to generate insights
 * - Returns actionable recommendations
 * 
 * The service maintains conversation context for better responses.
 */
@Service
class AiChatService(
    private val dashboardService: DashboardService,
    private val inventoryRepository: InventoryRepository,
    private val saleRepository: SaleRepository,
    private val saleLineItemRepository: SaleLineItemRepository,
    private val productRepository: ProductRepository,
    private val creditAccountRepository: CreditAccountRepository,
    private val userRepository: UserRepository,
    private val userBranchRepository: UserBranchRepository,
    private val customerRepository: CustomerRepository,
    private val supplierRepository: SupplierRepository,
    private val purchaseOrderRepository: PurchaseOrderRepository,
    private val branchRepository: BranchRepository,
    private val saleReturnRepository: SaleReturnRepository,
    private val saleReturnLineItemRepository: SaleReturnLineItemRepository,
    private val creditPaymentRepository: CreditPaymentRepository,
    private val inventoryTransactionRepository: InventoryTransactionRepository,
    private val inventoryAuditLogRepository: InventoryAuditLogRepository,
    private val taxConfigurationRepository: TaxConfigurationRepository,
    private val tenantTaxSettingsRepository: TenantTaxSettingsRepository,
    private val objectMapper: ObjectMapper,
    private val webClient: WebClient
) {

    companion object {
        private val logger = LoggerFactory.getLogger(AiChatService::class.java)
    }

    @Value("\${ai.openai.api-key:}")
    private lateinit var apiKey: String

    @Value("\${ai.openai.api-url:https://api.openai.com/v1/chat/completions}")
    private lateinit var apiUrl: String

    @Value("\${ai.openai.model:gpt-4o-mini}")
    private lateinit var model: String

    @Value("\${ai.openai.max-tokens:2000}")
    private var maxTokens: Int = 2000

    @Value("\${ai.openai.temperature:0.7}")
    private var temperature: Double = 0.7

    // In-memory conversation storage (in production, use Redis or database)
    private val conversations = ConcurrentHashMap<String, MutableList<Map<String, String>>>()

    /**
     * Process a chat message and return AI-generated response with business insights.
     * 
     * @param request The chat request containing user message and optional branch filter
     * @return ChatResponse with AI-generated insights and suggestions
     */
    @Transactional(readOnly = true)
    fun processChatMessage(request: ChatRequest): ChatResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        // Get current user and enforce branch restrictions
        val currentUsername = SecurityContextHolder.getContext()?.authentication?.name
        val currentUser = if (currentUsername != null) {
            userRepository.findByUsername(currentUsername)
        } else {
            null
        }

        // Determine effective branch ID (respecting user permissions)
        val effectiveBranchId = determineEffectiveBranchId(request.branchId, currentUser, currentTenantId)

        // Fetch business context data
        val businessContext = fetchBusinessContext(effectiveBranchId, currentTenantId)

        // Get or create conversation ID
        val conversationId = request.conversationId ?: UUID.randomUUID().toString()

        // Build system prompt with business context
        val systemPrompt = buildSystemPrompt(businessContext)

        // Get conversation history
        val conversationHistory = conversations.getOrDefault(conversationId, mutableListOf())

        // Build messages for AI
        val messages = buildMessages(systemPrompt, conversationHistory, request.message)

        // Call AI API
        val aiResponse = callAiApi(messages)

        // Update conversation history
        conversationHistory.add(mapOf("role" to "user", "content" to request.message))
        conversationHistory.add(mapOf("role" to "assistant", "content" to aiResponse))
        conversations[conversationId] = conversationHistory

        // Generate topic-based suggestions based on user's question
        val suggestions = generateTopicBasedSuggestions(request.message, businessContext, aiResponse)

        return ChatResponse(
            response = aiResponse,
            conversationId = conversationId,
            suggestions = suggestions
        )
    }

    /**
     * Determine the effective branch ID based on user permissions and request.
     */
    private fun determineEffectiveBranchId(
        requestedBranchId: UUID?,
        currentUser: com.chemsys.entity.User?,
        tenantId: UUID
    ): UUID? {
        if (currentUser?.role == com.chemsys.entity.UserRole.CASHIER) {
            val userBranches = userBranchRepository.findByUserIdAndTenantId(currentUser.id!!, tenantId)
            if (userBranches.isEmpty()) {
                return null
            }
            if (requestedBranchId != null) {
                val allowedBranchIds = userBranches.map { it.branch.id!! }
                if (!allowedBranchIds.contains(requestedBranchId)) {
                    return userBranches.first().branch.id
                }
            }
            return requestedBranchId ?: userBranches.first().branch.id
        }
        return requestedBranchId
    }

    /**
     * Fetch current business context data for AI analysis.
     */
    private fun fetchBusinessContext(branchId: UUID?, tenantId: UUID): BusinessContextDto {
        // Get dashboard stats
        val dashboardStats = dashboardService.getDashboardStats(branchId)

        // Get inventory summary
        val inventoryItems = if (branchId != null)
            inventoryRepository.findByTenantIdAndBranchId(tenantId, branchId)
        else
            inventoryRepository.findByTenantId(tenantId)

        val inventorySummary = InventorySummaryDto(
            totalProducts = dashboardStats.inventoryStats.totalProducts,
            totalStockValue = formatCurrency(dashboardStats.inventoryStats.totalStockValue),
            lowStockCount = dashboardStats.inventoryStats.lowStockCount,
            outOfStockCount = dashboardStats.inventoryStats.outOfStockCount,
            expiringWithin30Days = dashboardStats.inventoryStats.expiringWithin30Days
        )

        // Get comprehensive sales summary
        val salesSummary = getComprehensiveSalesSummary(tenantId, branchId)

        // Get top products (simplified - get from recent sales)
        val topProducts = getTopProductsSummary(tenantId, branchId)

        // Get low stock products
        val lowStockProducts = dashboardStats.lowStockProducts.take(10).map { lowStock ->
            LowStockSummaryDto(
                productName = lowStock.productName,
                currentStock = lowStock.currentStock.toInt(),
                minStockLevel = lowStock.minStockLevel
            )
        }

        // Get credit summary
        val creditSummary = CreditSummaryDto(
            totalActiveAccounts = dashboardStats.creditStats.totalActiveCreditAccounts,
            totalOutstanding = formatCurrency(dashboardStats.creditStats.totalOutstandingAmount),
            overdueAccounts = dashboardStats.creditStats.overdueAccounts,
            overdueAmount = formatCurrency(dashboardStats.creditStats.overdueAmount)
        )

        // Get customer summary
        val customerSummary = getCustomerSummary(tenantId, branchId)

        // Get supplier summary
        val supplierSummary = getSupplierSummary(tenantId)

        // Get user summary
        val userSummary = getUserSummary(tenantId)

        // Get purchase order summary
        val purchaseOrderSummary = getPurchaseOrderSummary(tenantId, branchId)

        // Get branch summary
        val branchSummary = getBranchSummary(tenantId)

        // Get product category summary
        val productCategorySummary = getProductCategorySummary(tenantId)

        // Get sale return summary
        val saleReturnSummary = getSaleReturnSummary(tenantId, branchId)

        // Get credit payment summary
        val creditPaymentSummary = getCreditPaymentSummary(tenantId, branchId)

        // Get inventory transaction summary
        val inventoryTransactionSummary = getInventoryTransactionSummary(tenantId, branchId)

        // Get inventory audit summary
        val inventoryAuditSummary = getInventoryAuditSummary(tenantId, branchId)

        // Get tax summary
        val taxSummary = getTaxSummary(tenantId)

        // Get payment method summary
        val paymentMethodSummary = getPaymentMethodSummary(tenantId, branchId)

        return BusinessContextDto(
            inventorySummary = inventorySummary,
            salesSummary = salesSummary,
            topProducts = topProducts,
            lowStockProducts = lowStockProducts,
            creditSummary = creditSummary,
            customerSummary = customerSummary,
            supplierSummary = supplierSummary,
            userSummary = userSummary,
            purchaseOrderSummary = purchaseOrderSummary,
            branchSummary = branchSummary,
            productCategorySummary = productCategorySummary,
            saleReturnSummary = saleReturnSummary,
            creditPaymentSummary = creditPaymentSummary,
            inventoryTransactionSummary = inventoryTransactionSummary,
            inventoryAuditSummary = inventoryAuditSummary,
            taxSummary = taxSummary,
            paymentMethodSummary = paymentMethodSummary
        )
    }

    /**
     * Get top products summary from sales data.
     */
    private fun getTopProductsSummary(tenantId: UUID, branchId: UUID?): List<TopProductSummaryDto> {
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)

        val sales = if (branchId != null)
            saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(
                startOfMonth, now, branchId, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
            )
        else
            saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(
                startOfMonth, now, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
            )

        val lineItems = sales.flatMap { sale ->
            saleLineItemRepository.findBySaleId(sale.id!!)
        }

        val productSales = lineItems
            .groupBy { it.product.id }
            .map { (productId, items) ->
                val product = items.first().product
                val totalQuantity = items.sumOf { it.quantity }
                val totalRevenue = items.sumOf { it.lineTotal }
                TopProductSummaryDto(
                    productName = product.name,
                    totalSold = totalQuantity.toLong(),
                    revenue = formatCurrency(totalRevenue)
                )
            }
            .sortedByDescending { it.totalSold }
            .take(10)

        return productSales
    }

    /**
     * Get customer summary for AI context.
     */
    private fun getCustomerSummary(tenantId: UUID, branchId: UUID?): CustomerSummaryDto {
        val customerStats = customerRepository.getCustomerStatistics(tenantId)
        // Defensive handling: ensure array has expected length
        val totalCustomers = if (customerStats.isNotEmpty()) customerStats[0] else 0L
        val activeCustomers = if (customerStats.size > 1) customerStats[1] else {
            // Fallback: count active customers directly if stats array is incomplete
            customerRepository.countByIsActiveTrueAndTenantId(tenantId)
        }

        // Get new customers this month
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)
        val newCustomersThisMonth = customerRepository.findByCreatedAtBetweenAndTenantId(
            startOfMonth, now, tenantId, org.springframework.data.domain.Pageable.unpaged()
        ).totalElements

        // Get top customers by sales
        val topCustomers = getTopCustomers(tenantId, branchId)

        return CustomerSummaryDto(
            totalCustomers = totalCustomers,
            activeCustomers = activeCustomers,
            newCustomersThisMonth = newCustomersThisMonth,
            topCustomers = topCustomers
        )
    }

    /**
     * Get top customers by purchase amount.
     */
    private fun getTopCustomers(tenantId: UUID, branchId: UUID?): List<TopCustomerDto> {
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)

        val sales = if (branchId != null)
            saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(
                startOfMonth, now, branchId, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
            )
        else
            saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(
                startOfMonth, now, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
            )

        val customerSales = sales
            .filter { it.customerName != null }
            .groupBy { it.customerName }
            .map { (customerName, salesList) ->
                val totalAmount = salesList.sumOf { it.totalAmount }
                TopCustomerDto(
                    customerName = customerName ?: "Unknown",
                    totalPurchases = formatCurrency(totalAmount),
                    purchaseCount = salesList.size.toLong()
                )
            }
            .sortedByDescending { it.purchaseCount }
            .take(5)

        return customerSales
    }

    /**
     * Get supplier summary for AI context.
     */
    private fun getSupplierSummary(tenantId: UUID): AiSupplierSummaryDto {
        val suppliers = supplierRepository.findByTenantId(tenantId)
        val totalSuppliers = suppliers.size.toLong()
        val activeSuppliers = suppliers.count { it.status == com.chemsys.entity.SupplierStatus.ACTIVE }.toLong()

        val suppliersByCategory = suppliers
            .groupBy { it.category.name }
            .mapValues { it.value.size.toLong() }

        return AiSupplierSummaryDto(
            totalSuppliers = totalSuppliers,
            activeSuppliers = activeSuppliers,
            suppliersByCategory = suppliersByCategory
        )
    }

    /**
     * Get user/staff summary for AI context.
     */
    private fun getUserSummary(tenantId: UUID): UserSummaryDto {
        val users = userRepository.findByTenantId(tenantId)
        val totalUsers = users.size.toLong()
        val activeUsers = users.count { it.isActive }.toLong()

        val usersByRole = users
            .groupBy { it.role.name }
            .mapValues { it.value.size.toLong() }

        return UserSummaryDto(
            totalUsers = totalUsers,
            activeUsers = activeUsers,
            usersByRole = usersByRole
        )
    }

    /**
     * Get purchase order summary for AI context.
     */
    private fun getPurchaseOrderSummary(tenantId: UUID, branchId: UUID?): AiPurchaseOrderSummaryDto {
        val purchaseOrders = if (branchId != null)
            purchaseOrderRepository.findByBranchIdAndTenantId(branchId, tenantId)
        else
            purchaseOrderRepository.findByTenantId(tenantId)

        val totalPurchaseOrders = purchaseOrders.size.toLong()
        val pendingOrders = purchaseOrders.count { 
            it.status == com.chemsys.entity.PurchaseOrderStatus.PENDING_APPROVAL ||
            it.status == com.chemsys.entity.PurchaseOrderStatus.APPROVED
        }.toLong()

        val totalOrderValue = purchaseOrders.sumOf { it.totalAmount ?: BigDecimal.ZERO }

        val recentOrders = purchaseOrders
            .sortedByDescending { it.createdAt }
            .take(5)
            .map { po ->
                RecentPurchaseOrderDto(
                    orderNumber = po.poNumber,
                    supplierName = po.supplier.name,
                    totalAmount = formatCurrency(po.totalAmount ?: BigDecimal.ZERO),
                    status = po.status.name
                )
            }

        return AiPurchaseOrderSummaryDto(
            totalPurchaseOrders = totalPurchaseOrders,
            pendingOrders = pendingOrders,
            totalOrderValue = formatCurrency(totalOrderValue),
            recentOrders = recentOrders
        )
    }

    /**
     * Get branch summary for AI context with detailed performance metrics.
     */
    private fun getBranchSummary(tenantId: UUID): BranchSummaryDto {
        val branches = branchRepository.findByTenantId(tenantId)
        val totalBranches = branches.size.toLong()
        val activeBranches = branches.count { it.isActive }.toLong()

        val now = OffsetDateTime.now()
        val today = now.toLocalDate()
        val startOfMonth = today.withDayOfMonth(1)
        val startOfToday = today.atStartOfDay().atOffset(now.offset)
        val startOfMonthDateTime = startOfMonth.atStartOfDay().atOffset(now.offset)

        val branchInfos = branches.map { branch ->
            val branchId = branch.id!!
            val userCount = userBranchRepository.countUsersByBranchId(branchId)

            // Sales metrics
            val salesMetrics = getBranchSalesMetrics(branchId, tenantId, startOfToday, now, startOfMonthDateTime)

            // Customer metrics
            val customerMetrics = getBranchCustomerMetrics(branchId, tenantId, startOfMonthDateTime, now)

            // Inventory metrics
            val inventoryMetrics = getBranchInventoryMetrics(branchId, tenantId)

            BranchInfoDto(
                branchName = branch.name,
                location = branch.location,
                isActive = branch.isActive,
                userCount = userCount,
                salesMetrics = salesMetrics,
                customerMetrics = customerMetrics,
                inventoryMetrics = inventoryMetrics
            )
        }

        return BranchSummaryDto(
            totalBranches = totalBranches,
            activeBranches = activeBranches,
            branches = branchInfos
        )
    }

    /**
     * Get sales metrics for a specific branch.
     */
    private fun getBranchSalesMetrics(
        branchId: UUID,
        tenantId: UUID,
        startOfToday: OffsetDateTime,
        now: OffsetDateTime,
        startOfMonth: OffsetDateTime
    ): BranchSalesMetricsDto {
        // Sales this month
        val salesThisMonth = saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(
            startOfMonth, now, branchId, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
        )
        val totalSalesThisMonth = salesThisMonth.sumOf { it.totalAmount }
        val salesCountThisMonth = salesThisMonth.size.toLong()
        val averageSaleValueThisMonth = if (salesCountThisMonth > 0) {
            totalSalesThisMonth.divide(BigDecimal(salesCountThisMonth), 2, java.math.RoundingMode.HALF_UP)
        } else {
            BigDecimal.ZERO
        }

        // Sales today
        val salesToday = saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(
            startOfToday, now, branchId, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
        )
        val totalSalesToday = salesToday.sumOf { it.totalAmount }
        val salesCountToday = salesToday.size.toLong()

        // Total sales all time for this branch
        val allSales = saleRepository.findByBranchIdAndTenantId(branchId, tenantId)
            .filter { it.status == com.chemsys.entity.SaleStatus.COMPLETED }
        val totalSalesAllTime = allSales.sumOf { it.totalAmount }

        return BranchSalesMetricsDto(
            totalSalesThisMonth = formatCurrency(totalSalesThisMonth),
            salesCountThisMonth = salesCountThisMonth,
            averageSaleValue = formatCurrency(averageSaleValueThisMonth),
            totalSalesToday = formatCurrency(totalSalesToday),
            salesCountToday = salesCountToday,
            totalSalesAllTime = formatCurrency(totalSalesAllTime)
        )
    }

    /**
     * Get customer metrics for a specific branch.
     */
    private fun getBranchCustomerMetrics(
        branchId: UUID,
        tenantId: UUID,
        startOfMonth: OffsetDateTime,
        now: OffsetDateTime
    ): BranchCustomerMetricsDto {
        // Get customers who made purchases at this branch
        val salesThisMonth = saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(
            startOfMonth, now, branchId, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
        )

        // Count unique customers
        val uniqueCustomers = salesThisMonth.mapNotNull { it.customerName }.distinct().size.toLong()
        val totalTransactions = salesThisMonth.size.toLong()
        val totalTransactionValue = salesThisMonth.sumOf { it.totalAmount }
        val averageTransactionValue = if (totalTransactions > 0) {
            totalTransactionValue.divide(BigDecimal(totalTransactions), 2, java.math.RoundingMode.HALF_UP)
        } else {
            BigDecimal.ZERO
        }

        // Count active customers (customers with sales this month)
        val activeCustomers = uniqueCustomers

        return BranchCustomerMetricsDto(
            totalCustomers = uniqueCustomers,
            activeCustomers = activeCustomers,
            transactionsThisMonth = totalTransactions,
            averageTransactionValue = formatCurrency(averageTransactionValue)
        )
    }

    /**
     * Get inventory metrics for a specific branch.
     */
    private fun getBranchInventoryMetrics(branchId: UUID, tenantId: UUID): BranchInventoryMetricsDto {
        val inventories = inventoryRepository.findByTenantIdAndBranchId(tenantId, branchId)
        val totalProducts = inventories.distinctBy { it.product.id }.size.toLong()
        val totalStockValue = inventories.sumOf { 
            (it.quantity.toBigDecimal() * (it.product.sellingPrice ?: it.sellingPrice ?: it.product.unitCost ?: it.unitCost ?: BigDecimal.ZERO))
        }
        val lowStockCount = inventories.count { 
            it.quantity <= it.product.minStockLevel && it.quantity > 0
        }.toLong()
        val outOfStockCount = inventories.count { it.quantity == 0 }.toLong()

        return BranchInventoryMetricsDto(
            totalProducts = totalProducts,
            totalStockValue = formatCurrency(totalStockValue),
            lowStockCount = lowStockCount,
            outOfStockCount = outOfStockCount
        )
    }

    /**
     * Get product category summary for AI context.
     * Since Product doesn't have a category field, we'll use manufacturer as a proxy for categorization.
     */
    private fun getProductCategorySummary(tenantId: UUID): ProductCategorySummaryDto {
        val products = productRepository.findByTenantId(tenantId)
        
        // Group by manufacturer (as a proxy for category) or use "Unknown" if null
        val categoriesByProductCount = products
            .groupBy { it.manufacturer ?: "Unknown Manufacturer" }
            .mapValues { it.value.size.toLong() }
            .toMap()

        return ProductCategorySummaryDto(
            totalCategories = categoriesByProductCount.size.toLong(),
            categoriesByProductCount = categoriesByProductCount
        )
    }

    /**
     * Get comprehensive sales summary for AI context.
     */
    private fun getComprehensiveSalesSummary(tenantId: UUID, branchId: UUID?): SalesSummaryDto {
        val now = OffsetDateTime.now()
        val today = now.toLocalDate()
        val startOfToday = today.atStartOfDay().atOffset(now.offset)
        val startOfWeek = today.minusDays(today.dayOfWeek.value.toLong() - 1).atStartOfDay().atOffset(now.offset)
        val startOfMonth = today.withDayOfMonth(1).atStartOfDay().atOffset(now.offset)
        val startOfYear = today.withDayOfYear(1).atStartOfDay().atOffset(now.offset)

        // Get all sales
        val allSales = if (branchId != null)
            saleRepository.findByBranchIdAndTenantId(branchId, tenantId)
        else
            saleRepository.findByTenantId(tenantId)

        // Filter by status (only completed sales for totals)
        val completedSales = allSales.filter { it.status == com.chemsys.entity.SaleStatus.COMPLETED }

        // Total sales all time
        val totalSalesAllTime = completedSales.sumOf { it.totalAmount }
        val salesCountAllTime = completedSales.size.toLong()

        // Sales today
        val salesToday = completedSales.filter { 
            it.saleDate.isAfter(startOfToday) || it.saleDate.isEqual(startOfToday) 
        }
        val totalSalesToday = salesToday.sumOf { it.totalAmount }
        val salesCountToday = salesToday.size.toLong()

        // Sales this week
        val salesThisWeek = completedSales.filter { 
            it.saleDate.isAfter(startOfWeek) || it.saleDate.isEqual(startOfWeek) 
        }
        val totalSalesThisWeek = salesThisWeek.sumOf { it.totalAmount }
        val salesCountThisWeek = salesThisWeek.size.toLong()

        // Sales this month
        val salesThisMonth = completedSales.filter { 
            it.saleDate.isAfter(startOfMonth) || it.saleDate.isEqual(startOfMonth) 
        }
        val totalSalesThisMonth = salesThisMonth.sumOf { it.totalAmount }
        val salesCountThisMonth = salesThisMonth.size.toLong()

        // Sales this year
        val salesThisYear = completedSales.filter { 
            it.saleDate.isAfter(startOfYear) || it.saleDate.isEqual(startOfYear) 
        }
        val totalSalesThisYear = salesThisYear.sumOf { it.totalAmount }
        val salesCountThisYear = salesThisYear.size.toLong()

        // Average sale value
        val averageSaleValue = if (salesCountThisMonth > 0) {
            totalSalesThisMonth.divide(BigDecimal(salesCountThisMonth), 2, java.math.RoundingMode.HALF_UP)
        } else {
            BigDecimal.ZERO
        }

        // Sales by status (all sales, not just completed)
        val salesByStatus = allSales.groupBy { it.status.name }
            .mapValues { it.value.size.toLong() }

        val salesByStatusValue = allSales.groupBy { it.status.name }
            .mapValues { formatCurrency(it.value.sumOf { sale -> sale.totalAmount }) }

        // Top sales days (last 30 days)
        val thirtyDaysAgo = today.minusDays(30).atStartOfDay().atOffset(now.offset)
        val recentSales = completedSales.filter { 
            it.saleDate.isAfter(thirtyDaysAgo) || it.saleDate.isEqual(thirtyDaysAgo) 
        }
        val topSalesDays = recentSales
            .groupBy { it.saleDate.toLocalDate() }
            .map { (date, sales) ->
                TopSalesDayDto(
                    date = date.toString(),
                    salesCount = sales.size.toLong(),
                    totalSales = formatCurrency(sales.sumOf { it.totalAmount })
                )
            }
            .sortedByDescending { it.totalSales }
            .take(7)

        // Sales trend
        val lastMonthStart = startOfMonth.minusMonths(1)
        val lastMonthSales = completedSales.filter { 
            it.saleDate.isAfter(lastMonthStart) && it.saleDate.isBefore(startOfMonth) 
        }
        val lastMonthTotal = lastMonthSales.sumOf { it.totalAmount }
        val growthThisMonth = if (lastMonthTotal > BigDecimal.ZERO) {
            val growth = ((totalSalesThisMonth - lastMonthTotal) / lastMonthTotal * BigDecimal(100))
            "${if (growth >= BigDecimal.ZERO) "+" else ""}${growth.setScale(1, java.math.RoundingMode.HALF_UP)}%"
        } else {
            "N/A"
        }

        val lastWeekStart = startOfWeek.minusWeeks(1)
        val lastWeekSales = completedSales.filter { 
            it.saleDate.isAfter(lastWeekStart) && it.saleDate.isBefore(startOfWeek) 
        }
        val lastWeekTotal = lastWeekSales.sumOf { it.totalAmount }
        val growthThisWeek = if (lastWeekTotal > BigDecimal.ZERO) {
            val growth = ((totalSalesThisWeek - lastWeekTotal) / lastWeekTotal * BigDecimal(100))
            "${if (growth >= BigDecimal.ZERO) "+" else ""}${growth.setScale(1, java.math.RoundingMode.HALF_UP)}%"
        } else {
            "N/A"
        }

        val averageDailySales = if (salesCountThisMonth > 0) {
            formatCurrency(totalSalesThisMonth.divide(BigDecimal(salesCountThisMonth), 2, java.math.RoundingMode.HALF_UP))
        } else {
            formatCurrency(BigDecimal.ZERO)
        }

        val bestDay = topSalesDays.firstOrNull()
        val salesTrend = SalesTrendDto(
            growthThisMonth = growthThisMonth,
            growthThisWeek = growthThisWeek,
            averageDailySales = averageDailySales,
            bestDay = bestDay?.date ?: "N/A",
            bestDaySales = bestDay?.totalSales ?: "N/A"
        )

        return SalesSummaryDto(
            totalSalesToday = formatCurrency(totalSalesToday),
            totalSalesThisWeek = formatCurrency(totalSalesThisWeek),
            totalSalesThisMonth = formatCurrency(totalSalesThisMonth),
            totalSalesThisYear = formatCurrency(totalSalesThisYear),
            totalSalesAllTime = formatCurrency(totalSalesAllTime),
            averageSaleValue = formatCurrency(averageSaleValue),
            salesCountToday = salesCountToday,
            salesCountThisWeek = salesCountThisWeek,
            salesCountThisMonth = salesCountThisMonth,
            salesCountThisYear = salesCountThisYear,
            salesCountAllTime = salesCountAllTime,
            salesByStatus = salesByStatus,
            salesByStatusValue = salesByStatusValue,
            topSalesDays = topSalesDays,
            salesTrend = salesTrend
        )
    }

    /**
     * Get sale return summary for AI context.
     */
    private fun getSaleReturnSummary(tenantId: UUID, branchId: UUID?): SaleReturnSummaryDto {
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)

        val allReturns = if (branchId != null)
            saleReturnRepository.findByBranchId(branchId, org.springframework.data.domain.Pageable.unpaged()).content
        else
            saleReturnRepository.findByTenantId(tenantId, org.springframework.data.domain.Pageable.unpaged()).content

        val totalReturns = allReturns.size.toLong()
        val totalReturnValue = allReturns.sumOf { it.totalRefundAmount ?: BigDecimal.ZERO }

        val returnsThisMonth = allReturns.filter { 
            it.returnDate.isAfter(startOfMonth) || it.returnDate.isEqual(startOfMonth) 
        }
        val returnsThisMonthCount = returnsThisMonth.size.toLong()
        val returnsThisMonthValue = returnsThisMonth.sumOf { it.totalRefundAmount ?: BigDecimal.ZERO }

        // Get top returned products
        val returnLineItems = returnsThisMonth.flatMap { saleReturn ->
            saleReturnLineItemRepository.findBySaleReturnId(saleReturn.id!!)
        }
        val topReturnedProducts = returnLineItems
            .groupBy { it.product.id }
            .map { (productId, items) ->
                val product = items.first().product
                val returnCount = items.size.toLong()
                val totalReturnValue = items.sumOf { it.refundAmount }
                TopReturnedProductDto(
                    productName = product.name,
                    returnCount = returnCount,
                    totalReturnValue = formatCurrency(totalReturnValue)
                )
            }
            .sortedByDescending { it.returnCount }
            .take(5)

        return SaleReturnSummaryDto(
            totalReturns = totalReturns,
            totalReturnValue = formatCurrency(totalReturnValue),
            returnsThisMonth = returnsThisMonthCount,
            returnsThisMonthValue = formatCurrency(returnsThisMonthValue),
            topReturnedProducts = topReturnedProducts
        )
    }

    /**
     * Get credit payment summary for AI context.
     */
    private fun getCreditPaymentSummary(tenantId: UUID, branchId: UUID?): CreditPaymentSummaryDto {
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)

        val allPayments = if (branchId != null)
            creditPaymentRepository.findByPaymentDateBetweenAndBranchId(
                OffsetDateTime.of(2000, 1, 1, 0, 0, 0, 0, now.offset),
                now,
                branchId,
                tenantId
            )
        else
            creditPaymentRepository.findByPaymentDateBetweenAndTenantId(
                OffsetDateTime.of(2000, 1, 1, 0, 0, 0, 0, now.offset),
                now,
                tenantId
            )

        val totalPayments = allPayments.size.toLong()
        val totalPaymentAmount = allPayments.sumOf { it.amount }
        val averagePaymentAmount = if (totalPayments > 0) {
            totalPaymentAmount.divide(BigDecimal(totalPayments), 2, java.math.RoundingMode.HALF_UP)
        } else {
            BigDecimal.ZERO
        }

        val paymentsThisMonth = allPayments.filter { 
            it.paymentDate.isAfter(startOfMonth) || it.paymentDate.isEqual(startOfMonth) 
        }
        val paymentsThisMonthCount = paymentsThisMonth.size.toLong()
        val paymentsThisMonthAmount = paymentsThisMonth.sumOf { it.amount }

        val recentPayments = allPayments
            .sortedByDescending { it.paymentDate }
            .take(5)
            .map { payment ->
                RecentCreditPaymentDto(
                    customerName = "${payment.creditAccount.customer.firstName} ${payment.creditAccount.customer.lastName}",
                    amount = formatCurrency(payment.amount),
                    paymentDate = payment.paymentDate.toLocalDate().toString(),
                    creditAccountNumber = payment.creditAccount.creditNumber
                )
            }

        return CreditPaymentSummaryDto(
            totalPayments = totalPayments,
            totalPaymentAmount = formatCurrency(totalPaymentAmount),
            paymentsThisMonth = paymentsThisMonthCount,
            paymentsThisMonthAmount = formatCurrency(paymentsThisMonthAmount),
            averagePaymentAmount = formatCurrency(averagePaymentAmount),
            recentPayments = recentPayments
        )
    }

    /**
     * Get inventory transaction summary for AI context.
     */
    private fun getInventoryTransactionSummary(tenantId: UUID, branchId: UUID?): InventoryTransactionSummaryDto {
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)

        val allTransactions = if (branchId != null)
            inventoryTransactionRepository.findByBranchIdAndTenantId(branchId, tenantId)
        else
            inventoryTransactionRepository.findByDateRangeAndTenantId(
                OffsetDateTime.of(2000, 1, 1, 0, 0, 0, 0, now.offset),
                now,
                tenantId
            )

        val totalTransactions = allTransactions.size.toLong()
        val transactionsThisMonth = allTransactions.count { 
            it.createdAt.isAfter(startOfMonth) || it.createdAt.isEqual(startOfMonth) 
        }.toLong()

        val transactionsByType = allTransactions
            .groupBy { it.transactionType.name }
            .mapValues { it.value.size.toLong() }

        val totalTransactionValue = allTransactions.sumOf { 
            it.totalCost ?: BigDecimal.ZERO 
        }

        val recentTransactions = allTransactions
            .sortedByDescending { it.createdAt }
            .take(5)
            .map { transaction ->
                RecentInventoryTransactionDto(
                    productName = transaction.product.name,
                    transactionType = transaction.transactionType.name,
                    quantity = transaction.quantity,
                    branchName = transaction.branch.name,
                    date = transaction.createdAt.toLocalDate().toString()
                )
            }

        return InventoryTransactionSummaryDto(
            totalTransactions = totalTransactions,
            transactionsThisMonth = transactionsThisMonth,
            transactionsByType = transactionsByType,
            totalTransactionValue = formatCurrency(totalTransactionValue),
            recentTransactions = recentTransactions
        )
    }

    /**
     * Get inventory audit summary for AI context.
     */
    private fun getInventoryAuditSummary(tenantId: UUID, branchId: UUID?): InventoryAuditSummaryDto {
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)

        val allAuditEntries = if (branchId != null)
            inventoryAuditLogRepository.findByBranchIdAndTenantId(branchId, tenantId, org.springframework.data.domain.Pageable.unpaged())
        else
            inventoryAuditLogRepository.findByTenantId(tenantId, org.springframework.data.domain.Pageable.unpaged())

        val totalAuditEntries = allAuditEntries.totalElements
        val auditEntriesThisMonth = allAuditEntries.content.count { 
            it.performedAt.isAfter(startOfMonth) || it.performedAt.isEqual(startOfMonth) 
        }.toLong()

        val auditEntriesByType = allAuditEntries.content
            .groupBy { it.transactionType.name }
            .mapValues { it.value.size.toLong() }

        val recentAuditEntries = allAuditEntries.content
            .sortedByDescending { it.performedAt }
            .take(5)
            .map { audit ->
                RecentAuditEntryDto(
                    productName = audit.product.name,
                    transactionType = audit.transactionType.name,
                    quantityChanged = audit.quantityChanged,
                    branchName = audit.branch.name,
                    sourceReference = audit.sourceReference,
                    date = audit.performedAt.toLocalDate().toString()
                )
            }

        return InventoryAuditSummaryDto(
            totalAuditEntries = totalAuditEntries,
            auditEntriesThisMonth = auditEntriesThisMonth,
            auditEntriesByType = auditEntriesByType,
            recentAuditEntries = recentAuditEntries
        )
    }

    /**
     * Get tax summary for AI context.
     */
    private fun getTaxSummary(tenantId: UUID): TaxSummaryDto {
        val taxSettings = tenantTaxSettingsRepository.findByTenantId(tenantId)
        val isVatEnabled = taxSettings?.chargeVat ?: false
        val vatRate = taxSettings?.defaultVatRate?.let { "${it}%" }

        // Get tax collected from sales
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)
        val salesThisMonth = saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(
            startOfMonth, now, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
        )
        val totalTaxCollected = salesThisMonth.sumOf { it.taxAmount ?: BigDecimal.ZERO }
        val taxCollectedThisMonth = totalTaxCollected

        // Get tax configurations
        val taxConfigurations = taxConfigurationRepository.findByTenantId(tenantId)
            .map { config ->
                TaxConfigurationDto(
                    classification = config.taxClassification.name,
                    rate = "${config.vatRate}%",
                    description = config.description ?: ""
                )
            }

        return TaxSummaryDto(
            isVatEnabled = isVatEnabled,
            vatRate = vatRate,
            totalTaxCollected = formatCurrency(totalTaxCollected),
            taxCollectedThisMonth = formatCurrency(taxCollectedThisMonth),
            taxConfigurations = taxConfigurations
        )
    }

    /**
     * Get payment method summary for AI context.
     */
    private fun getPaymentMethodSummary(tenantId: UUID, branchId: UUID?): PaymentMethodSummaryDto {
        val now = OffsetDateTime.now()
        val startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay().atOffset(now.offset)

        val sales = if (branchId != null)
            saleRepository.findBySaleDateBetweenAndBranchIdAndTenantIdAndReturnStatus(
                startOfMonth, now, branchId, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
            )
        else
            saleRepository.findBySaleDateBetweenAndTenantIdAndReturnStatus(
                startOfMonth, now, tenantId, com.chemsys.entity.SaleReturnStatus.NONE
            )

        // Get payments from sales (assuming Sale has a payments relationship)
        // For now, we'll use a simplified approach
        val totalPaymentAmount = sales.sumOf { it.totalAmount }
        val totalPayments = sales.size.toLong()

        // Group by payment method if available (this would need to be implemented based on actual Sale structure)
        // For now, create a placeholder
        val paymentMethods = mapOf(
            "CASH" to PaymentMethodStatsDto(
                count = totalPayments,
                totalAmount = formatCurrency(totalPaymentAmount),
                percentage = "100%"
            )
        )

        return PaymentMethodSummaryDto(
            paymentMethods = paymentMethods,
            totalPayments = totalPayments,
            totalPaymentAmount = formatCurrency(totalPaymentAmount)
        )
    }

    /**
     * Build system prompt with comprehensive business context for AI.
     */
    private fun buildSystemPrompt(context: BusinessContextDto): String {
        return """
            You are an intelligent business advisor for a comprehensive shop management system that can be used by any type of retail business. 
            You help business owners and staff make data-driven decisions about inventory, sales, operations, customers, suppliers, and staff management.
            
            Current Business Context:
            
            INVENTORY:
            - Total Products: ${context.inventorySummary.totalProducts}
            - Total Stock Value: ${context.inventorySummary.totalStockValue}
            - Low Stock Items: ${context.inventorySummary.lowStockCount}
            - Out of Stock Items: ${context.inventorySummary.outOfStockCount}
            - Products Expiring in 30 Days: ${context.inventorySummary.expiringWithin30Days}
            
            SALES (Comprehensive Analysis):
            - Today's Sales: ${context.salesSummary.totalSalesToday} (${context.salesSummary.salesCountToday} transactions)
            - This Week's Sales: ${context.salesSummary.totalSalesThisWeek} (${context.salesSummary.salesCountThisWeek} transactions)
            - This Month's Sales: ${context.salesSummary.totalSalesThisMonth} (${context.salesSummary.salesCountThisMonth} transactions)
            - This Year's Sales: ${context.salesSummary.totalSalesThisYear} (${context.salesSummary.salesCountThisYear} transactions)
            - TOTAL SALES ALL TIME: ${context.salesSummary.totalSalesAllTime} (${context.salesSummary.salesCountAllTime} transactions)
            - Average Sale Value: ${context.salesSummary.averageSaleValue}
            
            Sales by Status:
            ${if (context.salesSummary.salesByStatus.isNotEmpty()) context.salesSummary.salesByStatus.map { "- ${it.key}: ${it.value} sales (Value: ${context.salesSummary.salesByStatusValue[it.key] ?: "N/A"})" }.joinToString("\n") else "No sales data"}
            
            Sales Trends:
            - Month-over-Month Growth: ${context.salesSummary.salesTrend.growthThisMonth}
            - Week-over-Week Growth: ${context.salesSummary.salesTrend.growthThisWeek}
            - Average Daily Sales: ${context.salesSummary.salesTrend.averageDailySales}
            - Best Sales Day: ${context.salesSummary.salesTrend.bestDay} (${context.salesSummary.salesTrend.bestDaySales})
            
            Top Sales Days (Last 30 Days):
            ${if (context.salesSummary.topSalesDays.isNotEmpty()) context.salesSummary.topSalesDays.joinToString("\n") { "- ${it.date}: ${it.salesCount} transactions, ${it.totalSales}" } else "No recent sales data"}
            
            TOP PRODUCTS (This Month):
            ${if (context.topProducts.isEmpty()) "No sales data available yet" else context.topProducts.joinToString("\n") { "- ${it.productName}: ${it.totalSold} units sold, Revenue: ${it.revenue}" }}
            
            LOW STOCK ALERTS:
            ${if (context.lowStockProducts.isEmpty()) "No low stock items" else context.lowStockProducts.joinToString("\n") { "- ${it.productName}: ${it.currentStock} units (min: ${it.minStockLevel})" }}
            
            CREDIT:
            - Active Credit Accounts: ${context.creditSummary.totalActiveAccounts}
            - Total Outstanding: ${context.creditSummary.totalOutstanding}
            - Overdue Accounts: ${context.creditSummary.overdueAccounts}
            - Overdue Amount: ${context.creditSummary.overdueAmount}
            
            CUSTOMERS:
            - Total Customers: ${context.customerSummary.totalCustomers}
            - Active Customers: ${context.customerSummary.activeCustomers}
            - New Customers This Month: ${context.customerSummary.newCustomersThisMonth}
            ${if (context.customerSummary.topCustomers.isNotEmpty()) "Top Customers (This Month):\n${context.customerSummary.topCustomers.joinToString("\n") { "- ${it.customerName}: ${it.purchaseCount} purchases, Total: ${it.totalPurchases}" }}" else ""}
            
            SUPPLIERS:
            - Total Suppliers: ${context.supplierSummary.totalSuppliers}
            - Active Suppliers: ${context.supplierSummary.activeSuppliers}
            ${if (context.supplierSummary.suppliersByCategory.isNotEmpty()) "Suppliers by Category:\n${context.supplierSummary.suppliersByCategory.map { "- ${it.key}: ${it.value} suppliers" }.joinToString("\n")}" else ""}
            
            STAFF/USERS:
            - Total Users: ${context.userSummary.totalUsers}
            - Active Users: ${context.userSummary.activeUsers}
            ${if (context.userSummary.usersByRole.isNotEmpty()) "Users by Role:\n${context.userSummary.usersByRole.map { "- ${it.key}: ${it.value} users" }.joinToString("\n")}" else ""}
            
            PURCHASE ORDERS:
            - Total Purchase Orders: ${context.purchaseOrderSummary.totalPurchaseOrders}
            - Pending Orders: ${context.purchaseOrderSummary.pendingOrders}
            - Total Order Value: ${context.purchaseOrderSummary.totalOrderValue}
            ${if (context.purchaseOrderSummary.recentOrders.isNotEmpty()) "Recent Orders:\n${context.purchaseOrderSummary.recentOrders.joinToString("\n") { "- ${it.orderNumber} from ${it.supplierName}: ${it.totalAmount} (${it.status})" }}" else ""}
            
            BRANCHES (Detailed Performance Analysis):
            - Total Branches: ${context.branchSummary.totalBranches}
            - Active Branches: ${context.branchSummary.activeBranches}
            ${if (context.branchSummary.branches.isNotEmpty()) "\nBranch Performance Breakdown:\n${context.branchSummary.branches.joinToString("\n\n") { branch ->
                """
                ${branch.branchName} (${branch.location}) - ${if (branch.isActive) "Active" else "Inactive"}:
                  Staff: ${branch.userCount} users
                  
                  SALES PERFORMANCE:
                  - This Month: ${branch.salesMetrics.totalSalesThisMonth} (${branch.salesMetrics.salesCountThisMonth} transactions)
                  - Today: ${branch.salesMetrics.totalSalesToday} (${branch.salesMetrics.salesCountToday} transactions)
                  - Average Sale Value: ${branch.salesMetrics.averageSaleValue}
                  
                  CUSTOMER METRICS:
                  - Total Customers: ${branch.customerMetrics.totalCustomers}
                  - Active Customers: ${branch.customerMetrics.activeCustomers}
                  - Transactions This Month: ${branch.customerMetrics.transactionsThisMonth}
                  - Average Transaction Value: ${branch.customerMetrics.averageTransactionValue}
                  
                  INVENTORY STATUS:
                  - Total Products: ${branch.inventoryMetrics.totalProducts}
                  - Stock Value: ${branch.inventoryMetrics.totalStockValue}
                  - Low Stock Items: ${branch.inventoryMetrics.lowStockCount}
                  - Out of Stock Items: ${branch.inventoryMetrics.outOfStockCount}
                """.trimIndent()
            }}" else ""}
            
            PRODUCT CATEGORIES (by Manufacturer):
            - Total Categories: ${context.productCategorySummary.totalCategories}
            ${if (context.productCategorySummary.categoriesByProductCount.isNotEmpty()) "Top Categories:\n${context.productCategorySummary.categoriesByProductCount.toList().sortedByDescending { it.second }.take(10).joinToString("\n") { "- ${it.first}: ${it.second} products" }}" else ""}
            
            SALE RETURNS:
            - Total Returns: ${context.saleReturnSummary.totalReturns}
            - Total Return Value: ${context.saleReturnSummary.totalReturnValue}
            - Returns This Month: ${context.saleReturnSummary.returnsThisMonth} (Value: ${context.saleReturnSummary.returnsThisMonthValue})
            ${if (context.saleReturnSummary.topReturnedProducts.isNotEmpty()) "Top Returned Products:\n${context.saleReturnSummary.topReturnedProducts.joinToString("\n") { "- ${it.productName}: ${it.returnCount} returns, Value: ${it.totalReturnValue}" }}" else ""}
            
            CREDIT PAYMENTS:
            - Total Payments: ${context.creditPaymentSummary.totalPayments}
            - Total Payment Amount: ${context.creditPaymentSummary.totalPaymentAmount}
            - Payments This Month: ${context.creditPaymentSummary.paymentsThisMonth} (Amount: ${context.creditPaymentSummary.paymentsThisMonthAmount})
            - Average Payment Amount: ${context.creditPaymentSummary.averagePaymentAmount}
            ${if (context.creditPaymentSummary.recentPayments.isNotEmpty()) "Recent Payments:\n${context.creditPaymentSummary.recentPayments.joinToString("\n") { "- ${it.customerName}: ${it.amount} on ${it.paymentDate} (Account: ${it.creditAccountNumber})" }}" else ""}
            
            INVENTORY TRANSACTIONS:
            - Total Transactions: ${context.inventoryTransactionSummary.totalTransactions}
            - Transactions This Month: ${context.inventoryTransactionSummary.transactionsThisMonth}
            - Total Transaction Value: ${context.inventoryTransactionSummary.totalTransactionValue}
            ${if (context.inventoryTransactionSummary.transactionsByType.isNotEmpty()) "Transactions by Type:\n${context.inventoryTransactionSummary.transactionsByType.map { "- ${it.key}: ${it.value} transactions" }.joinToString("\n")}" else ""}
            ${if (context.inventoryTransactionSummary.recentTransactions.isNotEmpty()) "Recent Transactions:\n${context.inventoryTransactionSummary.recentTransactions.joinToString("\n") { "- ${it.productName}: ${it.transactionType} (${it.quantity} units) at ${it.branchName} on ${it.date}" }}" else ""}
            
            INVENTORY AUDIT LOGS:
            - Total Audit Entries: ${context.inventoryAuditSummary.totalAuditEntries}
            - Audit Entries This Month: ${context.inventoryAuditSummary.auditEntriesThisMonth}
            ${if (context.inventoryAuditSummary.auditEntriesByType.isNotEmpty()) "Audit Entries by Type:\n${context.inventoryAuditSummary.auditEntriesByType.map { "- ${it.key}: ${it.value} entries" }.joinToString("\n")}" else ""}
            ${if (context.inventoryAuditSummary.recentAuditEntries.isNotEmpty()) "Recent Audit Entries:\n${context.inventoryAuditSummary.recentAuditEntries.joinToString("\n") { "- ${it.productName}: ${it.transactionType} (${it.quantityChanged} units) at ${it.branchName}, Reference: ${it.sourceReference} on ${it.date}" }}" else ""}
            
            TAX CONFIGURATION:
            - VAT Enabled: ${context.taxSummary.isVatEnabled}
            ${if (context.taxSummary.vatRate != null) "- VAT Rate: ${context.taxSummary.vatRate}" else ""}
            - Total Tax Collected: ${context.taxSummary.totalTaxCollected}
            - Tax Collected This Month: ${context.taxSummary.taxCollectedThisMonth}
            ${if (context.taxSummary.taxConfigurations.isNotEmpty()) "Tax Classifications:\n${context.taxSummary.taxConfigurations.joinToString("\n") { "- ${it.classification}: ${it.rate} - ${it.description}" }}" else ""}
            
            PAYMENT METHODS:
            - Total Payments: ${context.paymentMethodSummary.totalPayments}
            - Total Payment Amount: ${context.paymentMethodSummary.totalPaymentAmount}
            ${if (context.paymentMethodSummary.paymentMethods.isNotEmpty()) "Payment Method Breakdown:\n${context.paymentMethodSummary.paymentMethods.map { "- ${it.key}: ${it.value.count} payments (${it.value.totalAmount}), ${it.value.percentage} of total" }.joinToString("\n")}" else ""}
            
            Provide actionable, specific insights based on this comprehensive data. Focus on:
            1. Branch performance comparison and analysis (identify top performers, underperformers, and opportunities for improvement)
            2. Inventory recommendations (what to stock more/less, reorder points) - analyze by branch
            3. Sales trends and opportunities - compare branch sales performance
            4. Product performance analysis - identify best sellers per branch
            5. Credit management suggestions - analyze payment patterns and overdue accounts
            6. Customer relationship insights - analyze customer activity by branch
            7. Supplier management recommendations
            8. Staff optimization suggestions - consider branch staffing levels vs performance
            9. Purchase order management
            10. Multi-location management strategies (inventory transfers, best practices sharing)
            11. Product category performance and diversification
            12. Sale returns analysis - identify patterns, top returned products, and reasons
            13. Credit payment patterns - analyze payment frequency and amounts
            14. Inventory transaction analysis - track stock movements and identify anomalies
            15. Audit trail review - ensure compliance and identify discrepancies
            16. Tax optimization - review tax collection and configuration
            17. Payment method preferences - understand customer payment behavior
            18. Operational improvements - identify branches needing support or best practices to replicate
            
            IMPORTANT: When analyzing branch performance, compare metrics across branches to identify:
            - Which branches are excelling and why (high sales, good inventory management, strong customer base)
            - Which branches may need support (low sales, inventory issues, fewer customers)
            - Opportunities to replicate successful strategies from top-performing branches
            - Inventory rebalancing opportunities between branches
            
            Be concise, data-driven, and actionable. Use the actual numbers from the context. When making recommendations, reference specific data points and branch names (e.g., "${context.branchSummary.branches.firstOrNull()?.branchName} has ${context.branchSummary.branches.firstOrNull()?.salesMetrics?.totalSalesThisMonth} in sales this month...").
        """.trimIndent()
    }

    /**
     * Build messages array for AI API.
     */
    private fun buildMessages(
        systemPrompt: String,
        conversationHistory: List<Map<String, String>>,
        currentMessage: String
    ): List<Map<String, String>> {
        val messages = mutableListOf<Map<String, String>>()
        messages.add(mapOf("role" to "system", "content" to systemPrompt))
        
        // Add conversation history (last 10 messages ---- avoid token limits)
        conversationHistory.takeLast(10).forEach { message ->
            messages.add(message)
        }
        
        messages.add(mapOf("role" to "user", "content" to currentMessage))
        return messages
    }

    /**
     * Call OpenAI API to get AI response with retry logic for rate limits.
     */
    private fun callAiApi(messages: List<Map<String, String>>): String {
        if (apiKey.isBlank()) {
            logger.warn("OpenAI API key not configured. Returning default response.")
            return "AI chat is not configured. Please set the OPENAI_API_KEY environment variable."
        }

        try {
            val requestBody = mapOf(
                "model" to model,
                "messages" to messages,
                "max_tokens" to maxTokens,
                "temperature" to temperature
            )

            val baseUrl = apiUrl.substringBeforeLast("/")
            val path = apiUrl.substringAfterLast("/")
            
            // Retry configuration: retry on 429 (rate limit) with exponential backoff
            val retrySpec = Retry.backoff(3, Duration.ofSeconds(2))
                .maxBackoff(Duration.ofSeconds(30))
                .filter { throwable ->
                    when (throwable) {
                        is org.springframework.web.reactive.function.client.WebClientResponseException -> {
                            // Retry on rate limit (429) or server errors (5xx)
                            throwable.statusCode.value() == 429 || 
                            throwable.statusCode.is5xxServerError
                        }
                        else -> false
                    }
                }
                .doBeforeRetry { retrySignal ->
                    val delay = retrySignal.totalRetriesInARow() * 2L
                    logger.warn("Retrying AI API call after ${delay}s due to: ${retrySignal.failure().message}")
                }
            
            val response = webClient.post()
                .uri("$baseUrl/$path")
                .header(HttpHeaders.AUTHORIZATION, "Bearer $apiKey")
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .header("HTTP-Referer", "https://chemsys.com") // OpenRouter recommended header
                .header("X-Title", "ChemSys POS") // OpenRouter optional header
                .bodyValue(objectMapper.writeValueAsString(requestBody))
                .retrieve()
                .onStatus({ status -> status.is4xxClientError && status.value() != 429 }, { clientResponse ->
                    // Handle non-rate-limit 4xx errors immediately (don't retry)
                    clientResponse.bodyToMono(String::class.java)
                        .flatMap { body ->
                            Mono.error(
                                org.springframework.web.reactive.function.client.WebClientResponseException(
                                    clientResponse.statusCode().value(),
                                    "Client error: ${clientResponse.statusCode()} - $body",
                                    clientResponse.headers().asHttpHeaders(),
                                    body.toByteArray(),
                                    null
                                )
                            )
                        }
                })
                .bodyToMono<Map<String, Any>>()
                .retryWhen(retrySpec)
                .block()

            val choices = response?.get("choices") as? List<*>
            val firstChoice = choices?.firstOrNull() as? Map<*, *>
            val message = firstChoice?.get("message") as? Map<*, *>
            val content = message?.get("content") as? String

            return content ?: "Sorry, I couldn't generate a response. Please try again."
        } catch (e: org.springframework.web.reactive.function.client.WebClientResponseException) {
            when {
                e.statusCode.value() == 429 -> {
                    logger.error("OpenAI API rate limit exceeded. Please wait a moment and try again.")
                    return "I'm currently experiencing high demand. Please wait a moment and try again. " +
                           "If this persists, you may have reached your API rate limit."
                }
                e.statusCode.is4xxClientError -> {
                    logger.error("OpenAI API client error (${e.statusCode}): ${e.message}")
                    return "There was an issue with the AI service configuration. Please contact support."
                }
                e.statusCode.is5xxServerError -> {
                    logger.error("OpenAI API server error (${e.statusCode}): ${e.message}")
                    return "The AI service is temporarily unavailable. Please try again in a few moments."
                }
                else -> {
                    logger.error("OpenAI API error: ${e.message}", e)
                    return "I'm having trouble processing your request right now. Please try again later."
                }
            }
        } catch (e: Exception) {
            logger.error("Error calling AI API: ${e.message}", e)
            return "I'm having trouble processing your request right now. Please try again later."
        }
    }

    /**
     * Generate topic-based suggestions based on user's question and AI response.
     * Analyzes the question to identify topics and suggests relevant follow-up insights.
     */
    private fun generateTopicBasedSuggestions(
        userQuestion: String,
        context: BusinessContextDto,
        aiResponse: String
    ): List<String> {
        val questionLower = userQuestion.lowercase()
        val suggestions = mutableListOf<String>()

        // Identify topics from the question
        val topics = identifyTopics(questionLower)

        // Generate suggestions based on identified topics
        when {
            topics.contains("sales") || topics.contains("revenue") || topics.contains("transaction") -> {
                suggestions.add("What are the sales trends for the last 3 months?")
                suggestions.add("Which days of the week have the highest sales?")
                suggestions.add("What's the average transaction value compared to last month?")
                suggestions.add("Which products contribute most to total revenue?")
                suggestions.add("How do sales compare across different branches?")
                if (context.salesSummary.salesByStatus.containsKey("PENDING")) {
                    suggestions.add("How many pending sales need to be completed?")
                }
            }
            
            topics.contains("inventory") || topics.contains("stock") || topics.contains("product") -> {
                suggestions.add("What products are running low on stock?")
                suggestions.add("Which products have the highest inventory value?")
                suggestions.add("What products are expiring in the next 30 days?")
                suggestions.add("How can I optimize inventory levels across branches?")
                suggestions.add("Which products have the best turnover rate?")
                if (context.inventorySummary.lowStockCount > 0) {
                    suggestions.add("What's the total value of low stock items?")
                }
            }
            
            topics.contains("customer") || topics.contains("client") -> {
                suggestions.add("Who are my top 10 customers by purchase value?")
                suggestions.add("How many new customers did we acquire this month?")
                suggestions.add("What's the average customer lifetime value?")
                suggestions.add("Which customers have the highest transaction frequency?")
                suggestions.add("How can I improve customer retention?")
            }
            
            topics.contains("branch") || topics.contains("location") -> {
                suggestions.add("Which branch has the best sales performance?")
                suggestions.add("How do inventory levels compare across branches?")
                suggestions.add("Which branch has the most active customers?")
                suggestions.add("What's the staff-to-sales ratio per branch?")
                suggestions.add("How can I balance inventory between branches?")
            }
            
            topics.contains("credit") || topics.contains("payment") || topics.contains("outstanding") -> {
                suggestions.add("What's the total outstanding credit amount?")
                suggestions.add("Which customers have overdue credit accounts?")
                suggestions.add("What's the average credit payment amount?")
                suggestions.add("How many credit accounts are overdue?")
                suggestions.add("What's the credit collection rate this month?")
            }
            
            topics.contains("supplier") || topics.contains("vendor") -> {
                suggestions.add("Which suppliers do we order from most frequently?")
                suggestions.add("What's the total value of pending purchase orders?")
                suggestions.add("Which suppliers have the best delivery times?")
                suggestions.add("How many active suppliers do we have?")
            }
            
            topics.contains("staff") || topics.contains("user") || topics.contains("employee") -> {
                suggestions.add("How many active staff members are there?")
                suggestions.add("What's the staff distribution by role?")
                suggestions.add("Which branch has the most staff?")
                suggestions.add("How can I optimize staff allocation?")
            }
            
            topics.contains("return") || topics.contains("refund") -> {
                suggestions.add("What's the total value of returns this month?")
                suggestions.add("Which products are returned most frequently?")
                suggestions.add("What are the common reasons for returns?")
                suggestions.add("How do returns affect overall profitability?")
            }
            
            topics.contains("tax") || topics.contains("vat") -> {
                suggestions.add("What's the total tax collected this month?")
                suggestions.add("How is tax configured for different product categories?")
                suggestions.add("What's the tax rate breakdown?")
            }
            
            topics.contains("purchase") || topics.contains("order") || topics.contains("po") -> {
                suggestions.add("How many purchase orders are pending approval?")
                suggestions.add("What's the total value of pending purchase orders?")
                suggestions.add("Which suppliers have the most pending orders?")
                suggestions.add("What's the average purchase order value?")
            }
            
            else -> {
                // General suggestions if no specific topic identified
                suggestions.add("What are the key performance indicators I should focus on?")
                suggestions.add("What are the sales trends this month?")
                suggestions.add("Which products should I restock?")
                suggestions.add("How can I improve overall business operations?")
                suggestions.add("What are the top opportunities for growth?")
            }
        }

        // Add cross-topic suggestions based on context
        if (topics.contains("sales") && context.inventorySummary.lowStockCount > 0) {
            suggestions.add("How do low stock levels affect sales potential?")
        }
        
        if (topics.contains("branch") && context.salesSummary.totalSalesAllTime.isNotEmpty()) {
            suggestions.add("What's the all-time sales comparison across branches?")
        }
        
        if (topics.contains("customer") && context.creditSummary.overdueAccounts > 0) {
            suggestions.add("Which customers have both high sales and overdue credit?")
        }

        // Limit to 5 most relevant suggestions
        return suggestions.distinct().take(5)
    }

    /**
     * Identify topics/keywords from user's question.
     */
    private fun identifyTopics(question: String): Set<String> {
        val topics = mutableSetOf<String>()
        
        // Sales-related keywords
        if (question.contains("sales") || question.contains("revenue") || question.contains("transaction") || 
            question.contains("sell") || question.contains("sold") || question.contains("income")) {
            topics.add("sales")
        }
        
        // Inventory-related keywords
        if (question.contains("inventory") || question.contains("stock") || question.contains("product") || 
            question.contains("item") || question.contains("quantity") || question.contains("restock")) {
            topics.add("inventory")
        }
        
        // Customer-related keywords
        if (question.contains("customer") || question.contains("client") || question.contains("buyer")) {
            topics.add("customer")
        }
        
        // Branch-related keywords
        if (question.contains("branch") || question.contains("location") || question.contains("store")) {
            topics.add("branch")
        }
        
        // Credit-related keywords
        if (question.contains("credit") || question.contains("outstanding") || question.contains("payment") || 
            question.contains("debt") || question.contains("overdue")) {
            topics.add("credit")
        }
        
        // Supplier-related keywords
        if (question.contains("supplier") || question.contains("vendor") || question.contains("supply")) {
            topics.add("supplier")
        }
        
        // Staff-related keywords
        if (question.contains("staff") || question.contains("user") || question.contains("employee") || 
            question.contains("worker") || question.contains("personnel")) {
            topics.add("staff")
        }
        
        // Return-related keywords
        if (question.contains("return") || question.contains("refund") || question.contains("exchange")) {
            topics.add("return")
        }
        
        // Tax-related keywords
        if (question.contains("tax") || question.contains("vat") || question.contains("duty")) {
            topics.add("tax")
        }
        
        // Purchase order-related keywords
        if (question.contains("purchase") || question.contains("order") || question.contains("po ") || 
            question.contains("procurement")) {
            topics.add("purchase")
        }
        
        return topics
    }

    /**
     * Generate contextual suggestions based on comprehensive business data.
     */
    private fun generateSuggestions(context: BusinessContextDto): List<String> {
        val suggestions = mutableListOf<String>()

        // Inventory suggestions
        if (context.inventorySummary.lowStockCount > 0) {
            suggestions.add("What products should I restock?")
        }

        if (context.inventorySummary.expiringWithin30Days > 0) {
            suggestions.add("Which products are expiring soon?")
        }

        // Sales suggestions
        if (context.topProducts.isNotEmpty()) {
            suggestions.add("What are my best-selling products?")
        }

        suggestions.add("What are the sales trends this month?")

        // Credit suggestions
        if (context.creditSummary.overdueAccounts > 0) {
            suggestions.add("How can I improve credit collection?")
        }

        // Customer suggestions
        if (context.customerSummary.totalCustomers > 0) {
            suggestions.add("Who are my top customers?")
        }

        if (context.customerSummary.newCustomersThisMonth > 0) {
            suggestions.add("How can I retain new customers?")
        }

        // Supplier suggestions
        if (context.supplierSummary.totalSuppliers > 0) {
            suggestions.add("Which suppliers should I work with?")
        }

        // Purchase order suggestions
        if (context.purchaseOrderSummary.pendingOrders > 0) {
            suggestions.add("What purchase orders need attention?")
        }

        // Staff suggestions
        if (context.userSummary.totalUsers > 0) {
            suggestions.add("How can I optimize staff performance?")
        }

        // Branch suggestions
        if (context.branchSummary.totalBranches > 1) {
            suggestions.add("How can I optimize operations across branches?")
        }

        if (context.branchSummary.activeBranches < context.branchSummary.totalBranches) {
            suggestions.add("Should I activate inactive branches?")
        }

        // Product category suggestions
        if (context.productCategorySummary.totalCategories > 0) {
            suggestions.add("Which product categories are performing best?")
        }

        // General suggestions
        suggestions.add("What inventory should I order next?")
        suggestions.add("How can I improve my business operations?")
        suggestions.add("What are the key metrics I should focus on?")

        return suggestions.shuffled().take(5)
    }

    /**
     * Format BigDecimal as currency string.
     */
    private fun formatCurrency(amount: BigDecimal): String {
        return String.format("KSh %.2f", amount)
    }

    /**
     * Clear conversation history for a conversation ID.
     */
    fun clearConversation(conversationId: String) {
        conversations.remove(conversationId)
    }
}
