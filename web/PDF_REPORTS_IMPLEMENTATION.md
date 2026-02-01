# PDF Reports Implementation

## Overview
Added comprehensive PDF report generation capability to the dashboard with real backend data and system theme colors.

## Features Implemented

### 1. PDF Report Service (`pdf-report.service.ts`)
- Core service for PDF generation using jsPDF and html2canvas
- Helper methods for:
  - Converting hex colors to RGB for PDF rendering
  - Creating styled headers with theme colors
  - Creating stats cards with color coding
  - Creating data tables with alternating row colors
  - Adding footers with page numbers and generation date
- Support for multiple page formats (A4, Letter) and orientations (portrait, landscape)

### 2. Financial Report Service (`financial-report.service.ts`)
- Integrates with backend `/api/reports/financial` endpoint
- Generates comprehensive financial reports including:
  - Total Revenue, Gross Profit, Profit Margin
  - Cash vs Credit Sales breakdown
  - Revenue by Payment Method (table with percentages)
  - Daily Revenue trends (last 10 days)
  - All figures use actual backend data

### 3. Inventory Report Service
- Integrates with backend `/api/reports/inventory` endpoint
- Generates inventory reports with:
  - Total Items, Quantity, Stock Value, Cost Value
  - Low Stock Items (with current/min levels)
  - Out of Stock Items (with last restock dates)
  - Expiring Items Soon (with days until expiry)
  - All data from actual backend

### 4. Dashboard Integration
- Added two new buttons in the dashboard header:
  - **Financial Report**: Generates 30-day financial report
  - **Inventory Report**: Generates current inventory snapshot
- Reports respect branch selection (single branch or all branches)
- Branch name automatically included in report titles
- Loading state management while generating reports

## Theme Colors Used
The PDFs are colored using the system's brand palette:
- **Primary Sky**: #a1c7f8 - Used for financial reports and primary sections
- **Brand Mint**: #cbebd0 - Used for inventory reports and secondary sections
- **Brand Coral**: #f99e98 - Used for accent sections and payment methods
- All colors automatically converted from hex to RGB for PDF rendering

## Files Created/Modified

### New Files
- `/src/app/core/services/pdf-report.service.ts` - Core PDF generation service
- `/src/app/core/services/financial-report.service.ts` - Report data and PDF generation

### Modified Files
- `/src/app/features/dashboard/dashboard/dashboard.component.ts` - Added report generation methods
- `/src/app/features/dashboard/dashboard/dashboard.component.html` - Added report buttons to header

## Dependencies Added
```bash
npm install jspdf html2canvas
```

## How to Use

### Generate Financial Report
1. Click "Financial Report" button in dashboard header
2. Report will include last 30 days of data
3. Respects current branch selection
4. PDF downloads automatically

### Generate Inventory Report
1. Click "Inventory Report" button in dashboard header
2. Report shows current inventory snapshot
3. Respects current branch selection
4. PDF downloads automatically

## Backend Integration

The service integrates with these backend endpoints:
- `GET /api/reports/financial?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&branchId=UUID`
- `GET /api/reports/inventory?branchId=UUID`

Both endpoints are defined in the Chemsys backend (`/api/reports`) and handle:
- Multi-branch support
- Tenant isolation
- Real data aggregation
- Date range filtering

## PDF Features

### Financial Report
- Header with colored background (sky blue)
- 4 summary stat cards (Revenue, Profit, Margin, Sales Count)
- Revenue breakdown section (Cash/Credit/Payments)
- Payment method distribution table
- Daily revenue trend table (last 10 days)
- Page numbers and generation timestamp

### Inventory Report
- Header with colored background (mint green)
- 4 summary stat cards (Items, Quantity, Stock Value, Cost Value)
- Low Stock Items table with colored background (orange)
- Out of Stock Items table with colored background (red)
- Expiring Soon table with colored background (yellow)
- Page numbers and generation timestamp

## All Data is Real
- No mock data - all reports pull from actual backend
- Financial data includes sales, revenue, and payment information
- Inventory data shows real stock levels, valuations, and alerts
- Reports update in real-time based on dashboard state

## Styling
- Reports use consistent typography (Helvetica)
- Color-coded sections for easy scanning
- Professional layout with proper spacing
- Alternating row colors in tables for readability
- Responsive text sizing based on content

## Future Enhancements
- Custom date range selection for financial reports
- Additional report types (VAT, Variance)
- Report filtering and sorting options
- Email delivery of reports
- Scheduled report generation
