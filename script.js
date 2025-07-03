// Cash Flow Projection Tool - JavaScript
// Version 1.3.1 - Fixed income functionality with enhanced logging
// Last updated: July 2025

// Helper function to decode Greek characters
function decodeGreekCharacters(str) {
    try {
        // Common Greek character encodings
        const greekMap = {
            'Á': 'Α', 'Â': 'Β', 'Ã': 'Γ', 'Ä': 'Δ', 'Å': 'Ε', 'Æ': 'Ζ', 'Ç': 'Η', 'È': 'Θ',
            'É': 'Ι', 'Ê': 'Κ', 'Ë': 'Λ', 'Ì': 'Μ', 'Í': 'Ν', 'Î': 'Ξ', 'Ï': 'Ο', 'Ð': 'Π',
            'Ñ': 'Ρ', 'Ò': 'Σ', 'Ó': 'Τ', 'Ô': 'Υ', 'Õ': 'Φ', 'Ö': 'Χ', '×': 'Ψ', 'Ø': 'Ω',
            'Ù': 'Ϊ', 'Ú': 'Ϋ', 'Û': 'ά', 'Ü': 'έ', 'Ý': 'ή', 'Þ': 'ί', 'ß': 'ΰ',
            'à': 'α', 'á': 'β', 'â': 'γ', 'ã': 'δ', 'ä': 'ε', 'å': 'ζ', 'æ': 'η', 'ç': 'θ',
            'è': 'ι', 'é': 'κ', 'ê': 'λ', 'ë': 'μ', 'ì': 'ν', 'í': 'ξ', 'î': 'ο', 'ï': 'π',
            'ð': 'ρ', 'ò': 'ς', 'ó': 'σ', 'ô': 'τ', 'õ': 'υ', 'ö': 'φ', '÷': 'χ', 'ø': 'ψ',
            'ù': 'ω', 'ú': 'ϊ', 'û': 'ϋ', 'ü': 'ό', 'ý': 'ύ', 'þ': 'ώ',
            // Common encodings for Greek header names
            'ÇÌ/ÍÉÁ': 'ΗΜ/ΝΙΑ',
            'ÊÉÍÇÓÇÓ': 'ΚΙΝΗΣΗΣ',
            'ÐÅÑÉÃÑÁÖÇ': 'ΠΕΡΙΓΡΑΦΗ',
            'ÐÏÓÏ': 'ΠΟΣΟ',
            'ÕÐÏËÏÉÐÏ': 'ΥΠΟΛΟΙΠΟ',
            'ÐÅÑÉÃÑÁÖÇ': 'ΠΕΡΙΓΡΑΦΗ',
            'ÁíÜëçøç': 'Ανάληψη',
            'ÁîßáÓ': 'ΑξίαΣ',
        };
        
        // Replace character by character
        let decoded = '';
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            decoded += greekMap[char] || char;
        }
        
        return decoded;
    } catch (e) {
        console.error("Error decoding Greek characters:", e);
        return str; // Return original if there's an error
    }
}

// ====================================
// CashFlowAnalyzer Class
// ====================================
class CashFlowAnalyzer {
    constructor() {
        this.transactions = null;
        this.balance = 0;
        this.projectedData = null;
        this.baselineData = null;
        this.normalizeYears = false;
        this.actualExpenses = []; // Array to store actual expense data
        this.actualIncomes = []; // Array to store actual income data
        this.historicalTrends = null; // Store trend analysis from CSV data
        this.seasonalPatterns = null; // Store seasonal patterns
        this.confidence = { // Confidence levels for different time horizons
            nearTerm: 0.9,    // Next 3 months
            mediumTerm: 0.7,  // 3-12 months  
            longTerm: 0.5     // 12+ months
        };
        this.scenarios = {
            current: {
                name: 'Current State',
                incomes: [],
                color: '#3498db',
                data: null,
                burnRateFactor: 1.0
            },
            scenario1: {
                name: 'Scenario 1',
                incomes: [],
                color: '#2ecc71',
                data: null,
                burnRateFactor: 1.0
            },
            scenario2: {
                name: 'Scenario 2',
                incomes: [],
                color: '#e74c3c',
                data: null,
                burnRateFactor: 1.0
            },
            scenario3: {
                name: 'Scenario 3',
                incomes: [],
                color: '#9b59b6',
                data: null,
                burnRateFactor: 1.0
            }
        };
        this.activeScenario = 'current';
    }

