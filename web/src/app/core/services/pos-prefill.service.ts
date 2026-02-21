import { Injectable } from '@angular/core';
import { InventoryDto } from './inventory.service';

/**
 * Service for pre-filling the POS cart when navigating from inventory.
 * Used when user clicks "Sell" on an inventory item - the item is added to cart on POS load.
 */
@Injectable({ providedIn: 'root' })
export class PosPrefillService {
  private prefilledItem: InventoryDto | null = null;

  setPrefillItem(item: InventoryDto): void {
    this.prefilledItem = item;
  }

  getAndClearPrefillItem(): InventoryDto | null {
    const item = this.prefilledItem;
    this.prefilledItem = null;
    return item;
  }
}
