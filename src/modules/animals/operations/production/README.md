# Production Module

## Overview
This module tracks **repeatable outputs** from living animals (milk, eggs, wool, honey, manure, etc.). It answers one question: "What does this animal produce, when, how much, and of what quality?"

## Core Principles
1. **Animal-Centric**: Every production record is tied to a specific animal
2. **Repeatable Outputs**: Tracks ongoing production, not one-time events
3. **Quality Tracking**: Records quality metrics specific to each product type
4. **Inventory Integration**: Automatically adds production to product inventory
5. **Time-Based**: Multiple records per animal over time for trend analysis

## Key Components

### 1. Production Types
- **Milk**: From dairy animals (cows, goats)
- **Eggs**: From poultry (chickens, ducks)
- **Wool**: From sheep, goats, alpacas
- **Honey**: From beehives
- **Manure**: From all animals (nutrient-rich)
- **Hair/Fiber**: From certain breeds
- **Semen**: For breeding operations (optional)
- **Other**: Custom production types

### 2. Quality Metrics
Each production type has specific quality metrics:
- **Milk**: Fat content, protein content, somatic cell count
- **Eggs**: Weight, shell quality, yolk color
- **Wool**: Fiber diameter, staple length, color
- **Honey**: Moisture content, color grade
- **Manure**: Moisture, nitrogen, phosphorus, potassium content

### 3. Production Context
- **Health snapshot**: Animal health at production time
- **Environmental factors**: Temperature, humidity, weather
- **Collection method**: Manual, machine, natural
- **Lactation info**: For dairy animals (lactation number, day)

### 4. Inventory Integration
When production is recorded:
1. Production record is created
2. Product is added to inventory (or existing inventory quantity increases)
3. Traceability is maintained (production → inventory → sales)

## Data Flow

Animal (alive & active)
↓
Production Recording
↓
Quality Assessment
↓
Inventory Addition
↓
Trend Analysis & Alerts


## API Endpoints

### Production Recording
- `POST /animals/production` - Record new production
- `GET /animals/production/farm/:farmId` - Get production by farm
- `GET /animals/production/animal/:animalId` - Get production by animal
- `GET /animals/production/:productionId` - Get production by ID
- `PUT /animals/production/:productionId` - Update production
- `DELETE /animals/production/:productionId` - Delete production

### Statistics & Analysis
- `GET /animals/production/animal/:animalId/statistics` - Get animal production statistics
- `GET /animals/production/farm/:farmId/statistics` - Get farm production statistics
- `GET /animals/production/farm/:farmId/trends` - Get production trends
- `GET /animals/production/farm/:farmId/alerts` - Get production alerts
- `GET /animals/production/farm/:farmId/dashboard` - Get production dashboard

### Utility
- `GET /animals/production/animal-type/:animalTypeId/production-types` - Get production types for animal type
- `GET /animals/production/quality-metrics/:productionType` - Get quality metrics for production type

## Integration Points

### With Animal Records
- **Reads**: Animal status, health, animal type
- **Requires**: Animal must be alive and active
- **Links**: Every production record references an animal

### With Inventory
- **Creates**: Adds products to inventory
- **Links**: Production record → Product inventory
- **Updates**: Increases inventory quantity

### With Animal Types
- **Configures**: Production types per animal type
- **Validates**: Only allowed production types for each species

### With Health Module (Passive)
- **Reflects**: Production drops may indicate health issues
- **Records**: Health snapshot at production time
- **Correlates**: Production quality with health status

## Usage Examples