    // Load CSV data
    async loadData(file, normalizeYears = false) {
        this.normalizeYears = normalizeYears;
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                delimiter: ';',
                header: true,
                encoding: "ISO-8859-7", // Use Greek encoding
                transformHeader: function(header) {
                    // Decode Greek headers
                    return decodeGreekCharacters(header);
                },
                transform: function(value) {
                    // Decode Greek values
                    return decodeGreekCharacters(value);
                },
                complete: (results) => {
                    try {
                        if (results.data.length === 0) {
                            reject("No data found in CSV file");
                            return;
                        }

                        // Check if the CSV has the required columns
                        const firstRow = results.data[0];
                        const headers = Object.keys(firstRow);
                        
                        // Extract columns - we need at least date, amount, and balance
                        // Normalize column names based on common patterns including Greek names
                        let dateCol, valueCol, descCol, amountCol, balanceCol;
                        
                        for (const header of headers) {
                            const lowerHeader = header.toLowerCase();
                            // Greek column name patterns
                            if (lowerHeader.includes('ημ/νια') || lowerHeader.includes('ημερομην') || 
                                lowerHeader.includes('κινησ') || lowerHeader.includes('αποστολή') || 
                                lowerHeader.includes('date') && !lowerHeader.includes('value')) {
                                dateCol = header;
                            } else if (lowerHeader.includes('αξια') || lowerHeader.includes('value') || 
                                      lowerHeader.includes('ημερομην') && lowerHeader.includes('αξια')) {
                                valueCol = header;
                            } else if (lowerHeader.includes('περιγραφη') || lowerHeader.includes('αιτιολογ') || 
                                       lowerHeader.includes('desc')) {
                                descCol = header;
                            } else if (lowerHeader.includes('ποσό') || lowerHeader.includes('ποσο') || 
                                      lowerHeader.includes('amount') || lowerHeader.includes('χρεωση') || 
                                      lowerHeader.includes('πιστωση')) {
                                amountCol = header;
                            } else if (lowerHeader.includes('υπολοιπο') || lowerHeader.includes('υπόλοιπο') || 
                                      lowerHeader.includes('balance')) {
                                balanceCol = header;
                            }
                        }

                        // If columns weren't found, try to use positional detection based on typical bank statement format
                        if (!dateCol || !amountCol || !balanceCol) {
                            console.log("Using positional column detection as headers weren't found");
                            if (headers.length >= 5) {
                                dateCol = headers[0];  // First column is usually transaction date
                                valueCol = headers[1]; // Second column is usually value date
                                descCol = headers[2];  // Third column is usually description
                                amountCol = headers[3]; // Fourth column is usually amount
                                balanceCol = headers[4]; // Fifth column is usually balance
                            } else if (headers.length >= 3) {
                                dateCol = headers[0];
                                descCol = headers[1];
                                amountCol = headers[2];
                                if (headers.length >= 4) {
                                    balanceCol = headers[3];
                                }
                            }
                        }

                        if (!dateCol || !amountCol || !balanceCol) {
                            console.log("Available headers:", headers);
                            reject("CSV file missing required columns (date, amount, balance). Please ensure your CSV has these columns, possibly in Greek: ημ/νια κίνησης, ποσό, υπόλοιπο");
                            return;
                        }

                        // Rename columns to standardized names
                        this.transactions = results.data.map(row => {
                            return {
                                transactionDate: row[dateCol],
                                valueDate: valueCol ? row[valueCol] : row[dateCol],
                                description: descCol ? row[descCol] : '',
                                amount: this.parseAmount(row[amountCol]),
                                balance: this.parseAmount(row[balanceCol])
                            };
                        });

                        // Remove rows with invalid data
                        this.transactions = this.transactions.filter(row => 
                            row.transactionDate && 
                            !isNaN(row.amount) && 
                            !isNaN(row.balance)
                        );

                        if (this.transactions.length === 0) {
                            reject("No valid transactions found after parsing");
                            return;
                        }

                        // Convert dates - handle different formats
                        this.transactions.forEach(row => {
                            try {
                                // Parse date from format DD/MM/YYYY or other common formats
                                let parsedDate;
                                const dateStr = row.transactionDate.trim();
                                
                                // Try DD/MM/YYYY format first
                                if (dateStr.includes('/')) {
                                    const [day, month, year] = dateStr.split('/');
                                    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                }
                                // Try DD-MM-YYYY format
                                else if (dateStr.includes('-')) {
                                    const [day, month, year] = dateStr.split('-');
                                    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                }
                                // Try DD.MM.YYYY format
                                else if (dateStr.includes('.')) {
                                    const [day, month, year] = dateStr.split('.');
                                    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                }
                                
                                // If we have a valid date
                                if (parsedDate && !isNaN(parsedDate.getTime())) {
                                    row.transactionDate = parsedDate;
                                    
                                    // Handle value date similarly
                                    if (row.valueDate && row.valueDate !== row.transactionDate) {
                                        const valueDateStr = row.valueDate.trim();
                                        let valueParsedDate;
                                        
                                        if (valueDateStr.includes('/')) {
                                            const [vday, vmonth, vyear] = valueDateStr.split('/');
                                            valueParsedDate = new Date(parseInt(vyear), parseInt(vmonth) - 1, parseInt(vday));
                                        } else if (valueDateStr.includes('-')) {
                                            const [vday, vmonth, vyear] = valueDateStr.split('-');
                                            valueParsedDate = new Date(parseInt(vyear), parseInt(vmonth) - 1, parseInt(vday));
                                        } else if (valueDateStr.includes('.')) {
                                            const [vday, vmonth, vyear] = valueDateStr.split('.');
                                            valueParsedDate = new Date(parseInt(vyear), parseInt(vmonth) - 1, parseInt(vday));
                                        }
                                        
                                        if (valueParsedDate && !isNaN(valueParsedDate.getTime())) {
                                            row.valueDate = valueParsedDate;
                                        } else {
                                            row.valueDate = row.transactionDate; // Fallback
                                        }
                                    } else {
                                        row.valueDate = row.transactionDate;
                                    }
                                } else {
                                    // If we couldn't parse the date properly, create a dummy date to avoid errors
                                    console.warn(`Could not parse date: ${dateStr}`);
                                    row.transactionDate = new Date();
                                    row.valueDate = new Date();
                                }
                            } catch (err) {
                                console.error("Date parsing error:", err);
                                row.transactionDate = new Date();
                                row.valueDate = new Date();
                            }
                        });

                        // Handle future years if needed
                        if (normalizeYears) {
                            const currentYear = new Date().getFullYear();
                            let maxYear = Math.max(...this.transactions.map(row => row.transactionDate.getFullYear()));
                            
                            if (maxYear > currentYear + 1) {
                                const yearDiff = maxYear - currentYear;
                                
                                this.transactions.forEach(row => {
                                    if (row.transactionDate.getFullYear() > currentYear) {
                                        row.transactionDate.setFullYear(row.transactionDate.getFullYear() - yearDiff);
                                    }
                                    if (row.valueDate.getFullYear() > currentYear) {
                                        row.valueDate.setFullYear(row.valueDate.getFullYear() - yearDiff);
                                    }
                                });
                            }
                        }

                        // Sort by date
                        this.transactions.sort((a, b) => a.transactionDate - b.transactionDate);
                        
                        // Find all transactions with the latest date
                        const latestDate = this.transactions[this.transactions.length - 1].transactionDate;
                        const latestTransactions = this.transactions.filter(transaction => 
                            transaction.transactionDate.getTime() === latestDate.getTime()
                        );
                        
                        // Get the minimum balance from transactions with the latest date
                        this.balance = Math.min(...latestTransactions.map(transaction => transaction.balance));

                        console.log("Found latest transactions:", latestTransactions);
                        console.log("Using minimum balance from latest date:", this.balance);

                        // Automatically analyze historical trends
                        console.log("Automatically analyzing historical trends...");
                        this.analyzeHistoricalTrends();

                        resolve({
                            success: true,
                            message: `Data loaded successfully. Current balance: ${this.formatCurrency(this.balance)}`
                        });
                    } catch (error) {
                        console.error("CSV processing error:", error);
                        reject(`Error processing CSV data: ${error.message}. Make sure the file has the expected format and encoding.`);
                    }
                },
                error: (error) => {
                    console.error("Papa parse error:", error);
                    reject(`Error parsing CSV file: ${error}. The file might be corrupted or have an unsupported encoding.`);
                }
            });
        });
    }

    // Parse amount - handles European format with comma as decimal separator
    parseAmount(amountStr) {
        if (!amountStr) return NaN;
        
        // Remove spaces, convert to string
        amountStr = String(amountStr).trim();
        
        // Handle different formats:
        // 1. European format: 1.234,56 (decimal comma, thousands dot)
        // 2. American format: 1,234.56 (decimal dot, thousands comma)
        
        try {
            if (amountStr.includes(',')) {
                // European format: replace dots (thousands), then replace comma with dot
                if (amountStr.includes('.')) {
                    // Format like 1.234,56
                    return parseFloat(amountStr.replace(/\./g, '').replace(',', '.'));
                } else {
                    // Format like 1234,56
                    return parseFloat(amountStr.replace(',', '.'));
                }
            } else {
                // Standard format or already converted
                return parseFloat(amountStr);
            }
        } catch (err) {
            console.error("Amount parsing error:", err, "for value:", amountStr);
            return NaN;
        }
    }

    // Format currency for display
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    // Calculate average monthly expenses
    calculateMonthlyExpenses() {
        if (!this.transactions || this.transactions.length === 0) {
            return 0;
        }
        
        // Extract only expenses (negative amounts)
        const expenses = this.transactions.filter(t => t.amount < 0);
        
        if (expenses.length === 0) {
            return 0;
        }
        
        // Calculate total expenses and number of months in the data
        const totalExpenses = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
        
        // Get the date range in months
        const startDate = expenses[0].transactionDate;
        const endDate = expenses[expenses.length - 1].transactionDate;
        
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                     (endDate.getMonth() - startDate.getMonth());
        
        const monthsCount = Math.max(1, months); // Ensure at least 1 month
        
        return totalExpenses / monthsCount;
    }

    // Add actual expense data
    addActualExpense(month, year, amount) {
        // Validate inputs
        if (isNaN(month) || month < 0 || month > 11) {
            return { success: false, message: "Invalid month" };
        }
        
        if (isNaN(year) || year < 2000 || year > 2100) {
            return { success: false, message: "Invalid year" };
        }
        
        if (isNaN(amount) || amount < 0) {
            return { success: false, message: "Invalid amount" };
        }
        
        // Check if entry already exists
        const existingIndex = this.actualExpenses.findIndex(
            exp => exp.month === parseInt(month) && exp.year === parseInt(year)
        );
        
        if (existingIndex !== -1) {
            // Update existing entry
            this.actualExpenses[existingIndex].amount = parseFloat(amount);
            return { success: true, message: "Expense updated" };
        } else {
            // Add new entry
            this.actualExpenses.push({
                month: parseInt(month),
                year: parseInt(year),
                amount: parseFloat(amount)
            });
            
            // Sort by date
            this.actualExpenses.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });
            
            return { success: true, message: "Expense added" };
        }
    }
    
    // Remove actual expense
    removeActualExpense(month, year) {
        const index = this.actualExpenses.findIndex(
            exp => exp.month === parseInt(month) && exp.year === parseInt(year)
        );
        
        if (index !== -1) {
            this.actualExpenses.splice(index, 1);
            return { success: true, message: "Expense removed" };
        }
        
        return { success: false, message: "Expense not found" };
    }
    
    // Get actual expenses for chart
    getActualExpensesForChart() {
        if (this.actualExpenses.length === 0 || !this.transactions) {
            console.log("No actual expenses or transactions data available for chart");
            return null;
        }
        
        try {
            // Get the last transaction date as the starting point
            const lastDate = this.transactions[this.transactions.length - 1].transactionDate;
            if (!lastDate || !(lastDate instanceof Date)) {
                console.error("Invalid last transaction date", lastDate);
                return null;
            }
            
            console.log("Starting actual expense projection from date:", lastDate);
            console.log("Current balance:", this.balance);
            console.log("Available actual expenses:", this.actualExpenses);
            
            // Create data points for actual data
            const dataPoints = [];
            
            // Start with initial balance at last transaction date
            dataPoints.push({
                date: new Date(lastDate),
                balance: this.balance
            });
            
            // Sort actual expenses by date
            const sortedExpenses = [...this.actualExpenses].sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });
            
            // Filter expenses that are after the last transaction date
            const relevantExpenses = sortedExpenses.filter(expense => {
                const expenseDate = new Date(expense.year, expense.month, 15);
                return expenseDate >= lastDate;
            });
            
            console.log("Relevant expenses after last transaction date:", relevantExpenses);
            
            if (relevantExpenses.length === 0) {
                console.log("No relevant actual expenses found after last transaction date");
                return null;
            }
            
            // Create a running balance starting from current balance
            let runningBalance = this.balance;
            
            // Add data points for each actual expense
            relevantExpenses.forEach(expense => {
                // Create date object for this expense (middle of month)
                const expenseDate = new Date(expense.year, expense.month, 15);
                
                // Subtract expense from running balance
                runningBalance -= expense.amount;
                
                // Add data point
                dataPoints.push({
                    date: expenseDate,
                    balance: runningBalance
                });
            });
            
            console.log("Generated actual expense chart data:", dataPoints);
            
            return dataPoints;
        } catch (error) {
            console.error("Error generating actual expense chart data:", error);
            return null;
        }
    }

    // Clear all data in the analyzer
    clearData() {
        this.transactions = null;
        this.balance = 0;
        this.projectedData = null;
        this.baselineData = null;
        this.actualExpenses = [];
        this.actualIncomes = [];
        this.historicalTrends = null;
        this.seasonalPatterns = null;
        
        // Reset scenarios to initial state but keep structure
        Object.keys(this.scenarios).forEach(key => {
            this.scenarios[key].incomes = [];
            this.scenarios[key].data = null;
            this.scenarios[key].burnRateFactor = 1.0;
        });
        
        this.activeScenario = 'current';
        return { success: true, message: "Data cleared successfully" };
    }

    // Calculate actual balance based on last transaction balance and actual expenses
    calculateActualBalance() {
        if (!this.transactions || this.transactions.length === 0 || this.actualExpenses.length === 0) {
            return null;
        }

        // Get last transaction balance
        const lastBalance = this.balance;
        
        // Sum all actual expenses
        const totalActualExpenses = this.actualExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        // Calculate actual balance
        return lastBalance - totalActualExpenses;
    }

    // Calculate average monthly actual expenses
    calculateActualMonthlyExpenses() {
        if (this.actualExpenses.length === 0) {
            return null;
        }
        
        // Sum all actual expenses
        const totalActualExpenses = this.actualExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        // Calculate average
        return totalActualExpenses / this.actualExpenses.length;
    }

    // Calculate actual months until broke
    calculateActualMonthsUntilBroke() {
        const actualBalance = this.calculateActualBalance();
        const actualMonthlyExpenses = this.calculateActualMonthlyExpenses();
        
        if (actualBalance === null || actualMonthlyExpenses === null || actualMonthlyExpenses <= 0) {
            return null;
        }
        
        return actualBalance / actualMonthlyExpenses;
    }

    // ====================================
    // Actual Income Management Methods
    // ====================================

    // Add actual income data
    addActualIncome(month, year, amount) {
        // Validate inputs
        if (isNaN(month) || month < 0 || month > 11) {
            return { success: false, message: "Invalid month" };
        }
        
        if (isNaN(year) || year < 2000 || year > 2100) {
            return { success: false, message: "Invalid year" };
        }
        
        if (isNaN(amount) || amount < 0) {
            return { success: false, message: "Invalid amount" };
        }
        
        // Check if entry already exists
        const existingIndex = this.actualIncomes.findIndex(
            income => income.month === parseInt(month) && income.year === parseInt(year)
        );
        
        if (existingIndex !== -1) {
            // Update existing entry
            this.actualIncomes[existingIndex].amount = parseFloat(amount);
            return { success: true, message: "Income updated" };
        } else {
            // Add new entry
            this.actualIncomes.push({
                month: parseInt(month),
                year: parseInt(year),
                amount: parseFloat(amount)
            });
            
            // Sort by date
            this.actualIncomes.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });
            
            return { success: true, message: "Income added" };
        }
    }
    
    // Remove actual income
    removeActualIncome(month, year) {
        const index = this.actualIncomes.findIndex(
            income => income.month === parseInt(month) && income.year === parseInt(year)
        );
        
        if (index !== -1) {
            this.actualIncomes.splice(index, 1);
            return { success: true, message: "Income removed" };
        }
        
        return { success: false, message: "Income not found" };
    }

    // Calculate total actual income for current year
    calculateActualIncome() {
        if (this.actualIncomes.length === 0) {
            return 0;
        }
        
        const currentYear = new Date().getFullYear();
        return this.actualIncomes
            .filter(income => income.year === currentYear)
            .reduce((sum, income) => sum + income.amount, 0);
    }

    // Calculate average monthly actual income
    calculateActualMonthlyIncome() {
        if (this.actualIncomes.length === 0) {
            return 0;
        }
        
        // Sum all actual incomes
        const totalActualIncome = this.actualIncomes.reduce((sum, income) => sum + income.amount, 0);
        
        // Calculate average
        return totalActualIncome / this.actualIncomes.length;
    }

    // ====================================
    // Historical Trend Analysis Methods
    // ====================================

    // Analyze historical trends from CSV transaction data
    analyzeHistoricalTrends() {
        if (!this.transactions || this.transactions.length === 0) {
            console.log("No transaction data available for trend analysis");
            return null;
        }

        try {
            console.log("Analyzing historical trends from transaction data...");
            
            // Group transactions by month
            const monthlyData = {};
            
            this.transactions.forEach(transaction => {
                const date = new Date(transaction.transactionDate);
                const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        year: date.getFullYear(),
                        month: date.getMonth(),
                        expenses: 0,
                        incomes: 0,
                        transactions: 0,
                        endBalance: 0
                    };
                }
                
                if (transaction.amount < 0) {
                    monthlyData[monthKey].expenses += Math.abs(transaction.amount);
                } else {
                    monthlyData[monthKey].incomes += transaction.amount;
                }
                
                monthlyData[monthKey].transactions++;
                monthlyData[monthKey].endBalance = transaction.balance; // Last balance for that month
            });

            // Convert to array and sort by date
            const monthlyTrends = Object.values(monthlyData).sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });

            console.log(`Analyzed ${monthlyTrends.length} months of historical data`);

            // Calculate trends
            const trends = {
                monthlyData: monthlyTrends,
                averageExpenses: monthlyTrends.reduce((sum, m) => sum + m.expenses, 0) / monthlyTrends.length,
                averageIncomes: monthlyTrends.reduce((sum, m) => sum + m.incomes, 0) / monthlyTrends.length,
                expenseGrowthRate: this.calculateGrowthRate(monthlyTrends.map(m => m.expenses)),
                incomeGrowthRate: this.calculateGrowthRate(monthlyTrends.map(m => m.incomes)),
                volatility: this.calculateVolatility(monthlyTrends.map(m => m.expenses - m.incomes))
            };

            this.historicalTrends = trends;
            this.detectSeasonalPatterns(monthlyTrends);
            
            console.log("Historical trends analyzed:", trends);
            return trends;

        } catch (error) {
            console.error("Error analyzing historical trends:", error);
            return null;
        }
    }

    // Calculate growth rate from a series of values
    calculateGrowthRate(values) {
        if (values.length < 2) return 0;
        
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
        
        if (firstAvg === 0) return 0;
        return (secondAvg - firstAvg) / firstAvg;
    }

    // Calculate volatility (standard deviation)
    calculateVolatility(values) {
        if (values.length < 2) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        
        return Math.sqrt(variance);
    }

    // Detect seasonal patterns in the data
    detectSeasonalPatterns(monthlyData) {
        try {
            console.log("Detecting seasonal patterns...");
            
            // Group by month across all years
            const seasonalData = {};
            
            for (let month = 0; month < 12; month++) {
                seasonalData[month] = {
                    month: month,
                    expenses: [],
                    incomes: [],
                    count: 0
                };
            }
            
            monthlyData.forEach(data => {
                const month = data.month;
                seasonalData[month].expenses.push(data.expenses);
                seasonalData[month].incomes.push(data.incomes);
                seasonalData[month].count++;
            });
            
            // Calculate seasonal factors
            const patterns = {};
            const overallAvgExpenses = this.historicalTrends.averageExpenses;
            const overallAvgIncomes = this.historicalTrends.averageIncomes;
            
            for (let month = 0; month < 12; month++) {
                const monthData = seasonalData[month];
                
                if (monthData.count > 0) {
                    const avgExpenses = monthData.expenses.reduce((sum, val) => sum + val, 0) / monthData.count;
                    const avgIncomes = monthData.incomes.reduce((sum, val) => sum + val, 0) / monthData.count;
                    
                    patterns[month] = {
                        expenseFactor: overallAvgExpenses > 0 ? avgExpenses / overallAvgExpenses : 1,
                        incomeFactor: overallAvgIncomes > 0 ? avgIncomes / overallAvgIncomes : 1,
                        sampleSize: monthData.count
                    };
                } else {
                    patterns[month] = {
                        expenseFactor: 1,
                        incomeFactor: 1,
                        sampleSize: 0
                    };
                }
            }
            
            this.seasonalPatterns = patterns;
            console.log("Seasonal patterns detected:", patterns);
            
        } catch (error) {
            console.error("Error detecting seasonal patterns:", error);
            this.seasonalPatterns = null;
        }
    }

    // Save application state to JSON
    saveToJSON() {
        try {
            const appState = {
                balance: this.balance,
                transactions: this.transactions,
                actualExpenses: this.actualExpenses,
                actualIncomes: this.actualIncomes,
                historicalTrends: this.historicalTrends,
                seasonalPatterns: this.seasonalPatterns,
                scenarios: this.scenarios,
                activeScenario: this.activeScenario,
                timestamp: new Date().toISOString(),
                version: '2.0'
            };
            
            // Convert to JSON string
            const jsonData = JSON.stringify(appState, null, 2);
            
            // Create a Blob
            const blob = new Blob([jsonData], { type: 'application/json' });
            
            // Create a download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            // Generate filename with date
            const date = new Date();
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const filename = `cashflow_data_${formattedDate}.json`;
            
            a.href = url;
            a.download = filename;
            a.click();
            
            // Clean up
            URL.revokeObjectURL(url);
            
            return { success: true, message: `Data saved successfully to ${filename}` };
        } catch (error) {
            console.error("Error saving data:", error);
            return { success: false, message: `Error saving data: ${error.message}` };
        }
    }

    // Load application state from JSON
    async loadFromJSON(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                
                reader.onload = (event) => {
                    try {
                        const jsonData = JSON.parse(event.target.result);
                        
                        // Validate JSON structure
                        if (!jsonData.transactions || !jsonData.scenarios) {
                            reject("Invalid save file format. Missing required data.");
                            return;
                        }
                        
                        // Convert date strings back to Date objects in transactions
                        if (jsonData.transactions && Array.isArray(jsonData.transactions)) {
                            jsonData.transactions.forEach(transaction => {
                                if (transaction.transactionDate) {
                                    transaction.transactionDate = new Date(transaction.transactionDate);
                                }
                                if (transaction.valueDate) {
                                    transaction.valueDate = new Date(transaction.valueDate);
                                }
                            });
                        }
                        
                        // Convert date strings back to Date objects in scenarios incomes
                        if (jsonData.scenarios) {
                            Object.keys(jsonData.scenarios).forEach(scenarioId => {
                                const scenario = jsonData.scenarios[scenarioId];
                                if (scenario.incomes && Array.isArray(scenario.incomes)) {
                                    scenario.incomes.forEach(income => {
                                        if (income.date) {
                                            income.date = new Date(income.date);
                                        }
                                    });
                                }
                            });
                        }
                        
                        // Apply loaded data to the analyzer
                        this.balance = jsonData.balance || 0;
                        this.transactions = jsonData.transactions || [];
                        this.actualExpenses = jsonData.actualExpenses || [];
                        this.actualIncomes = jsonData.actualIncomes || [];
                        this.historicalTrends = jsonData.historicalTrends || null;
                        this.seasonalPatterns = jsonData.seasonalPatterns || null;
                        this.scenarios = jsonData.scenarios || {};
                        this.activeScenario = jsonData.activeScenario || 'current';

                        // If we have transactions but no trends (from old version), analyze them
                        if (this.transactions && this.transactions.length > 0 && !this.historicalTrends) {
                            console.log("Analyzing trends for loaded data...");
                            this.analyzeHistoricalTrends();
                        }
                        
                        resolve({
                            success: true,
                            message: "Data loaded successfully"
                        });
                    } catch (parseError) {
                        console.error("Error parsing JSON:", parseError);
                        reject(`Error parsing data file: ${parseError.message}`);
                    }
                };
                
                reader.onerror = () => {
                    reject("Error reading file");
                };
                
                reader.readAsText(file);
            } catch (error) {
                console.error("Error loading data:", error);
                reject(`Error loading data: ${error.message}`);
            }
        });
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

