package com.chemsys.service

import com.chemsys.dto.*
import com.chemsys.entity.Product
import com.chemsys.entity.Tenant
import com.chemsys.repository.ProductRepository
import com.chemsys.repository.InventoryRepository
import com.chemsys.repository.TenantRepository
import com.chemsys.config.TenantContext
import org.springframework.security.access.prepost.PreAuthorize
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.*

/**
 * ProductService handles all business logic for product management.
 * Provides CRUD operations, search functionality, and inventory-related queries.
 */
@Service
class ProductService(
    private val productRepository: ProductRepository,
    private val inventoryRepository: InventoryRepository,
    private val tenantRepository: TenantRepository
) {

    /**
     * Creates a new product for the current tenant.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun createProduct(request: CreateProductRequest): ProductDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val tenant = tenantRepository.findById(currentTenantId)
            .orElseThrow { RuntimeException("Tenant not found") }

        // Check if product with same name already exists in tenant
        val existingProduct = productRepository.findByNameContainingAndTenantId(request.name, currentTenantId)
            .find { it.name.equals(request.name, ignoreCase = true) }

        if (existingProduct != null) {
            throw RuntimeException("Product with name '${request.name}' already exists in this tenant")
        }

        // Check if barcode is unique within tenant (only validate if barcode is provided and not blank)
        if (!request.barcode.isNullOrBlank()) {
            val existingBarcode = productRepository.findByBarcodeAndTenantId(request.barcode, currentTenantId)
            if (existingBarcode.isPresent) {
                throw RuntimeException("Product with barcode '${request.barcode}' already exists in this tenant")
            }
        }

        val product = Product(
            name = request.name,
            genericName = request.genericName,
            description = request.description,
            strength = request.strength,
            dosageForm = request.dosageForm,
            manufacturer = request.manufacturer,
//            if (request.barcode.isNullOrBlank()) null else request.barcode,
            barcode = if (request.barcode.isNullOrBlank()) null else request.barcode,

            requiresPrescription = request.requiresPrescription,
            storageConditions = request.storageConditions,
            minStockLevel = request.minStockLevel,
            maxStockLevel = request.maxStockLevel,
            tenant = tenant
        )

        val savedProduct = productRepository.save(product)
        return mapToDto(savedProduct, 0, false)
    }

    /**
     * Updates an existing product.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun updateProduct(id: UUID, request: UpdateProductRequest): ProductDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val product = productRepository.findById(id)
            .orElseThrow { RuntimeException("Product not found with id: $id") }

        // Verify product belongs to current tenant
        if (product.tenant.id != currentTenantId) {
            throw RuntimeException("Product not found with id: $id")
        }

        // Check name uniqueness if name is being updated
        if (request.name != null && request.name != product.name) {
            val existingProduct = productRepository.findByNameContainingAndTenantId(request.name, currentTenantId)
                .find { it.name.equals(request.name, ignoreCase = true) }

            if (existingProduct != null) {
                throw RuntimeException("Product with name '${request.name}' already exists in this tenant")
            }
        }

        // Check barcode uniqueness if barcode is being updated (only validate if barcode is provided and not blank)
        if (!request.barcode.isNullOrBlank() && request.barcode != product.barcode) {
            val existingBarcode = productRepository.findByBarcodeAndTenantId(request.barcode, currentTenantId)
            if (existingBarcode.isPresent) {
                throw RuntimeException("Product with barcode '${request.barcode}' already exists in this tenant")
            }
        }

        val updatedProduct = product.copy(
            name = request.name ?: product.name,
            genericName = request.genericName ?: product.genericName,
            description = request.description ?: product.description,
            strength = request.strength ?: product.strength,
            dosageForm = request.dosageForm ?: product.dosageForm,
            manufacturer = request.manufacturer ?: product.manufacturer,
            barcode = request.barcode ?: product.barcode,
            requiresPrescription = request.requiresPrescription ?: product.requiresPrescription,
            storageConditions = request.storageConditions ?: product.storageConditions,
            minStockLevel = request.minStockLevel ?: product.minStockLevel,
            maxStockLevel = request.maxStockLevel ?: product.maxStockLevel,
            isActive = request.isActive ?: product.isActive,
            updatedAt = java.time.OffsetDateTime.now()
        )

        val savedProduct = productRepository.save(updatedProduct)
        val totalQuantity = inventoryRepository.getTotalQuantityByProductIdAndTenantId(id, currentTenantId)
        val lowStockAlert = totalQuantity <= savedProduct.minStockLevel

        return mapToDto(savedProduct, totalQuantity, lowStockAlert)
    }

    /**
     * Retrieves all products for the current tenant with inventory information.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','CASHIER')")
    fun getAllProducts(): ProductListResponse {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val products = productRepository.findByTenantId(currentTenantId)
        val productDtos = products.map { product ->
            val totalQuantity =
                inventoryRepository.getTotalQuantityByProductIdAndTenantId(product.id!!, currentTenantId)
            val lowStockAlert = totalQuantity <= product.minStockLevel
            mapToDto(product, totalQuantity, lowStockAlert)
        }

        val lowStockCount = productDtos.count { it.lowStockAlert }
        val expiringCount = getExpiringProductsCount(currentTenantId)

        return ProductListResponse(
            products = productDtos,
            totalCount = products.size.toLong(),
            lowStockCount = lowStockCount.toLong(),
            expiringCount = expiringCount
        )
    }

    /**
     * Retrieves a product by ID for the current tenant.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','PHARMACIST')")
    fun getProductById(id: UUID): ProductDto {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val product = productRepository.findById(id)
            .orElseThrow { RuntimeException("Product not found with id: $id") }

        // Verify product belongs to current tenant
        if (product.tenant.id != currentTenantId) {
            throw RuntimeException("Product not found with id: $id")
        }

        val inventory = inventoryRepository.findByProductIdAndTenantId(id, currentTenantId)
        val currentStock = inventory.sumOf { it.quantity }
        val isLowStock = currentStock <= product.minStockLevel

        return mapToDto(product, currentStock, isLowStock)
    }

    /**
     * Retrieves a product entity by ID for internal use by other services.
     * This method does not check permissions as it's intended for internal use.
     */
    fun getProductEntityById(id: UUID): Product {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val product = productRepository.findById(id)
            .orElseThrow { RuntimeException("Product not found with id: $id") }

        // Verify product belongs to current tenant
        if (product.tenant.id != currentTenantId) {
            throw RuntimeException("Product not found with id: $id")
        }

        return product
    }

    /**
     * Searches products by name or generic name.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','CASHIER')")
    fun searchProducts(query: String): ProductSearchResult {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val products = productRepository.findByNameContainingAndTenantId(query, currentTenantId)
        val genericProducts = productRepository.findByGenericNameContainingAndTenantId(query, currentTenantId)

        // Combine and deduplicate results
        val allProducts = (products + genericProducts).distinctBy { it.id }
        val productDtos = allProducts.map { product ->
            val totalQuantity =
                inventoryRepository.getTotalQuantityByProductIdAndTenantId(product.id!!, currentTenantId)
            val lowStockAlert = totalQuantity <= product.minStockLevel
            mapToDto(product, totalQuantity, lowStockAlert)
        }

        return ProductSearchResult(
            products = productDtos,
            totalCount = productDtos.size.toLong(),
            searchQuery = query
        )
    }

    /**
     * Retrieves products that require prescription.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER','CASHIER')")
    fun getPrescriptionRequiredProducts(): List<ProductDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val products = productRepository.findPrescriptionRequiredByTenantId(currentTenantId)
        return products.map { product ->
            val totalQuantity =
                inventoryRepository.getTotalQuantityByProductIdAndTenantId(product.id!!, currentTenantId)
            val lowStockAlert = totalQuantity <= product.minStockLevel
            mapToDto(product, totalQuantity, lowStockAlert)
        }
    }

    /**
     * Retrieves low stock products.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    fun getLowStockProducts(): List<ProductDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val products = productRepository.findLowStockProductsByTenantId(currentTenantId)
        return products.map { product ->
            val totalQuantity =
                inventoryRepository.getTotalQuantityByProductIdAndTenantId(product.id!!, currentTenantId)
            mapToDto(product, totalQuantity, true)
        }
    }

    /**
     * Retrieves products expiring within specified days.
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN','MANAGER')")
    fun getExpiringProducts(days: Int): List<ProductDto> {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val expiryDate = LocalDate.now().plusDays(days.toLong())
        val products = productRepository.findExpiringProductsByTenantId(currentTenantId, expiryDate)

        return products.map { product ->
            val totalQuantity =
                inventoryRepository.getTotalQuantityByProductIdAndTenantId(product.id!!, currentTenantId)
            val lowStockAlert = totalQuantity <= product.minStockLevel
            mapToDto(product, totalQuantity, lowStockAlert)
        }
    }

    /**
     * Deletes a product (soft delete by setting isActive to false).
     */
    @PreAuthorize("hasAnyRole('ADMIN','PLATFORM_ADMIN')")
    @Transactional
    fun deleteProduct(id: UUID) {
        val currentTenantId = TenantContext.getCurrentTenant()
            ?: throw RuntimeException("No tenant context found")

        val product = productRepository.findById(id)
            .orElseThrow { RuntimeException("Product not found with id: $id") }

        // Verify product belongs to current tenant
        if (product.tenant.id != currentTenantId) {
            throw RuntimeException("Product not found with id: $id")
        }

        // Check if product has active inventory
        val totalQuantity = inventoryRepository.getTotalQuantityByProductIdAndTenantId(id, currentTenantId)
        if (totalQuantity > 0) {
            throw RuntimeException("Cannot delete product with active inventory. Current stock: $totalQuantity")
        }

        val updatedProduct = product.copy(
            isActive = false,
            updatedAt = java.time.OffsetDateTime.now()
        )
        productRepository.save(updatedProduct)
    }

    /**
     * Maps Product entity to ProductDto.
     */
    private fun mapToDto(product: Product, totalQuantity: Int, lowStockAlert: Boolean): ProductDto {
        return ProductDto(
            id = product.id!!,
            name = product.name,
            genericName = product.genericName,
            description = product.description,
            strength = product.strength,
            dosageForm = product.dosageForm,
            manufacturer = product.manufacturer,
            barcode = product.barcode,
            isActive = product.isActive,
            requiresPrescription = product.requiresPrescription,
            storageConditions = product.storageConditions,
            minStockLevel = product.minStockLevel,
            maxStockLevel = product.maxStockLevel,
            tenantId = product.tenant.id!!,
            tenantName = product.tenant.name,
            totalQuantity = totalQuantity,
            lowStockAlert = lowStockAlert,
            createdAt = product.createdAt,
            updatedAt = product.updatedAt
        )
    }

    /**
     * Gets count of expiring products for the current tenant.
     */
    private fun getExpiringProductsCount(tenantId: UUID): Long {
        val expiryDate = LocalDate.now().plusDays(30) // 30 days from now
        val expiringProducts = productRepository.findExpiringProductsByTenantId(tenantId, expiryDate)
        return expiringProducts.size.toLong()
    }
}
