# Inventory & Sales Module

## Overview
This module manages farm assets (animals, products) as inventory and handles sales transactions. It connects operations to revenue without complex accounting.

## Core Principles
1. **Inventory Type-Based**: Products, animals, and feeds are all inventory with different behaviors
2. **State-Driven**: Animals move through states (alive → sold/culled/deceased)
3. **Transaction-Based**: Sales consume inventory, adjustments handle reality
4. **Revenue Tracking**: Simple sales recording without full accounting

## Key Components

### 1. Product Inventory
- **Farm outputs**: meat, milk, eggs, wool, honey, skins, manure, etc.
- **Quantity tracking**: with units and quality grades
- **Shelf life management**: expiry dates and storage conditions
- **Value tracking**: unit prices and total inventory value

### 2. Animal Inventory
- **Live animals as inventory**: filtered view of animal records
- **Status-based**: only 'alive' animals are active inventory
- **Ready-for-sale criteria**: health, age, and other factors
- **Estimated valuation**: based on weight and market prices

### 3. Sales Management
- **Multi-item sales**: animals, products, and feeds can be sold together
- **Buyer management**: individual, business, restaurant, market, etc.
- **Payment tracking**: cash, mobile money, bank transfer, etc.
- **Delivery management**: pickup, delivery, shipping options

### 4. Inventory Adjustments
- **Reality handling**: spoilage, theft, damage, measurement errors
- **Approval workflow**: pending → approved → applied
- **Audit trail**: who made the adjustment and why

### 5. Reports & Dashboard
- **Inventory valuation**: total value of all farm assets
- **Sales statistics**: revenue by period, item type, buyer type
- **Stock alerts**: low stock, expiring products, pending adjustments

## Data Flow

Operations (Production, Breeding, etc.)
↓
Creates Inventory (Products, Animals)
↓
Inventory Management (Track, Value, Adjust)
↓
Sales (Consume Inventory, Record Revenue)
↓
Reports (Valuation, Statistics, Alerts)


## API Endpoints

### Product Inventory
- `POST /animals/inventory/products` - Add product to inventory
- `GET /animals/inventory/farm/:farmId/products` - Get product inventory
- `GET /animals/inventory/farm/:farmId/products/statistics` - Get product statistics

### Animal Inventory
- `GET /animals/inventory/farm/:farmId/animals` - Get live animal inventory
- `GET /animals/inventory/farm/:farmId/animals/statistics` - Get animal statistics

### Sales
- `POST /animals/inventory/sales` - Create a sale
- `GET /animals/inventory/farm/:farmId/sales` - Get sales
- `PATCH /animals/inventory/sales/:saleId/payment` - Update payment

### Inventory Adjustments
- `POST /animals/inventory/adjustments` - Create adjustment
- `PATCH /animals/inventory/adjustments/:adjustmentId/apply` - Apply adjustment
- `GET /animals/inventory/farm/:farmId/adjustments` - Get adjustments

### Dashboard & Reports
- `GET /animals/inventory/farm/:farmId/dashboard` - Get inventory dashboard
- `GET /animals/inventory/farm/:farmId/valuation-report` - Get valuation report

### Utility Endpoints
- `GET /animals/inventory/product-types` - Get product type options
- `GET /animals/inventory/adjustment-types` - Get adjustment type options
- `GET /animals/inventory/sale-types` - Get sale type options
- `GET /animals/inventory/buyer-types` - Get buyer type options

## Integration Points

### With Animal Records
- **Reads**: Live animals for inventory view
- **Updates**: Animal status on sale (alive → sold)
- **Links**: Animal sales recorded on animal record

### With Reproduction
- **Reads**: New offspring become animal inventory
- **No direct writes**: Reproduction creates animals, inventory tracks them

### With Feed Management
- **Reads**: Feed inventory for sales
- **Updates**: Feed quantity on sale
- **Links**: Feed cost helps calculate profitability

### With Production (Future)
- **Creates**: Production events add products to inventory
- **Links**: Source tracking for products

## Usage Examples

### 1. Adding Products to Inventory
```javascript
POST /animals/inventory/products
{
  "farm": "69591049ab90f63f80b48618",
  "productType": "meat",
  "productName": "Rabbit Meat",
  "quantity": 50,
  "unit": "kg",
  "animalType": "6959294ca647311365e57779",
  "unitPrice": 500,
  "expiryDate": "2026-02-10",
  "storageConditions": "frozen"
}