// Global variables
let analyzer = new CashFlowAnalyzer();
let chart = null;

function initApp() {
    console.log("Initializing application...");
    
    // Initialize analyzer if not already done
    if (!analyzer) {
        console.log("Creating new CashFlowAnalyzer instance");
        analyzer = new CashFlowAnalyzer();
    }
    
    // Verify analyzer initialized correctly
    console.log("Analyzer initialized with state:", {
        hasTransactions: analyzer.transactions ? true : false,
        balance: analyzer.balance,
        scenariosCount: Object.keys(analyzer.scenarios).length,
        activeScenario: analyzer.activeScenario
    });
    
    // Set up event listeners
    setupEventListeners();
    
    // Set today's date in the income date field
    const incomeDateField = document.getElementById('income-date');
    if (incomeDateField) {
        incomeDateField.valueAsDate = new Date();
        console.log("Set today's date in income date field");
    } else {
        console.error("Could not find income-date field in the DOM");
    }
    
    // Populate year selector
    populateYearSelector();
    
    console.log("Application initialization complete");
}

// Populate year selector with relevant years
function populateYearSelector() {
    // Populate expense year selector
    const yearSelector = document.getElementById('year-selector');
    if (yearSelector) {
        yearSelector.innerHTML = '';
        populateYearOptions(yearSelector);
    }
    
    // Populate income year selector
    const incomeYearSelector = document.getElementById('income-year-selector');
    if (incomeYearSelector) {
        incomeYearSelector.innerHTML = '';
        populateYearOptions(incomeYearSelector);
    }
}

// Helper function to populate year options for a selector
function populateYearOptions(selector) {
    const currentYear = new Date().getFullYear();
    
    // Add options for current year and next 3 years
    for (let year = currentYear - 1; year <= currentYear + 3; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        
        if (year === currentYear) {
            option.selected = true;
        }
        
        selector.appendChild(option);
    }
}

// Set up all event listeners
function setupEventListeners() {
    try {
        // Help button
        const helpButton = document.getElementById('help-button');
        if (helpButton) {
            helpButton.addEventListener('click', openHelpDocumentation);
        }
        
        // File selection button
        const fileSelectButton = document.getElementById('file-select-button');
        const csvFileInput = document.getElementById('csv-file-input');
        
        if (fileSelectButton && csvFileInput) {
            fileSelectButton.addEventListener('click', () => {
                csvFileInput.click();
            });
            
            // File input change
            csvFileInput.addEventListener('change', handleFileSelect);
        }
        
        // Clear data button
        const clearDataButton = document.getElementById('clear-data-button');
        if (clearDataButton) {
            clearDataButton.addEventListener('click', clearData);
        }
        
        // Save state button
        const saveStateButton = document.getElementById('save-state-button');
        if (saveStateButton) {
            saveStateButton.addEventListener('click', saveApplicationState);
        }
        
        // Load state button
        const loadStateButton = document.getElementById('load-state-button');
        const loadStateInput = document.getElementById('load-state-input');
        
        if (loadStateButton && loadStateInput) {
            loadStateButton.addEventListener('click', () => {
                loadStateInput.click();
            });
            
            // Load state input change
            loadStateInput.addEventListener('change', handleLoadApplicationState);
        }
        
        // Scenario tabs
        document.querySelectorAll('.scenario-tab').forEach(tab => {
            tab.addEventListener('click', () => changeActiveScenario(tab.dataset.scenario));
        });
        
        // Burn rate slider
        const burnRateSlider = document.getElementById('burn-rate-slider');
        if (burnRateSlider) {
            burnRateSlider.addEventListener('input', updateBurnRate);
        }
        
        // Add income button
        const addIncomeButton = document.getElementById('add-income-button');
        if (addIncomeButton) {
            addIncomeButton.addEventListener('click', addIncome);
        }
        
        // Clear incomes button
        const clearIncomesButton = document.getElementById('clear-incomes-button');
        if (clearIncomesButton) {
            clearIncomesButton.addEventListener('click', clearIncomes);
        }
        
        // Add actual expense button
        const addActualExpenseButton = document.getElementById('add-actual-expense-button');
        if (addActualExpenseButton) {
            addActualExpenseButton.addEventListener('click', addActualExpense);
        }

        // Add actual income button
        const addActualIncomeButton = document.getElementById('add-actual-income-button');
        if (addActualIncomeButton) {
            addActualIncomeButton.addEventListener('click', addActualIncome);
        }
        
        // Show actual data checkbox
        const showActualDataCheckbox = document.getElementById('show-actual-data');
        if (showActualDataCheckbox) {
            showActualDataCheckbox.addEventListener('change', () => {
                console.log("'Show Actual Data' checkbox changed, refreshing chart");
                updateChart();
            });
        }
        
        // Chart control checkboxes
        const showHistoricalTrendCheckbox = document.getElementById('show-historical-trend');
        if (showHistoricalTrendCheckbox) {
            showHistoricalTrendCheckbox.addEventListener('change', updateChart);
        }
        
        const showConfidenceBandsCheckbox = document.getElementById('show-confidence-bands');
        if (showConfidenceBandsCheckbox) {
            showConfidenceBandsCheckbox.addEventListener('change', updateChart);
        }
        
        // Quick action buttons
        const quickAddCurrentMonthButton = document.getElementById('quick-add-current-month');
        if (quickAddCurrentMonthButton) {
            quickAddCurrentMonthButton.addEventListener('click', quickAddCurrentMonth);
        }
        
        const quickAddLast3MonthsButton = document.getElementById('quick-add-last-3-months');
        if (quickAddLast3MonthsButton) {
            quickAddLast3MonthsButton.addEventListener('click', quickAddLast3Months);
        }
        
        const jumpToExpensesButton = document.getElementById('jump-to-expenses');
        if (jumpToExpensesButton) {
            jumpToExpensesButton.addEventListener('click', jumpToExpenses);
        }
        
        const jumpToIncomesButton = document.getElementById('jump-to-incomes');
        if (jumpToIncomesButton) {
            jumpToIncomesButton.addEventListener('click', jumpToIncomes);
        }
    } catch (error) {
        console.error("Error setting up event listeners:", error);
    }
}

