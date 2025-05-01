# Cash Flow Projection Tool

A web-based tool for projecting future cash flows based on historical transaction data. This tool helps you visualize how long your funds will last based on your current spending patterns.

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

The tool expects a CSV file with semicolon-separated values (;) containing the following columns:
- Date: Transaction date
- Amount: Transaction amount
- Balance: Account balance after the transaction

A sample CSV file is included in the `backup` folder.

## Save and Load

You can save your current state as a JSON file and load it later to continue your work.

## Integration with Notion

This app can be embedded in Notion pages to provide interactive cash flow projections directly within your Notion workspace. 