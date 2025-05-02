# Cash Flow Projection Tool

A web-based tool for projecting future cash flows based on historical transaction data. This tool helps you visualize how long your funds will last based on your current spending patterns.

## Current Version

**Version 1.3.1** - Updated July 2025
- Fixed income functionality with enhanced logging
- Improved date handling for income entries
- Enhanced display of income list

## Features

- Import transaction data from CSV files
- Create multiple scenarios with different burn rates
- Add expected future income
- Compare actual expenses with projections
- Visualize cash flow projections with interactive charts
- Save and load your work

## How to Use

1. Open the tool in your web browser
2. Import your transaction data using a CSV file
3. Adjust the burn rate slider to see different spending scenarios
4. Add expected future income if applicable
5. View the projection charts and analyze how long your funds will last

## CSV Format

The tool expects a CSV file with semicolon-separated values that includes at minimum:
- Transaction date column
- Amount column (positive for income, negative for expenses)
- Balance column

## Versions and Directories

The repository contains the following versions of the application:

- Root directory (`/`) - Latest working version
- `/deploy` - Version optimized for deployment and embedding
- `/package` - Older/backup version

When making changes, ensure you update both the main version and the deploy version.

## GitHub Pages Deployment

The application can be deployed to GitHub Pages by publishing the `deploy` directory as the root of your GitHub Pages site.

## Embedding in Notion

The `deploy/notion.html` file is specially optimized for embedding in Notion. When embedding, use this URL instead of the main index.html.

## Save and Load

You can save your current state as a JSON file and load it later to continue your work.

## Integration with Notion

This app can be embedded in Notion pages to provide interactive cash flow projections directly within your Notion workspace. 