// ====================================
// File Handling Functions
// ====================================

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Update file name display
    document.getElementById('file-name').textContent = file.name;
    
    // Get normalize years option
    const normalizeYears = document.getElementById('normalize-years').checked;
    
    // Show loading status
    const statusElement = document.createElement('div');
    statusElement.className = 'status-message';
    statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading and processing data...';
    document.querySelector('.data-import-section').appendChild(statusElement);
    
    // Load and process the file
    analyzer.loadData(file, normalizeYears)
        .then(result => {
            // Remove loading status
            if (statusElement.parentNode) {
                statusElement.parentNode.removeChild(statusElement);
            }
            
            // Show success notification
            showNotification(result.message, 'success');
            
            // Update UI
            updateUI();
        })
        .catch(error => {
            // Remove loading status
            if (statusElement.parentNode) {
                statusElement.parentNode.removeChild(statusElement);
            }
            
            // Show error notification
            showNotification(`Error: ${error}. Try checking the backup folder for example CSV files to understand the format.`, 'error');
            
            // Log the error for debugging
            console.error("File loading error:", error);
        });
}

// Show notification message
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Add icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="close-btn"><i class="fas fa-times"></i></button>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Add event listener to close button
    notification.querySelector('.close-btn').addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
    
    // Auto-remove after some time
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }
    }, type === 'error' ? 15000 : 5000); // Error messages stay longer
}

// Clear all data
function clearData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        const result = analyzer.clearData();
        
        // Reset file input
        document.getElementById('csv-file-input').value = '';
        document.getElementById('file-name').textContent = 'No file selected';
        
        // Reset UI elements
        resetUI();
        
        // Destroy chart explicitly
        if (chart) {
            chart.destroy();
            chart = null;
        }
        
        // Show notification
        showNotification(result.message, 'success');
    }
}

// Reset all UI elements
function resetUI() {
    // Reset statistics
    document.getElementById('current-balance').textContent = 'N/A';
    document.getElementById('monthly-expenses').textContent = 'N/A';
    document.getElementById('monthly-income').textContent = 'N/A';
    document.getElementById('net-monthly').textContent = 'N/A';
    document.getElementById('months-until-broke').textContent = 'N/A';
    
    // Reset historical insights
    document.getElementById('historical-expenses').textContent = 'N/A';
    document.getElementById('historical-income').textContent = 'N/A';
    document.getElementById('expense-growth').textContent = 'N/A';
    document.getElementById('income-growth').textContent = 'N/A';
    
    // Reset data completeness indicators
    const progressElements = ['historical-progress', 'expenses-progress', 'incomes-progress'];
    progressElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.width = '0%';
            element.className = 'progress-fill';
        }
    });
    
    document.getElementById('historical-status').textContent = 'Not loaded';
    document.getElementById('expenses-status').textContent = '0 months';
    document.getElementById('incomes-status').textContent = '0 months';
    
    const recommendationText = document.getElementById('recommendation-text');
    if (recommendationText) {
        recommendationText.innerHTML = '<i class="fas fa-lightbulb"></i> Add actual expense and income data for more accurate projections.';
    }
    
    // Reset actual data statistics
    document.getElementById('actual-balance').textContent = 'N/A';
    document.getElementById('actual-monthly-expenses').textContent = 'N/A';
    document.getElementById('actual-months-until-broke').textContent = 'N/A';
    
    // Reset scenario
    document.querySelectorAll('.scenario-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.scenario === 'current') {
            tab.classList.add('active');
        }
    });
    
    document.getElementById('current-scenario-name').textContent = 'Current State';
    
    // Reset burn rate slider
    document.getElementById('burn-rate-slider').value = 1;
    document.getElementById('burn-rate-value').textContent = '100%';
    
    // Clear income list
    document.getElementById('income-list').innerHTML = '';
    
    // Clear chart
    if (chart) {
        chart.destroy();
        chart = null;
    }
    
    // Clear actual expenses table
    const actualExpensesTable = document.getElementById('actual-expenses-table');
    if (actualExpensesTable) {
        const tbody = actualExpensesTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
        }
    }
    
    // Clear actual incomes table
    const actualIncomesTable = document.getElementById('actual-incomes-table');
    if (actualIncomesTable) {
        const tbody = actualIncomesTable.getElementsByTagName('tbody')[0];
        if (tbody) {
            tbody.innerHTML = '';
        }
    }
}

// Update the entire UI
function updateUI() {
    try {
        console.log("Starting UI update...");
        
        // Update statistics
        console.log("Updating statistics...");
        updateStatistics();
        
        // Project cash flow for all scenarios
        console.log("Projecting cash flow...");
        projectCashFlow();
        
        // Update scenario results
        console.log("Updating scenario results...");
        updateScenarioResults();
        
        // Update chart
        console.log("Updating chart...");
        updateChart();
        
        // Update income lists
        console.log("Updating income lists...");
        updateIncomeList();
        
        // Check if the actual expenses table exists before updating it
        if (document.getElementById('actual-expenses-table')) {
            console.log("Updating actual expenses table...");
            updateActualExpensesTable();
        }
        
        // Check if the actual incomes table exists before updating it
        if (document.getElementById('actual-incomes-table')) {
            console.log("Updating actual incomes table...");
            updateActualIncomesTable();
        }
        
        console.log("UI update completed successfully");
    } catch (error) {
        console.error("Error updating UI:", error);
        console.error("Error stack:", error.stack);
        showNotification(`UI update error: ${error.message}. Please check the console for details.`, "error");
    }
}

// Update statistics display
function updateStatistics() {
    if (!analyzer.transactions) return;
    
    // Prioritize actual data when available
    const hasActualData = analyzer.actualExpenses.length > 0;
    
    // Update current balance - use actual balance if available, otherwise use CSV balance
    const currentBalance = hasActualData ? analyzer.calculateActualBalance() : analyzer.balance;
    const currentBalanceElement = document.getElementById('current-balance');
    if (currentBalance !== null) {
        currentBalanceElement.textContent = analyzer.formatCurrency(currentBalance);
        // Add visual indicator if using actual data
        if (hasActualData) {
            currentBalanceElement.style.color = 'var(--primary-color)';
            currentBalanceElement.title = 'Using actual expense data';
        } else {
            currentBalanceElement.style.color = '';
            currentBalanceElement.title = 'Using CSV transaction data';
        }
    } else {
        currentBalanceElement.textContent = analyzer.formatCurrency(analyzer.balance);
        currentBalanceElement.style.color = '';
        currentBalanceElement.title = 'Using CSV transaction data';
    }
    
    // Update monthly expenses - use actual expenses if available, otherwise use CSV calculated expenses
    const monthlyExpenses = hasActualData ? analyzer.calculateActualMonthlyExpenses() : analyzer.calculateMonthlyExpenses();
    const monthlyExpensesElement = document.getElementById('monthly-expenses');
    if (monthlyExpenses !== null) {
        monthlyExpensesElement.textContent = analyzer.formatCurrency(monthlyExpenses);
        // Add visual indicator if using actual data
        if (hasActualData) {
            monthlyExpensesElement.style.color = 'var(--primary-color)';
            monthlyExpensesElement.title = 'Using actual expense data';
        } else {
            monthlyExpensesElement.style.color = '';
            monthlyExpensesElement.title = 'Using CSV transaction data';
        }
    } else {
        monthlyExpensesElement.textContent = analyzer.formatCurrency(analyzer.calculateMonthlyExpenses());
        monthlyExpensesElement.style.color = '';
        monthlyExpensesElement.title = 'Using CSV transaction data';
    }
    
    // Update actual balance (keep this section for reference/comparison)
    const actualBalance = analyzer.calculateActualBalance();
    const actualBalanceElement = document.getElementById('actual-balance');
    if (actualBalance !== null) {
        actualBalanceElement.textContent = analyzer.formatCurrency(actualBalance);
        // Dim this section if we're using actual data in current status
        if (hasActualData) {
            actualBalanceElement.style.opacity = '0.6';
            actualBalanceElement.title = 'This data is now being used in Current Status above';
        } else {
            actualBalanceElement.style.opacity = '1';
            actualBalanceElement.title = '';
        }
    } else {
        actualBalanceElement.textContent = 'N/A';
        actualBalanceElement.style.opacity = '1';
        actualBalanceElement.title = '';
    }
    
    // Update actual monthly expenses (keep this section for reference/comparison)
    const actualMonthlyExpenses = analyzer.calculateActualMonthlyExpenses();
    const actualMonthlyExpensesElement = document.getElementById('actual-monthly-expenses');
    if (actualMonthlyExpenses !== null) {
        actualMonthlyExpensesElement.textContent = analyzer.formatCurrency(actualMonthlyExpenses);
        // Dim this section if we're using actual data in current status
        if (hasActualData) {
            actualMonthlyExpensesElement.style.opacity = '0.6';
            actualMonthlyExpensesElement.title = 'This data is now being used in Current Status above';
        } else {
            actualMonthlyExpensesElement.style.opacity = '1';
            actualMonthlyExpensesElement.title = '';
        }
    } else {
        actualMonthlyExpensesElement.textContent = 'N/A';
        actualMonthlyExpensesElement.style.opacity = '1';
        actualMonthlyExpensesElement.title = '';
    }
    
    // Update actual months until broke
    const actualMonthsUntilBroke = analyzer.calculateActualMonthsUntilBroke();
    const actualMonthsUntilBrokeElement = document.getElementById('actual-months-until-broke');
    if (actualMonthsUntilBroke !== null) {
        actualMonthsUntilBrokeElement.textContent = Math.floor(actualMonthsUntilBroke).toString();
        // Dim this section if we're using actual data in current status
        if (hasActualData) {
            actualMonthsUntilBrokeElement.style.opacity = '0.6';
            actualMonthsUntilBrokeElement.title = 'This data is now being used in Current Status above';
        } else {
            actualMonthsUntilBrokeElement.style.opacity = '1';
            actualMonthsUntilBrokeElement.title = '';
        }
    } else {
        actualMonthsUntilBrokeElement.textContent = 'N/A';
        actualMonthsUntilBrokeElement.style.opacity = '1';
        actualMonthsUntilBrokeElement.title = '';
    }
    
    // Update monthly income
    const hasActualIncomeData = analyzer.actualIncomes.length > 0;
    const monthlyIncomeElement = document.getElementById('monthly-income');
    if (monthlyIncomeElement) {
        if (hasActualIncomeData) {
            const monthlyIncome = analyzer.calculateActualMonthlyIncome();
            monthlyIncomeElement.textContent = analyzer.formatCurrency(monthlyIncome);
            monthlyIncomeElement.style.color = 'var(--success-color)';
            monthlyIncomeElement.title = 'Using actual income data';
        } else if (analyzer.historicalTrends) {
            // Use historical income data from CSV
            const historicalIncome = analyzer.historicalTrends.averageIncomes;
            monthlyIncomeElement.textContent = analyzer.formatCurrency(historicalIncome);
            monthlyIncomeElement.style.color = '';
            monthlyIncomeElement.title = 'Using historical CSV income data';
        } else {
            monthlyIncomeElement.textContent = 'N/A';
            monthlyIncomeElement.style.color = '';
            monthlyIncomeElement.title = 'No income data available';
        }
    }

    // Update net monthly cash flow
    const monthlyExpensesValue = hasActualData ? analyzer.calculateActualMonthlyExpenses() : analyzer.calculateMonthlyExpenses();
    const monthlyIncomeValue = hasActualIncomeData ? analyzer.calculateActualMonthlyIncome() : 
                               (analyzer.historicalTrends ? analyzer.historicalTrends.averageIncomes : 0);
    const netMonthly = monthlyIncomeValue - monthlyExpensesValue;
    
    const netMonthlyElement = document.getElementById('net-monthly');
    if (netMonthlyElement) {
        netMonthlyElement.textContent = analyzer.formatCurrency(netMonthly);
        if (netMonthly > 0) {
            netMonthlyElement.className = 'stat-value positive';
        } else if (netMonthly < 0) {
            netMonthlyElement.className = 'stat-value negative';
        } else {
            netMonthlyElement.className = 'stat-value';
        }
    }

    // Update data source indicator
    const dataSourceTextElement = document.getElementById('data-source-text');
    if (dataSourceTextElement) {
        if (hasActualData || hasActualIncomeData) {
            let sources = [];
            if (hasActualData) sources.push('actual expenses');
            if (hasActualIncomeData) sources.push('actual incomes');
            dataSourceTextElement.textContent = `Using ${sources.join(' & ')} (more accurate)`;
            dataSourceTextElement.style.color = 'var(--primary-color)';
            dataSourceTextElement.style.fontWeight = 'bold';
        } else {
            dataSourceTextElement.textContent = 'Using CSV transaction data';
            dataSourceTextElement.style.color = '';
            dataSourceTextElement.style.fontWeight = '';
        }
    }

    // Update historical insights
    updateHistoricalInsights();
    
    // Update data completeness indicators
    updateDataCompleteness();
}

