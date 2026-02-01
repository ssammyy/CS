package com.chemsys.controller

import com.chemsys.dto.*
import com.chemsys.service.ProductService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

/**
 * REST controller for product management operations.
 * Provides endpoints for CRUD operations, search, and inventory-related queries.
 */
@RestController
@RequestMapping("/api/products")
class ProductController(
    private val productService: ProductService
) {

    /**
     * Creates a new product.
     * 
     * @param request Product creation request
     * @return Created product details
     */
    @PostMapping
    fun createProduct(@RequestBody request: CreateProductRequest): ResponseEntity<ProductDto> {
        val product = productService.createProduct(request)
        return ResponseEntity.ok(product)
    }

    /**
     * Retrieves all products for the current tenant.
     * 
     * @return List of products with inventory information
     */
    @GetMapping
    fun getAllProducts(): ResponseEntity<ProductListResponse> {
        val products = productService.getAllProducts()
        return ResponseEntity.ok(products)
    }

    /**
     * Retrieves a product by ID.
     * 
     * @param id Product ID
     * @return Product details
     */
    @GetMapping("/{id}")
    fun getProductById(@PathVariable id: UUID): ResponseEntity<ProductDto> {
        val product = productService.getProductById(id)
        return ResponseEntity.ok(product)
    }

    /**
     * Updates an existing product.
     * 
     * @param id Product ID
     * @param request Product update request
     * @return Updated product details
     */
    @PutMapping("/{id}")
    fun updateProduct(
        @PathVariable id: UUID,
        @RequestBody request: UpdateProductRequest
    ): ResponseEntity<ProductDto> {
        val product = productService.updateProduct(id, request)
        return ResponseEntity.ok(product)
    }

    /**
     * Deletes a product (soft delete).
     * 
     * @param id Product ID
     * @return No content response
     */
    @DeleteMapping("/{id}")
    fun deleteProduct(@PathVariable id: UUID): ResponseEntity<Unit> {
        productService.deleteProduct(id)
        return ResponseEntity.noContent().build()
    }

    /**
     * Searches products by name or generic name.
     * 
     * @param query Search query
     * @return Search results
     */
    @GetMapping("/search")
    fun searchProducts(@RequestParam query: String): ResponseEntity<ProductSearchResult> {
        val results = productService.searchProducts(query)
        return ResponseEntity.ok(results)
    }

    /**
     * Retrieves products that require prescription.
     * 
     * @return List of prescription-required products
     */
    @GetMapping("/prescription-required")
    fun getPrescriptionRequiredProducts(): ResponseEntity<List<ProductDto>> {
        val products = productService.getPrescriptionRequiredProducts()
        return ResponseEntity.ok(products)
    }

    /**
     * Retrieves low stock products.
     * 
     * @return List of low stock products
     */
    @GetMapping("/low-stock")
    fun getLowStockProducts(): ResponseEntity<List<ProductDto>> {
        val products = productService.getLowStockProducts()
        return ResponseEntity.ok(products)
    }

    /**
     * Retrieves products expiring within specified days.
     * 
     * @param days Number of days (default: 30)
     * @return List of expiring products
     */
    @GetMapping("/expiring")
    fun getExpiringProducts(@RequestParam(defaultValue = "30") days: Int): ResponseEntity<List<ProductDto>> {
        val products = productService.getExpiringProducts(days)
        return ResponseEntity.ok(products)
    }

    /**
     * Retrieves products by barcode.
     * 
     * @param barcode Product barcode
     * @return Product details
     */
    @GetMapping("/barcode/{barcode}")
    fun getProductByBarcode(@PathVariable barcode: String): ResponseEntity<ProductDto> {
        // TODO: Implement barcode lookup
        return ResponseEntity.notFound().build()
    }

    /**
     * Retrieves product statistics for the current tenant.
     * 
     * @return Product statistics
     */
    @GetMapping("/stats")
    fun getProductStats(): ResponseEntity<Map<String, Any>> {
        val allProducts = productService.getAllProducts()
        
        val stats = mapOf(
            "totalProducts" to allProducts.totalCount,
            "lowStockCount" to allProducts.lowStockCount,
            "expiringCount" to allProducts.expiringCount,
            "prescriptionRequiredCount" to allProducts.products.count { it.requiresPrescription }
        )
        
        return ResponseEntity.ok(stats)
    }
}
