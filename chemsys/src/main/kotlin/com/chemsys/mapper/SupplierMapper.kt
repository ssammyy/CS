package com.chemsys.mapper

import com.chemsys.dto.SupplierDto
import com.chemsys.entity.Supplier
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * Mapper class for converting between Supplier entities and DTOs.
 * Provides methods for mapping supplier data for API responses and requests.
 */
@Component
class SupplierMapper {
    
    /**
     * Converts a Supplier entity to SupplierDto.
     * Maps all entity fields to the corresponding DTO fields.
     * 
     * @param supplier The supplier entity to convert
     * @return SupplierDto with mapped data
     */
    fun toDto(supplier: Supplier): SupplierDto {
        return SupplierDto(
            id = supplier.id!!,
            name = supplier.name,
            contactPerson = supplier.contactPerson,
            phone = supplier.phone,
            email = supplier.email,
            physicalAddress = supplier.physicalAddress,
            paymentTerms = supplier.paymentTerms,
            category = supplier.category,
            status = supplier.status,
            taxIdentificationNumber = supplier.taxIdentificationNumber,
            bankAccountDetails = supplier.bankAccountDetails,
            creditLimit = supplier.creditLimit,
            notes = supplier.notes,
            tenantId = supplier.tenant.id!!,
            tenantName = supplier.tenant.name,
            createdAt = supplier.createdAt,
            updatedAt = supplier.updatedAt
        )
    }
    
    /**
     * Converts a list of Supplier entities to a list of SupplierDto.
     * Maps each entity in the list to its corresponding DTO.
     * 
     * @param suppliers The list of supplier entities to convert
     * @return List of SupplierDto with mapped data
     */
    fun toDtoList(suppliers: List<Supplier>): List<SupplierDto> {
        return suppliers.map { supplier ->
            toDto(supplier)
        }
    }
    
    /**
     * Converts a Supplier entity to SupplierDto with additional context.
     * This method can be extended to include additional calculated fields or relationships.
     * 
     * @param supplier The supplier entity to convert
     * @param additionalContext Additional context data (can be extended as needed)
     * @return SupplierDto with mapped data and additional context
     */
    fun toDtoWithContext(supplier: Supplier, additionalContext: Map<String, Any> = emptyMap()): SupplierDto {
        return toDto(supplier).also {
            // Additional context can be added here if needed in the future
            // For example, order history, performance metrics, etc.
        }
    }
}