// Update historical insights display
function updateHistoricalInsights() {
    try {
        const historicalExpensesElement = document.getElementById('historical-expenses');
        const historicalIncomeElement = document.getElementById('historical-income');
        const expenseGrowthElement = document.getElementById('expense-growth');
        const incomeGrowthElement = document.getElementById('income-growth');
        
        if (analyzer.historicalTrends) {
            // Historical expenses
            if (historicalExpensesElement) {
                historicalExpensesElement.textContent = analyzer.formatCurrency(analyzer.historicalTrends.averageExpenses);
            }
            
            // Historical income
            if (historicalIncomeElement) {
                historicalIncomeElement.textContent = analyzer.formatCurrency(analyzer.historicalTrends.averageIncomes);
            }
            
            // Expense growth rate
            if (expenseGrowthElement) {
                const expenseGrowth = analyzer.historicalTrends.expenseGrowthRate;
                const expenseGrowthPercent = (expenseGrowth * 100).toFixed(1);
                expenseGrowthElement.textContent = `${expenseGrowthPercent > 0 ? '+' : ''}${expenseGrowthPercent}%`;
                
                if (expenseGrowth > 0.05) {
                    expenseGrowthElement.className = 'insight-value negative';
                } else if (expenseGrowth < -0.05) {
                    expenseGrowthElement.className = 'insight-value positive';
                } else {
                    expenseGrowthElement.className = 'insight-value';
                }
            }
            
            // Income growth rate
            if (incomeGrowthElement) {
                const incomeGrowth = analyzer.historicalTrends.incomeGrowthRate;
                const incomeGrowthPercent = (incomeGrowth * 100).toFixed(1);
                incomeGrowthElement.textContent = `${incomeGrowth > 0 ? '+' : ''}${incomeGrowthPercent}%`;
                
                if (incomeGrowth > 0.05) {
                    incomeGrowthElement.className = 'insight-value positive';
                } else if (incomeGrowth < -0.05) {
                    incomeGrowthElement.className = 'insight-value negative';
                } else {
                    incomeGrowthElement.className = 'insight-value';
                }
            }
        } else {
            // No historical data available
            if (historicalExpensesElement) historicalExpensesElement.textContent = 'N/A';
            if (historicalIncomeElement) historicalIncomeElement.textContent = 'N/A';
            if (expenseGrowthElement) expenseGrowthElement.textContent = 'N/A';
            if (incomeGrowthElement) incomeGrowthElement.textContent = 'N/A';
        }
    } catch (error) {
        console.error("Error updating historical insights:", error);
        // Gracefully handle missing elements by setting them to N/A
        try {
            if (document.getElementById('historical-expenses')) document.getElementById('historical-expenses').textContent = 'N/A';
            if (document.getElementById('historical-income')) document.getElementById('historical-income').textContent = 'N/A';
            if (document.getElementById('expense-growth')) document.getElementById('expense-growth').textContent = 'N/A';
            if (document.getElementById('income-growth')) document.getElementById('income-growth').textContent = 'N/A';
        } catch (e) {
            console.error("Error handling historical insights fallback:", e);
        }
    }
}

// Update data completeness indicators
function updateDataCompleteness() {
    try {
        // Historical data progress
        const historicalProgress = document.getElementById('historical-progress');
        const historicalStatus = document.getElementById('historical-status');
        
        if (analyzer.transactions && analyzer.transactions.length > 0) {
            if (historicalProgress) {
                historicalProgress.style.width = '100%';
                historicalProgress.className = 'progress-fill complete';
            }
            if (historicalStatus) {
                const monthsOfData = Math.ceil(analyzer.transactions.length / 30); // Rough estimate
                historicalStatus.textContent = `${monthsOfData} months`;
            }
        } else {
            if (historicalProgress) {
                historicalProgress.style.width = '0%';
                historicalProgress.className = 'progress-fill';
            }
            if (historicalStatus) historicalStatus.textContent = 'Not loaded';
        }
        
        // Actual expenses progress
        const expensesProgress = document.getElementById('expenses-progress');
        const expensesStatus = document.getElementById('expenses-status');
        
        const expenseMonths = analyzer.actualExpenses.length;
        const expenseCompleteness = Math.min(expenseMonths / 3, 1) * 100; // Consider 3 months as "good"
        
        if (expensesProgress) {
            expensesProgress.style.width = `${expenseCompleteness}%`;
            if (expenseMonths >= 3) {
                expensesProgress.className = 'progress-fill complete';
            } else if (expenseMonths > 0) {
                expensesProgress.className = 'progress-fill partial';
            } else {
                expensesProgress.className = 'progress-fill';
            }
        }
        
        if (expensesStatus) {
            expensesStatus.textContent = `${expenseMonths} months`;
        }
        
        // Actual incomes progress
        const incomesProgress = document.getElementById('incomes-progress');
        const incomesStatus = document.getElementById('incomes-status');
        
        const incomeMonths = analyzer.actualIncomes.length;
        const incomeCompleteness = Math.min(incomeMonths / 3, 1) * 100; // Consider 3 months as "good"
        
        if (incomesProgress) {
            incomesProgress.style.width = `${incomeCompleteness}%`;
            if (incomeMonths >= 3) {
                incomesProgress.className = 'progress-fill complete';
            } else if (incomeMonths > 0) {
                incomesProgress.className = 'progress-fill partial';
            } else {
                incomesProgress.className = 'progress-fill';
            }
        }
        
        if (incomesStatus) {
            incomesStatus.textContent = `${incomeMonths} months`;
        }
        
        // Update recommendation
        const recommendationText = document.getElementById('recommendation-text');
        if (recommendationText) {
            if (expenseMonths === 0 && incomeMonths === 0) {
                recommendationText.innerHTML = '<i class="fas fa-lightbulb"></i> Start by adding actual expense and income data for more accurate projections.';
            } else if (expenseMonths < 3 || incomeMonths < 3) {
                recommendationText.innerHTML = '<i class="fas fa-chart-line"></i> Add more months of data (aim for 3+ months) to improve projection accuracy.';
            } else {
                recommendationText.innerHTML = '<i class="fas fa-check-circle"></i> Great! You have sufficient data for accurate projections.';
            }
        }
    } catch (error) {
        console.error("Error updating data completeness:", error);
        // Gracefully handle missing elements
        try {
            if (document.getElementById('historical-status')) document.getElementById('historical-status').textContent = 'Error';
            if (document.getElementById('expenses-status')) document.getElementById('expenses-status').textContent = 'Error';
            if (document.getElementById('incomes-status')) document.getElementById('incomes-status').textContent = 'Error';
        } catch (e) {
            console.error("Error handling data completeness fallback:", e);
        }
    }
}

// Update transactions table
function updateTransactionsTable() {
    if (!analyzer.transactions) return;
    
    const tableBody = document.getElementById('transactions-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';
    
    // Limit to the latest 100 transactions to keep the page responsive
    const transactionsToShow = analyzer.transactions.slice(-100);
    
    transactionsToShow.forEach(transaction => {
        const row = tableBody.insertRow();
        
        // Format date as DD/MM/YYYY
        const formatDate = (date) => {
            const d = new Date(date);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        };
        
        // Add cells
        row.insertCell(0).textContent = formatDate(transaction.transactionDate);
        row.insertCell(1).textContent = formatDate(transaction.valueDate);
        row.insertCell(2).textContent = transaction.description;
        
        // Amount cell with color coding
        const amountCell = row.insertCell(3);
        amountCell.textContent = analyzer.formatCurrency(transaction.amount);
        amountCell.style.color = transaction.amount < 0 ? 'var(--danger-color)' : 'var(--success-color)';
        
        // Balance cell
        row.insertCell(4).textContent = analyzer.formatCurrency(transaction.balance);
    });
}

// ====================================
// Scenario Management Functions
// ====================================

// Change active scenario
function changeActiveScenario(scenarioId) {
    if (!analyzer.scenarios[scenarioId]) return;
    
    // Update analyzer
    analyzer.activeScenario = scenarioId;
    
    // Update UI
    document.querySelectorAll('.scenario-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.scenario === scenarioId) {
            tab.classList.add('active');
        }
    });
    
    // Update scenario name
    document.getElementById('current-scenario-name').textContent = analyzer.scenarios[scenarioId].name;
    
    // Update burn rate slider
    document.getElementById('burn-rate-slider').value = analyzer.scenarios[scenarioId].burnRateFactor;
    document.getElementById('burn-rate-value').textContent = `${Math.round(analyzer.scenarios[scenarioId].burnRateFactor * 100)}%`;
    
    // Update income list
    updateIncomeList();
    
    // Update results
    updateScenarioResults();
    
    // Update chart
    updateChart();
}

