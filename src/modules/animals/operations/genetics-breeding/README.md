# Genetics & Breeding Module

## Overview
This module provides **analytical insights** for breeding decisions by analyzing existing reproduction data. It does NOT create or modify reproduction events - it only reads and analyzes data to provide recommendations.

## Core Principles
1. **Read-Only Analysis**: Only reads from reproduction data, never writes
2. **Strategic Decision Support**: Provides recommendations, doesn't enforce rules
3. **Lightweight Implementation**: Uses existing data structures
4. **Dynamic Computation**: Profiles are computed, not manually entered

## Key Features

### 1. Genetic Profiles
- **Automatically computed** for each animal
- **Performance metrics** derived from reproduction history
- **Traits** based on actual performance (growth, fertility, viability)
- **Inbreeding awareness** tracks close relatives

### 2. Pedigree Management
- **Multi-generation lineage tracking** (up to 3 generations by default)
- **Relationship detection** (parents, siblings, cousins)
- **Inbreeding coefficient calculation**

### 3. Breeding Decision Support
- **Compatibility scoring** for potential pairs
- **Inbreeding risk warnings** (not blocks)
- **Recommended pairings** based on complementary traits
- **Avoid pairings** for high-risk combinations

### 4. Performance Analytics
- **Top breeder identification**
- **Success rate tracking** (mating, pregnancy, offspring survival)
- **Trait inheritance patterns** (simplified)

## Data Flow

Reproduction Data (Mating → Pregnancy → Birth → Offspring)
↓
Read Only
↓
Genetic Profile Computation
↓
Analytics & Recommendations
↓
Decision Support for Farmers


## API Endpoints

### Animal-Specific
- `GET /animals/genetics/animal/:animalId` - Get genetic profile
- `GET /animals/genetics/animal/:animalId/pedigree` - Get pedigree tree
- `GET /animals/genetics/compatibility/:animalId1/:animalId2` - Check breeding compatibility

### Farm-Wide
- `GET /animals/genetics/farm/:farmId/top-breeders` - Get top performing breeders
- `GET /animals/genetics/farm/:farmId/pair-suggestions` - Get breeding pair suggestions
- `GET /animals/genetics/farm/:farmId/dashboard` - Get genetics dashboard
- `POST /animals/genetics/farm/:farmId/batch-compute` - Batch compute profiles

### Analysis Tools
- `GET /animals/genetics/inbreeding-risk/:animalId1/:animalId2` - Check inbreeding risk

## Integration Points

### With Reproduction Module
- Reads: Mating events, pregnancies, births, offspring
- Never writes to reproduction data

### With Animal Records
- Links to animal parentage (sire/dam)
- Uses animal type for species-specific settings
- Respects animal status (alive/active breeders only)

### With Animal Types
- Uses genetics settings per species
- Respects breeding season, maturity ages, trait weights

## Configuration

### Animal Type Genetics Settings
Each animal type can have custom genetics settings:
- Enable/disable genetics for this species
- Breeding age limits
- Trait importance weights
- Inbreeding thresholds
- Breeding rules

## Performance Considerations
- Profiles are cached (24 hours by default)
- Batch computation available for large farms
- Pedigree depth limited to 3 generations by default
- Indexes on frequently queried fields

## Usage Example

```javascript
// Get genetic profile for an animal
GET /animals/genetics/animal/695938977348d0d25dd0309e

// Check if two animals should be bred
GET /animals/genetics/compatibility/69599163eac45178925bb51d/695938977348d0d25dd0309e

// Get breeding suggestions for a farm
GET /animals/genetics/farm/69591049ab90f63f80b48618/pair-suggestions?limit=5