### 1. Recording Milk Production
```javascript
POST /animals/production
{
  "animal": "cow_id_here",
  "productionType": "milk",
  "quantity": 15.5,
  "unit": "liter",
  "productionDate": "2026-01-04T08:00:00.000Z",
  "qualityMetrics": {
    "fatContent": 3.8,
    "proteinContent": 3.2,
    "somaticCellCount": 150000,
    "grade": "premium"
  },
  "lactationNumber": 3,
  "lactationDay": 120,
  "collectionMethod": "machine",
  "healthAtProduction": {
    "healthStatus": "good",
    "bodyConditionScore": 3.5,
    "temperature": 38.5
  }
}

POST /animals/production
{
  "animal": "chicken_id_here",
  "productionType": "eggs",
  "quantity": 12,
  "unit": "dozen",
  "productionDate": "2026-01-04T10:00:00.000Z",
  "qualityMetrics": {
    "weight": 65,
    "shellQuality": "excellent",
    "yolkColor": "medium",
    "grade": "premium"
  },
  "productionTime": "morning",
  "environment": {
    "temperature": 22,
    "humidity": 60
  }
}

POST /animals/production
{
  "animal": "chicken_id_here",
  "productionType": "eggs",
  "quantity": 12,
  "unit": "dozen",
  "productionDate": "2026-01-04T10:00:00.000Z",
  "qualityMetrics": {
    "weight": 65,
    "shellQuality": "excellent",
    "yolkColor": "medium",
    "grade": "premium"
  },
  "productionTime": "morning",
  "environment": {
    "temperature": 22,
    "humidity": 60
  }
}

POST /animals/production
{
  "animal": "rabbit_id_here",
  "productionType": "manure",
  "quantity": 2.5,
  "unit": "kg",
  "productionDate": "2026-01-04T16:00:00.000Z",
  "qualityMetrics": {
    "moisture": 45,
    "nitrogenContent": 2.1,
    "phosphorusContent": 1.8,
    "potassiumContent": 1.5,
    "grade": "standard"
  },
  "notes": "Collected from rabbit hutch"
}

Business Rules
1. Production Eligibility

    Animal must be status: 'alive'

    Animal must be isActive: true

    Production type must be valid for animal type

    No production after animal is sold/culled/deceased

2. Quality Standards

    Each production type has specific quality metrics

    Grades: premium, standard, commercial, feed_grade, unusable

    Quality affects inventory classification and pricing

3. Inventory Integration

    Production automatically creates/updates product inventory

    Product names generated based on production details

    Storage conditions set based on product type

4. Trend Analysis

    Multiple records per animal for trend tracking

    Alerts for production drops or quality issues

    Statistical analysis for productivity tracking

Alert Triggers
1. Production Drops

    30%+ drop in quantity compared to recent average

    Multiple consecutive low productions

    Seasonal variations considered

2. Quality Issues

    Poor grades (commercial or lower)

    Out-of-range quality metrics

    Consistency problems

3. Irregular Patterns

    Missing expected productions

    Inconsistent timing

    Unexplained variations

Configuration
Animal Type Production Settings

Each animal type defines:

    Valid production types

    Default quality expectations

    Typical production frequencies

    Quality metric ranges

Production Type Configuration

Each production type has:

    Specific quality metrics

    Standard units

    Storage requirements

    Typical shelf life

Performance Considerations

    Indexes on farm, animal, production date

    Batch operations for bulk recording

    Cached statistics for dashboards

    Pagination for large datasets



## 7. Create a Test Script

**File:** `test-production.js` (in project root)

```javascript
const mongoose = require('mongoose');
const productionService = require('./src/modules/animals/operations/production/production.service');

async function testProduction() {
  try {
    // Connect to your database
    await mongoose.connect('mongodb://localhost:27017/farm-weaver', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to database\n');
    
    const farmId = '69591049ab90f63f80b48618';
    const userId = '69590922c02ad9a9a3e5c93f';
    
    console.log('Testing Production module...\n');
    
    // 1. Get production types for rabbit animal type
    const rabbitTypeId = '6959294ca647311365e57779';
    console.log('1. Getting production types for rabbits...');
    const productionTypes = await productionService.getProductionTypesForAnimalType(rabbitTypeId, userId);
    console.log('   Available production types:', productionTypes.map(pt => pt.value));
    
    // 2. Record manure production for rabbit
    console.log('\n2. Recording manure production for rabbit...');
    const productionData = {
      animal: '695938977348d0d25dd0309e', // Fluffy the rabbit
      productionType: 'manure',
      quantity: 0.5,
      unit: 'kg',
      productionDate: new Date(),
      qualityMetrics: {
        moisture: 45,
        nitrogenContent: 2.1,
        phosphorusContent: 1.8,
        potassiumContent: 1.5,
        grade: 'standard',
      },
      notes: 'Daily manure collection from hutch',
    };
    
    // Note: Uncomment to actually record production
    // const production = await productionService.recordProduction(productionData, userId);
    // console.log(`   Production recorded: ${production.quantity} ${production.unit} of ${production.productionType}`);
    
    console.log('   Production data prepared (commented out actual recording)');
    
    // 3. Get production by animal
    console.log('\n3. Getting production records for Fluffy...');
    const productions = await productionService.getProductionByAnimal(
      '695938977348d0d25dd0309e', 
      userId, 
      {}
    );
    console.log(`   Total production records: ${productions.length}`);
    
    // 4. Get production statistics for animal
    console.log('\n4. Getting production statistics for Fluffy...');
    const animalStats = await productionService.getAnimalProductionStatistics(
      '695938977348d0d25dd0309e', 
      userId
    );
    console.log('   Statistics:', {
      totalProductions: animalStats.totalProductions,
      totalQuantity: animalStats.totalQuantity,
      productionTypes: Object.keys(animalStats.byProductionType),
    });
    
    // 5. Get farm production statistics
    console.log('\n5. Getting farm production statistics...');
    const farmStats = await productionService.getFarmProductionStatistics(farmId, userId);
    console.log('   Statistics:', {
      totalProductions: farmStats.totalProductions,
      totalQuantity: farmStats.totalQuantity,
      totalAnimals: farmStats.totalAnimals,
    });
    
    // 6. Get production trends
    console.log('\n6. Getting production trends...');
    const trends = await productionService.getProductionTrends(farmId, userId, 'month');
    console.log('   Trends analysis:', {
      period: trends.period,
      totalProductions: trends.summary.totalProductions,
      growthRate: trends.summary.growthRate.toFixed(2) + '%',
    });
    
    // 7. Get production alerts
    console.log('\n7. Getting production alerts...');
    const alerts = await productionService.getProductionAlerts(farmId, userId);
    console.log('   Alerts summary:', {
      totalAlerts: alerts.summary.totalAlerts,
      productionDrops: alerts.summary.productionDrops,
      qualityIssues: alerts.summary.qualityIssues,
    });
    
    console.log('\n✅ Production module test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing production module:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from database');
  }
}

testProduction();