// Add income to the active scenario
function addIncome() {
    try {
        console.log("addIncome function called");
        
        // Check if the analyzer object and its properties exist
        if (!analyzer || !analyzer.scenarios || !analyzer.activeScenario) {
            console.error("Analyzer object not properly initialized:", analyzer);
            alert('No data loaded. Please import transaction data first.');
            return;
        }
        
        // Check if the active scenario exists
        if (!analyzer.scenarios[analyzer.activeScenario]) {
            console.error("Active scenario doesn't exist:", analyzer.activeScenario);
            alert('Invalid scenario selected. Please try a different scenario.');
            return;
        }
        
        const dateStr = document.getElementById('income-date').value;
        const amount = parseFloat(document.getElementById('income-amount').value);
        
        console.log("Income inputs:", { dateStr, amount });
        
        if (!dateStr || isNaN(amount) || amount <= 0) {
            console.warn("Invalid income data:", { dateStr, amount });
            alert('Please enter a valid date and positive amount.');
            return;
        }
        
        // Ensure proper date parsing
        let date;
        try {
            // Create a Date object from the input (use local timezone)
            date = new Date(dateStr);
            
            // Ensure we're setting the time to noon to avoid timezone issues
            date.setHours(12, 0, 0, 0);
            
            console.log("Parsed date:", date, "ISO:", date.toISOString(), "Local string:", date.toLocaleString());
            
            // Sanity check - ensure the date is valid
            if (isNaN(date.getTime())) {
                throw new Error("Invalid date created");
            }
            
            // Additional check - convert to ISO string and back to ensure consistent timezone handling
            const isoString = date.toISOString();
            console.log("Re-parsing from ISO string to ensure consistency");
            date = new Date(isoString);
            date.setHours(12, 0, 0, 0); // Re-set hours to noon in case timezone conversion shifted it
            
            console.log("Final income date after normalization:", date, "ISO:", date.toISOString());
        } catch (error) {
            console.error("Date parsing error:", error);
            alert('Please enter a valid date in the format YYYY-MM-DD.');
            return;
        }
        
        // Add income to scenario
        console.log("Adding income to scenario:", { date, amount, scenario: analyzer.activeScenario });
        analyzer.scenarios[analyzer.activeScenario].incomes.push({
            date: date,
            amount: amount
        });
        
        // Clear input fields
        document.getElementById('income-amount').value = '';
        
        // Re-project and update
        console.log("Re-projecting cash flow...");
        projectCashFlow();
        console.log("Updating income list...");
        
        // Ensure income list container is visible
        const incomeListContainer = document.querySelector('.income-list-container');
        if (incomeListContainer) {
            incomeListContainer.style.display = 'block';
            incomeListContainer.style.visibility = 'visible';
            incomeListContainer.style.opacity = '1';
        }
        
        // Update the income list
        updateIncomeList();
        
        // Make sure at least one income item is visible in the list
        const incomeList = document.getElementById('income-list');
        if (incomeList && incomeList.children.length === 0) {
            console.error("Income list is empty after update - forcing display of added income");
            const li = document.createElement('li');
            
            // Format date as DD/MM/YYYY
            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            
            // Create content
            const dateSpan = document.createElement('span');
            dateSpan.textContent = formattedDate;
            
            const amountSpan = document.createElement('span');
            amountSpan.textContent = analyzer.formatCurrency(amount);
            amountSpan.style.color = 'var(--success-color)';
            amountSpan.style.fontWeight = 'bold';
            
            const removeButton = document.createElement('i');
            removeButton.classList.add('fas', 'fa-times', 'remove-income');
            removeButton.addEventListener('click', () => {
                // Find the index by date and amount
                const incomes = analyzer.scenarios[analyzer.activeScenario].incomes;
                const index = incomes.findIndex(income => 
                    income.date.getTime() === date.getTime() && income.amount === amount
                );
                if (index !== -1) {
                    removeIncome(index);
                }
            });
            
            // Add to list item
            li.appendChild(dateSpan);
            li.appendChild(amountSpan);
            li.appendChild(removeButton);
            
            incomeList.appendChild(li);
        }
        
        console.log("Updating scenario results...");
        updateScenarioResults();
        console.log("Updating chart...");
        updateChart();
        
        console.log("Income added successfully", analyzer.scenarios[analyzer.activeScenario].incomes);
        showNotification('Income added successfully.', 'success');
    } catch (error) {
        console.error("Error in addIncome function:", error);
        alert('An error occurred while adding income: ' + error.message);
    }
}

// Clear all incomes for the active scenario
function clearIncomes() {
    if (confirm(`Are you sure you want to clear all incomes for ${analyzer.scenarios[analyzer.activeScenario].name}?`)) {
        analyzer.scenarios[analyzer.activeScenario].incomes = [];
        
        // Re-project and update
        projectCashFlow();
        updateIncomeList();
        updateScenarioResults();
        updateChart();
    }
}

// Remove a specific income
function removeIncome(index) {
    analyzer.scenarios[analyzer.activeScenario].incomes.splice(index, 1);
    
    // Re-project and update
    projectCashFlow();
    updateIncomeList();
    updateScenarioResults();
    updateChart();
}

// Update burn rate
function updateBurnRate(event) {
    const value = parseFloat(event.target.value);
    if (isNaN(value)) return;
    
    // Update burn rate factor
    analyzer.scenarios[analyzer.activeScenario].burnRateFactor = value;
    
    // Update display
    document.getElementById('burn-rate-value').textContent = `${Math.round(value * 100)}%`;
    
    // Re-project and update
    projectCashFlow();
    updateScenarioResults();
    updateChart();
}

// Update income list display
function updateIncomeList() {
    try {
        console.log("updateIncomeList function called");
        const incomeList = document.getElementById('income-list');
        
        if (!incomeList) {
            console.error("Could not find income-list element in DOM");
            return;
        }
        
        // Ensure the incomeList is visible
        incomeList.style.display = 'block';
        
        // Also make sure the container is visible
        const incomeListContainer = document.querySelector('.income-list-container');
        if (incomeListContainer) {
            incomeListContainer.style.display = 'block';
            incomeListContainer.style.visibility = 'visible';
            incomeListContainer.style.opacity = '1';
        }
        
        incomeList.innerHTML = '';
        
        if (!analyzer || !analyzer.scenarios || !analyzer.activeScenario) {
            console.error("Analyzer object not properly initialized in updateIncomeList");
            return;
        }
        
        const incomes = analyzer.scenarios[analyzer.activeScenario].incomes;
        
        if (!incomes || !Array.isArray(incomes)) {
            console.error("Incomes array not found or invalid:", incomes);
            return;
        }
        
        console.log("Current incomes in scenario:", incomes);
        
        if (incomes.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No incomes added';
            li.style.color = '#777';
            li.style.fontStyle = 'italic';
            incomeList.appendChild(li);
            return;
        }
        
        // Sort incomes by date
        const sortedIncomes = [...incomes].sort((a, b) => a.date - b.date);
        
        sortedIncomes.forEach((income, index) => {
            const li = document.createElement('li');
            
            // Format date as DD/MM/YYYY
            const date = new Date(income.date);
            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            
            // Create content
            const dateSpan = document.createElement('span');
            dateSpan.textContent = formattedDate;
            
            const amountSpan = document.createElement('span');
            amountSpan.textContent = analyzer.formatCurrency(income.amount);
            amountSpan.style.color = 'var(--success-color)';
            amountSpan.style.fontWeight = 'bold';
            
            const removeButton = document.createElement('i');
            removeButton.classList.add('fas', 'fa-times', 'remove-income');
            removeButton.addEventListener('click', () => removeIncome(index));
            
            // Add to list item
            li.appendChild(dateSpan);
            li.appendChild(amountSpan);
            li.appendChild(removeButton);
            
            incomeList.appendChild(li);
        });
        
        console.log("Income list updated successfully");
    } catch (error) {
        console.error("Error in updateIncomeList function:", error);
    }
}

// ====================================
// Cash Flow Projection Functions
// ====================================

// Project cash flow for all scenarios
function projectCashFlow(monthsAhead = 24) {
    if (!analyzer.transactions) return;
    
    // Project baseline first
    projectBaseline(monthsAhead);
    
    // Project for each scenario
    Object.keys(analyzer.scenarios).forEach(scenarioId => {
        projectCashFlowForScenario(scenarioId, monthsAhead);
    });
}

// Project baseline (current state with 100% burn rate)
function projectBaseline(monthsAhead = 24) {
    if (!analyzer.transactions) return null;
    
    // Use actual expenses if available, otherwise use CSV calculated expenses
    const hasActualData = analyzer.actualExpenses.length > 0;
    const monthlyExpenses = hasActualData ? analyzer.calculateActualMonthlyExpenses() : analyzer.calculateMonthlyExpenses();
    const startingBalance = hasActualData ? analyzer.calculateActualBalance() : analyzer.balance;
    
    try {
        // Get the last transaction date
        const lastDate = analyzer.transactions[analyzer.transactions.length - 1].transactionDate;
        
        // Validate date
        if (!lastDate || !(lastDate instanceof Date) || isNaN(lastDate.getTime())) {
            console.error("Invalid last transaction date", lastDate);
            // Use current date as fallback
            const fallbackDate = new Date();
            
            // Create baseline projection
            const projection = [];
            
            // Initial point (today)
            projection.push({
                date: fallbackDate,
                balance: startingBalance,
                expenses: 0,
                income: 0
            });
            
            // Project future months
            for (let i = 1; i <= monthsAhead; i++) {
                const projectedDate = new Date(fallbackDate);
                projectedDate.setMonth(projectedDate.getMonth() + i);
                
                const previousBalance = projection[i-1].balance;
                
                projection.push({
                    date: projectedDate,
                    balance: previousBalance - monthlyExpenses,
                    expenses: monthlyExpenses,
                    income: 0
                });
            }
            
            analyzer.baselineData = projection;
            return projection;
        }
        
        // Create baseline projection
        const projection = [];
        
        // Initial point (today)
        projection.push({
            date: new Date(lastDate),
            balance: startingBalance,
            expenses: 0,
            income: 0
        });
        
        // Project future months
        for (let i = 1; i <= monthsAhead; i++) {
            const projectedDate = new Date(lastDate);
            projectedDate.setMonth(projectedDate.getMonth() + i);
            
            const previousBalance = projection[i-1].balance;
            
            projection.push({
                date: projectedDate,
                balance: previousBalance - monthlyExpenses,
                expenses: monthlyExpenses,
                income: 0
            });
        }
        
        analyzer.baselineData = projection;
        return projection;
    } catch (error) {
        console.error("Error in projectBaseline:", error);
        
        // Create a fallback projection with current date
        const fallbackDate = new Date();
        const projection = [];
        
        projection.push({
            date: fallbackDate,
            balance: startingBalance || 0,
            expenses: 0,
            income: 0
        });
        
        for (let i = 1; i <= monthsAhead; i++) {
            const projectedDate = new Date(fallbackDate);
            projectedDate.setMonth(projectedDate.getMonth() + i);
            
            projection.push({
                date: projectedDate,
                balance: (startingBalance || 0) - (monthlyExpenses * i),
                expenses: monthlyExpenses,
                income: 0
            });
        }
        
        analyzer.baselineData = projection;
        return projection;
    }
}

// Project cash flow for a specific scenario
function projectCashFlowForScenario(scenarioId, monthsAhead = 24) {
    if (!analyzer.transactions || !analyzer.scenarios[scenarioId]) return null;
    
    // Ensure baseline exists
    if (!analyzer.baselineData) {
        projectBaseline(monthsAhead);
    }
    
    try {
        // Use actual expenses if available, otherwise use CSV calculated expenses
        const hasActualData = analyzer.actualExpenses.length > 0;
        const monthlyExpenses = hasActualData ? analyzer.calculateActualMonthlyExpenses() : analyzer.calculateMonthlyExpenses();
        const burnRateFactor = analyzer.scenarios[scenarioId].burnRateFactor;
        const adjustedMonthlyExpenses = monthlyExpenses * burnRateFactor;
        const startingBalance = hasActualData ? analyzer.calculateActualBalance() : analyzer.balance;
        
        // Get the last transaction date
        const lastDate = analyzer.transactions[analyzer.transactions.length - 1].transactionDate;
        
        // Validate date
        if (!lastDate || !(lastDate instanceof Date) || isNaN(lastDate.getTime())) {
            console.error("Invalid last transaction date in scenario projection", lastDate);
            // Use baseline data as a fallback if available
            if (analyzer.baselineData && analyzer.baselineData.length > 0) {
                analyzer.scenarios[scenarioId].data = [...analyzer.baselineData];
                return analyzer.scenarios[scenarioId].data;
            }
            
            // If no baseline, use current date
            const fallbackDate = new Date();
            const projection = [];
            
            projection.push({
                date: fallbackDate,
                balance: startingBalance || 0,
                expenses: 0,
                income: 0
            });
            
            for (let i = 1; i <= monthsAhead; i++) {
                const projectedDate = new Date(fallbackDate);
                projectedDate.setMonth(projectedDate.getMonth() + i);
                
                projection.push({
                    date: projectedDate,
                    balance: (startingBalance || 0) - (adjustedMonthlyExpenses * i),
                    expenses: adjustedMonthlyExpenses,
                    income: 0
                });
            }
            
            analyzer.scenarios[scenarioId].data = projection;
            return projection;
        }
        
        // Create projection
        const projection = [];
        
        // Initial point (today)
        projection.push({
            date: new Date(lastDate),
            balance: startingBalance,
            expenses: 0,
            income: 0
        });
        
        // Project future months
        for (let i = 1; i <= monthsAhead; i++) {
            const projectedDate = new Date(lastDate);
            projectedDate.setMonth(projectedDate.getMonth() + i);
            
            const previousBalance = projection[i-1].balance;
            
            projection.push({
                date: projectedDate,
                balance: previousBalance - adjustedMonthlyExpenses,
                expenses: adjustedMonthlyExpenses,
                income: 0
            });
        }
        
        // Apply additional incomes
        console.log(`Processing ${analyzer.scenarios[scenarioId].incomes.length} incomes for scenario '${scenarioId}'`, analyzer.scenarios[scenarioId].incomes);

        // Debug: Create a copy of the incomes to track which ones get applied
        const incomesToApply = [...analyzer.scenarios[scenarioId].incomes];
        const appliedIncomes = [];
        const skippedIncomes = [];

        // Debug: Log the projection months first for reference
        console.log("Projection months available:", projection.map((p, i) => {
            return `Month ${i}: ${p.date.getFullYear()}-${p.date.getMonth()+1}-${p.date.getDate()}`;
        }));

        analyzer.scenarios[scenarioId].incomes.forEach((income, idx) => {
            try {
                console.log(`Processing income #${idx}:`, income);
                const incomeDate = new Date(income.date);
                const incomeAmount = income.amount;
                
                // Additional date debugging
                console.log(`Income date details: Year=${incomeDate.getFullYear()}, Month=${incomeDate.getMonth()}, Day=${incomeDate.getDate()}, ISO=${incomeDate.toISOString()}`);
                
                // Validate income entry
                if (!incomeDate || !(incomeDate instanceof Date) || isNaN(incomeDate.getTime()) || !incomeAmount) {
                    console.warn("Invalid income entry", income);
                    skippedIncomes.push({income, reason: "Invalid date or amount"});
                    return; // Skip this income
                }
                
                // Check if the income date is within the projection period
                const firstProjectionDate = projection[0].date;
                const lastProjectionDate = projection[projection.length - 1].date;
                
                console.log(`Valid income: ${incomeAmount} on ${incomeDate.toISOString()}`);
                console.log(`Projection period: ${firstProjectionDate.toISOString()} to ${lastProjectionDate.toISOString()}`);
                
                let incomeApplied = false;
                
                // If income date is before the first projection date, apply to first month
                if (incomeDate < firstProjectionDate) {
                    console.log(`Income date (${incomeDate.toISOString()}) is before projection start, applying to first month`);
                    projection[0].income += incomeAmount;
                    
                    // Update balance for all months
                    for (let j = 0; j < projection.length; j++) {
                        projection[j].balance += incomeAmount;
                    }
                    
                    incomeApplied = true;
                    appliedIncomes.push({income, appliedToMonth: 0});
                }
                // If income date is after the last projection date, skip
                else if (incomeDate > lastProjectionDate) {
                    console.warn(`Income date (${incomeDate.toISOString()}) is after projection end, income not applied`);
                    skippedIncomes.push({income, reason: "Date after projection end"});
                    return;
                }
                // Otherwise find the closest month
                else {
                    console.log("Looking for matching month for income date:", incomeDate);
                    
                    // First try to find an exact month match
                    let exactMatchFound = false;
                    for (let i = 0; i < projection.length; i++) {
                        // Log the comparison for debugging
                        console.log(`Checking month ${i}: Projection date=${projection[i].date.getFullYear()}-${projection[i].date.getMonth()+1}, Income date=${incomeDate.getFullYear()}-${incomeDate.getMonth()+1}`);
                        
                        if (projection[i].date.getFullYear() === incomeDate.getFullYear() && 
                            projection[i].date.getMonth() === incomeDate.getMonth()) {
                            
                            console.log(`Exact month match: Applying income to month ${i} (${projection[i].date.toISOString()})`);
                            projection[i].income += incomeAmount;
                            
                            // Update balance for this month and all future months
                            for (let j = i; j < projection.length; j++) {
                                projection[j].balance += incomeAmount;
                            }
                            
                            incomeApplied = true;
                            exactMatchFound = true;
                            appliedIncomes.push({income, appliedToMonth: i});
                            break;
                        }
                    }
                    
                    // Log if no exact match was found
                    if (!exactMatchFound) {
                        console.log("No exact month match found, searching for closest month after income date");
                    }
                    
                    // If no exact match found, find the closest month that is after the income date
                    if (!incomeApplied) {
                        let closestIndex = -1;
                        let minDiff = Number.MAX_VALUE;
                        
                        for (let i = 0; i < projection.length; i++) {
                            const projDate = projection[i].date;
                            
                            // Only consider dates after the income date
                            if (projDate >= incomeDate) {
                                const diff = Math.abs(projDate.getTime() - incomeDate.getTime());
                                console.log(`Checking distance to month ${i}: diff=${diff}, minDiff=${minDiff}`);
                                if (diff < minDiff) {
                                    minDiff = diff;
                                    closestIndex = i;
                                }
                            }
                        }
                        
                        if (closestIndex >= 0) {
                            console.log(`Found closest month: Applying income to month ${closestIndex} (${projection[closestIndex].date.toISOString()})`);
                            projection[closestIndex].income += incomeAmount;
                            
                            // Update balance for this month and all future months
                            for (let j = closestIndex; j < projection.length; j++) {
                                projection[j].balance += incomeAmount;
                            }
                            
                            incomeApplied = true;
                            appliedIncomes.push({income, appliedToMonth: closestIndex});
                        }
                    }
                }
                
                if (!incomeApplied) {
                    console.warn(`Could not find suitable month for income: ${incomeDate.toISOString()}. Available months:`, 
                                 projection.map(p => `${p.date.getMonth()+1}/${p.date.getFullYear()}`));
                    skippedIncomes.push({income, reason: "No suitable month found"});
                }
            } catch (err) {
                console.error("Error processing income:", err, income);
                skippedIncomes.push({income, reason: "Error: " + err.message});
            }
        });

        // Log summary of applied and skipped incomes
        console.log(`Applied ${appliedIncomes.length} of ${analyzer.scenarios[scenarioId].incomes.length} incomes:`, appliedIncomes);
        if (skippedIncomes.length > 0) {
            console.warn(`Skipped ${skippedIncomes.length} incomes:`, skippedIncomes);
        }
        
        // Verify the projection balances were updated correctly
        console.log("Final projection balances:", projection.map((p, i) => {
            return `Month ${i}: ${p.balance} (income: ${p.income || 0})`;
        }));
        
        // Store projection in scenario
        analyzer.scenarios[scenarioId].data = projection;
        
        return projection;
    } catch (error) {
        console.error("Error projecting cash flow for scenario:", error);
        
        // Use baseline data as a fallback if available
        if (analyzer.baselineData && analyzer.baselineData.length > 0) {
            analyzer.scenarios[scenarioId].data = [...analyzer.baselineData];
            return analyzer.scenarios[scenarioId].data;
        }
        
        // If no baseline, create a minimal projection
        const fallbackDate = new Date();
        const projection = [];
        
        for (let i = 0; i <= monthsAhead; i++) {
            const projectedDate = new Date(fallbackDate);
            projectedDate.setMonth(projectedDate.getMonth() + i);
            
            projection.push({
                date: projectedDate,
                balance: (analyzer.balance || 0) - (i * (analyzer.calculateMonthlyExpenses() || 1000)),
                expenses: analyzer.calculateMonthlyExpenses() || 1000,
                income: 0
            });
        }
        
        analyzer.scenarios[scenarioId].data = projection;
        return projection;
    }
}

// Calculate months until broke for a scenario
function getMonthsUntilBroke(scenarioId = 'current') {
    if (!analyzer.scenarios[scenarioId] || !analyzer.scenarios[scenarioId].data) {
        return 0;
    }
    
    const projection = analyzer.scenarios[scenarioId].data;
    
    // Find the first month with negative balance
    for (let i = 0; i < projection.length; i++) {
        if (projection[i].balance < 0) {
            return i - 1; // Return the number of months before going negative
        }
    }
    
    // If no negative balance found, return the total projection months
    return projection.length - 1;
}

// Update scenario results display
function updateScenarioResults() {
    if (!analyzer.transactions) return;
    
    // Update months until broke for current scenario
    const monthsUntilBroke = getMonthsUntilBroke(analyzer.activeScenario);
    document.getElementById('months-until-broke').textContent = monthsUntilBroke > 0 ? monthsUntilBroke.toString() : 'N/A';
}

// ====================================
// Chart Functions
// ====================================

// Update the cash flow projection chart
function updateChart() {
    if (!analyzer.transactions) return;
    
    try {
        // Get canvas context
        const ctx = document.getElementById('cash-flow-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (chart) {
            chart.destroy();
        }
        
        // Prepare datasets for each scenario
        const datasets = [];
        
        // Ensure baseline data exists
        if (!analyzer.baselineData || analyzer.baselineData.length === 0) {
            console.warn("No baseline data for chart, generating...");
            projectBaseline();
            if (!analyzer.baselineData) {
                console.error("Failed to create baseline data");
                return;
            }
        }
        
        // Validate and clean data for chart
        const validateDate = (date) => {
            if (!date) return false;
            if (typeof date === 'number') return true;
            
            // If it's a Date object, ensure it's valid
            if (date instanceof Date) {
                return !isNaN(date.getTime());
            }
            
            return false;
        };
        
        // Generate datasets for each scenario
        Object.keys(analyzer.scenarios).forEach(scenarioId => {
            if (!analyzer.scenarios[scenarioId].data) return;
            
            // Debug: log incomes and data for this scenario
            console.log(`Chart data for scenario '${scenarioId}':`);
            console.log(`- Incomes:`, analyzer.scenarios[scenarioId].incomes);
            
            // Verify projection data has income values
            const hasIncomes = analyzer.scenarios[scenarioId].incomes.length > 0;
            if (hasIncomes) {
                console.log(`- Checking if ${analyzer.scenarios[scenarioId].incomes.length} incomes are reflected in projection data:`);
                
                // Find months with income
                const monthsWithIncome = analyzer.scenarios[scenarioId].data
                    .filter(d => d.income && d.income > 0)
                    .map((d, i) => {
                        return {
                            month: `${d.date.getFullYear()}-${d.date.getMonth()+1}`, 
                            income: d.income,
                            balance: d.balance
                        };
                    });
                
                console.log(`- Found ${monthsWithIncome.length} months with income in projection:`, monthsWithIncome);
                
                // If no months have income but incomes exist, force a re-projection
                if (monthsWithIncome.length === 0 && hasIncomes) {
                    console.warn("No months with income found in projection data despite having incomes - re-projecting");
                    projectCashFlowForScenario(scenarioId);
                }
            }
            
            // Clean and validate the data
            const cleanData = analyzer.scenarios[scenarioId].data
                .filter(d => d && validateDate(d.date))
                .map(d => {
                    const dateValue = d.date instanceof Date ? d.date.getTime() : d.date;
                    return { 
                        x: dateValue,
                        y: d.balance 
                    };
                });
            
            if (cleanData.length === 0) {
                console.warn(`No valid data for scenario ${scenarioId}`);
                return;
            }
            
            console.log(`- Final chart data points: ${cleanData.length}`, 
                cleanData.map(d => `${new Date(d.x).toISOString().substr(0, 10)}: ${d.y.toFixed(2)}`).slice(0, 5));
            
            datasets.push({
                label: analyzer.scenarios[scenarioId].name,
                data: cleanData,
                borderColor: analyzer.scenarios[scenarioId].color,
                backgroundColor: `${analyzer.scenarios[scenarioId].color}20`,
                borderWidth: scenarioId === analyzer.activeScenario ? 3 : 1.5,
                tension: 0.1,
                fill: false
            });
        });
        
        // Add actual expense data if available and checkbox is checked
        const showActualData = document.getElementById('show-actual-data').checked;
        
        if (showActualData) {
            console.log("Show actual data checkbox is checked");
            
            if (analyzer.actualExpenses.length > 0) {
                console.log(`Found ${analyzer.actualExpenses.length} actual expense entries`);
                const actualData = analyzer.getActualExpensesForChart();
                
                if (actualData && actualData.length > 0) {
                    console.log(`Generated ${actualData.length} data points for actual expenses chart`);
                    
                    const cleanActualData = actualData
                        .filter(d => d && validateDate(d.date))
                        .map(d => {
                            const dateValue = d.date instanceof Date ? d.date.getTime() : d.date;
                            return { 
                                x: dateValue,
                                y: d.balance 
                            };
                        });
                    
                    if (cleanActualData.length > 0) {
                        console.log(`Added ${cleanActualData.length} clean data points for actual data visualization`);
                        
                        datasets.push({
                            label: 'Actual Performance',
                            data: cleanActualData,
                            borderColor: '#f39c12',  // Use a distinct color (amber)
                            backgroundColor: '#f39c1220',
                            borderWidth: 3,
                            borderDash: [5, 5],
                            tension: 0,
                            fill: false
                        });
                    } else {
                        console.warn("No valid actual expense data points after cleaning");
                    }
                } else {
                    console.warn("No actual expense data points generated");
                }
            } else {
                console.log("No actual expense data available");
            }
        } else {
            console.log("Show actual data checkbox is unchecked");
        }
        
        // If no valid datasets, don't create chart
        if (datasets.length === 0) {
            console.error("No valid datasets for chart");
            return;
        }
        
        // Create zero line dataset
        const zeroData = analyzer.baselineData
            .filter(d => d && validateDate(d.date))
            .map(d => {
                const dateValue = d.date instanceof Date ? d.date.getTime() : d.date;
                return { 
                    x: dateValue,
                    y: 0 
                };
            });
        
        if (zeroData.length > 0) {
            datasets.push({
                label: 'Zero',
                data: zeroData,
                borderColor: '#777',
                borderWidth: 1,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            });
        }
        
        console.log(`Creating chart with ${datasets.length} datasets`);
        
        // Create the chart
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Balance'
                        },
                        ticks: {
                            callback: function(value) {
                                return new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'EUR',
                                    maximumFractionDigits: 0
                                }).format(value);
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'EUR'
                                }).format(context.parsed.y)}`;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error updating chart:", error);
    }
}

// Update the actual expenses table
function updateActualExpensesTable() {
    const table = document.getElementById('actual-expenses-table');
    if (!table) {
        console.error("Could not find actual-expenses-table element");
        return;
    }
    
    const tbody = table.getElementsByTagName('tbody')[0];
    if (!tbody) {
        console.error("Could not find tbody element in actual-expenses-table");
        return;
    }
    
    tbody.innerHTML = '';
    
    // Log current actual expenses
    console.log("Updating actual expenses table with data:", analyzer.actualExpenses);
    
    // If no data
    if (!analyzer.actualExpenses || analyzer.actualExpenses.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 4;
        cell.textContent = 'No actual expense data recorded';
        cell.style.textAlign = 'center';
        cell.style.fontStyle = 'italic';
        cell.style.color = '#777';
        return;
    }
    
    // Get month names
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Sort by date first
    const sortedExpenses = [...analyzer.actualExpenses].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });
    
    // Add a row for each expense
    sortedExpenses.forEach(expense => {
        try {
            const row = tbody.insertRow();
            
            // Month - ensure it's in valid range
            const monthIndex = expense.month >= 0 && expense.month < 12 ? expense.month : 0;
            row.insertCell(0).textContent = monthNames[monthIndex];
            
            // Year
            row.insertCell(1).textContent = expense.year;
            
            // Amount (formatted)
            const amountCell = row.insertCell(2);
            amountCell.textContent = analyzer.formatCurrency(expense.amount);
            amountCell.style.color = 'var(--danger-color)';
            
            // Action button
            const actionCell = row.insertCell(3);
            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-button';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.addEventListener('click', () => removeActualExpense(expense.month, expense.year));
            actionCell.appendChild(deleteButton);
        } catch (err) {
            console.error("Error creating row for expense:", err, expense);
        }
    });
}

// Add an actual expense
function addActualExpense() {
    const month = document.getElementById('month-selector').value;
    const year = document.getElementById('year-selector').value;
    const amount = document.getElementById('actual-expense').value;
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        showNotification("Please enter a valid positive expense amount", "warning");
        return;
    }
    
    const result = analyzer.addActualExpense(month, year, amount);
    
    if (result.success) {
        // Clear input field
        document.getElementById('actual-expense').value = '';
        
        // Show success notification
        showNotification(result.message, 'success');
        
        // Update the table and chart
        updateActualExpensesTable();
        updateChart();
        
        // Update statistics
        updateStatistics();
    } else {
        showNotification(result.message, 'error');
    }
}

// Remove an actual expense
function removeActualExpense(month, year) {
    const result = analyzer.removeActualExpense(month, year);
    
    if (result.success) {
        showNotification(result.message, 'success');
        updateActualExpensesTable();
        updateChart();
        
        // Update statistics
        updateStatistics();
    } else {
        showNotification(result.message, 'error');
    }
}

// ====================================
// Actual Income Management Functions  
// ====================================

// Update the actual incomes table
function updateActualIncomesTable() {
    const table = document.getElementById('actual-incomes-table');
    if (!table) {
        console.error("Could not find actual-incomes-table element");
        return;
    }
    
    const tbody = table.getElementsByTagName('tbody')[0];
    if (!tbody) {
        console.error("Could not find tbody element in actual-incomes-table");
        return;
    }
    
    tbody.innerHTML = '';
    
    // Log current actual incomes
    console.log("Updating actual incomes table with data:", analyzer.actualIncomes);
    
    // If no data
    if (!analyzer.actualIncomes || analyzer.actualIncomes.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 4;
        cell.textContent = 'No actual income data recorded';
        cell.style.textAlign = 'center';
        cell.style.fontStyle = 'italic';
        cell.style.color = '#777';
        return;
    }
    
    // Get month names
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    // Sort by date first
    const sortedIncomes = [...analyzer.actualIncomes].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });
    
    // Add a row for each income
    sortedIncomes.forEach(income => {
        try {
            const row = tbody.insertRow();
            
            // Month - ensure it's in valid range
            const monthIndex = income.month >= 0 && income.month < 12 ? income.month : 0;
            row.insertCell(0).textContent = monthNames[monthIndex];
            
            // Year
            row.insertCell(1).textContent = income.year;
            
            // Amount (formatted)
            const amountCell = row.insertCell(2);
            amountCell.textContent = analyzer.formatCurrency(income.amount);
            amountCell.style.color = 'var(--success-color)';
            
            // Action button
            const actionCell = row.insertCell(3);
            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-button';
            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
            deleteButton.addEventListener('click', () => removeActualIncome(income.month, income.year));
            actionCell.appendChild(deleteButton);
        } catch (err) {
            console.error("Error creating row for income:", err, income);
        }
    });
}

// Add an actual income
function addActualIncome() {
    const month = document.getElementById('income-month-selector').value;
    const year = document.getElementById('income-year-selector').value;
    const amount = document.getElementById('actual-income').value;
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        showNotification("Please enter a valid positive income amount", "warning");
        return;
    }
    
    const result = analyzer.addActualIncome(month, year, amount);
    
    if (result.success) {
        // Clear input field
        document.getElementById('actual-income').value = '';
        
        // Show success notification
        showNotification(result.message, 'success');
        
        // Update the table and chart
        updateActualIncomesTable();
        updateChart();
        
        // Update statistics
        updateStatistics();
    } else {
        showNotification(result.message, 'error');
    }
}

// Remove an actual income
function removeActualIncome(month, year) {
    const result = analyzer.removeActualIncome(month, year);
    
    if (result.success) {
        // Show success notification
        showNotification(result.message, 'success');
        
        // Update the table and statistics
        updateActualIncomesTable();
        updateStatistics();
        updateChart();
    } else {
        showNotification(result.message, 'error');
    }
}

// Save current application state
function saveApplicationState() {
    if (!analyzer.transactions || analyzer.transactions.length === 0) {
        showNotification("No data to save. Please load transaction data first.", "warning");
        return;
    }
    
    const result = analyzer.saveToJSON();
    
    if (result.success) {
        showNotification(result.message, "success");
    } else {
        showNotification(result.message, "error");
    }
}

// Handle loading saved application state
function handleLoadApplicationState(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Show loading status
    const statusElement = document.createElement('div');
    statusElement.className = 'status-message';
    statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading saved state...';
    document.querySelector('.data-import-section').appendChild(statusElement);
    
    // Confirm before overwriting existing data
    let shouldProceed = true;
    if (analyzer.transactions && analyzer.transactions.length > 0) {
        shouldProceed = confirm('Loading a new state will replace your current data. Are you sure you want to continue?');
    }
    
    if (shouldProceed) {
        // Load the file
        analyzer.loadFromJSON(file)
            .then(result => {
                // Remove loading status
                if (statusElement.parentNode) {
                    statusElement.parentNode.removeChild(statusElement);
                }
                
                // Show success notification
                showNotification(result.message, 'success');
                
                // Reset file input
                document.getElementById('load-state-input').value = '';
                
                // Update the UI
                updateUI();
            })
            .catch(error => {
                // Remove loading status
                if (statusElement.parentNode) {
                    statusElement.parentNode.removeChild(statusElement);
                }
                
                // Show error notification
                showNotification(`Error: ${error}`, 'error');
                
                // Reset file input
                document.getElementById('load-state-input').value = '';
            });
    } else {
        // Remove loading status
        if (statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
        }
        
        // Reset file input
        document.getElementById('load-state-input').value = '';
    }
}

// Open help documentation in a new tab
function openHelpDocumentation() {
    window.open('help.html', '_blank');
}

// ====================================
// Quick Action Functions
// ====================================

// Quick add current month data
function quickAddCurrentMonth() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Set expense form values
    const monthSelector = document.getElementById('month-selector');
    const yearSelector = document.getElementById('year-selector');
    
    if (monthSelector) monthSelector.value = currentMonth;
    if (yearSelector) yearSelector.value = currentYear;
    
    // Scroll to expense form
    jumpToExpenses();
    
    // Show helper notification
    showNotification("Set to current month. Enter your actual expense amount and click Add.", "info");
}

// Quick add last 3 months
function quickAddLast3Months() {
    const currentDate = new Date();
    let missingMonths = [];
    
    // Check which of the last 3 months are missing
    for (let i = 1; i <= 3; i++) {
        const checkDate = new Date(currentDate);
        checkDate.setMonth(checkDate.getMonth() - i);
        
        const month = checkDate.getMonth();
        const year = checkDate.getFullYear();
        
        // Check if we already have data for this month
        const hasExpense = analyzer.actualExpenses.some(exp => exp.month === month && exp.year === year);
        const hasIncome = analyzer.actualIncomes.some(inc => inc.month === month && inc.year === year);
        
        if (!hasExpense || !hasIncome) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            missingMonths.push(`${monthNames[month]} ${year}`);
        }
    }
    
    if (missingMonths.length === 0) {
        showNotification("You already have data for the last 3 months!", "success");
        return;
    }
    
    // Scroll to expense form
    jumpToExpenses();
    
    // Show helper message
    showNotification(`Missing data for: ${missingMonths.join(', ')}. Add this data for better projections.`, "info");
}

// Jump to expenses section
function jumpToExpenses() {
    const expensesSection = document.querySelector('.actual-data-import-section');
    if (expensesSection) {
        expensesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Highlight the section briefly
        expensesSection.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.5)';
        setTimeout(() => {
            expensesSection.style.boxShadow = '';
        }, 2000);
    }
}

// Jump to incomes section
function jumpToIncomes() {
    const incomesSection = document.querySelector('.actual-income-import-section');
    if (incomesSection) {
        incomesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Highlight the section briefly
        incomesSection.style.boxShadow = '0 0 20px rgba(52, 152, 219, 0.5)';
        setTimeout(() => {
            incomesSection.style.boxShadow = '';
        }, 2000);
    }
} 