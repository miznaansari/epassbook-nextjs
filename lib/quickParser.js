/**
 * Smart Natural Language Transaction Parser (Zero-latency Client & Server NLP)
 * Extracts amount, title, transaction type, category, date, and description from raw user text.
 * Examples:
 *  - "10rs cocacola" -> { amount: 10, title: "Coca-Cola", type: "SPENDING", ... }
 *  - "₹500 groceries at supermarket" -> { amount: 500, title: "Groceries At Supermarket", ... }
 *  - "lent 1000 to rahul" -> { amount: 1000, title: "Lent to Rahul", type: "LENDING", ... }
 *  - "sip 2500 mutual fund" -> { amount: 2500, title: "SIP Mutual Fund", type: "SAVINGS", ... }
 */

// Helper to format title strings nicely (capitalize words, expand common acronyms)
export function cleanTitle(str) {
  if (!str) return 'Quick Entry';

  // Specific brand / common word beautifications
  const brandMap = {
    'cocacola': 'Coca-Cola',
    'coke': 'Coca-Cola',
    'pepsi': 'Pepsi',
    'swiggy': 'Swiggy',
    'zomato': 'Zomato',
    'blinkit': 'Blinkit',
    'zepto': 'Zepto',
    'instamart': 'Instamart',
    'uber': 'Uber',
    'ola': 'Ola',
    'rapido': 'Rapido',
    'amazon': 'Amazon',
    'flipkart': 'Flipkart',
    'myntra': 'Myntra',
    'netflix': 'Netflix',
    'spotify': 'Spotify',
    'airtel': 'Airtel',
    'jio': 'Jio',
    'starbucks': 'Starbucks',
    'mcdonalds': "McDonald's",
    'mcd': "McDonald's",
    'kfc': 'KFC',
    'dominos': "Domino's",
    'burger king': 'Burger King',
    'sip': 'SIP Investment',
    'chai': 'Chai / Tea',
    'petrol': 'Petrol / Fuel',
    'diesel': 'Diesel / Fuel',
    'cab': 'Cab Ride',
    'auto': 'Auto Ride',
    'groceries': 'Groceries',
    'ration': 'Ration / Groceries',
    'sabji': 'Vegetables',
    'doodh': 'Milk & Dairy',
    'milk': 'Milk & Dairy',
    'gym': 'Gym Membership',
    'doctor': 'Doctor Consultation',
    'medicine': 'Medicines / Pharmacy',
    'pharmacy': 'Pharmacy',
    'recharge': 'Mobile Recharge',
    'wifi': 'WiFi / Internet Bill',
    'electricity': 'Electricity Bill'
  };

  const lower = str.trim().toLowerCase();
  if (brandMap[lower]) {
    return brandMap[lower];
  }

  // General title case capitalization
  return str
    .trim()
    .split(/\s+/)
    .map(word => {
      const wLower = word.toLowerCase();
      if (brandMap[wLower]) return brandMap[wLower];
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Main parser function
 * @param {string} input - Raw text input from user e.g. "10rs cocacola", "lent 500 to rahul"
 * @returns {object} Parsed transaction object
 */
export function parseTransactionPrompt(input) {
  if (!input || typeof input !== 'string') {
    return {
      amount: '',
      title: '',
      description: '',
      type: 'SPENDING',
      useSalaryBalance: true,
      date: new Date().toISOString().split('T')[0],
      isAiPrefilled: true
    };
  }

  const rawText = input.trim();
  let text = rawText.toLowerCase();

  // 1. Date Detection (yesterday, today, 2 days ago, kal, parso)
  let transactionDate = new Date();
  let dateTextRemoved = false;

  if (/\b(yesterday|kal\s+ka|kal|previous day)\b/i.test(text)) {
    transactionDate.setDate(transactionDate.getDate() - 1);
    text = text.replace(/\b(yesterday|kal\s+ka|kal|previous day)\b/i, '');
    dateTextRemoved = true;
  } else if (/\b(parso|day before yesterday|2 days ago)\b/i.test(text)) {
    transactionDate.setDate(transactionDate.getDate() - 2);
    text = text.replace(/\b(parso|day before yesterday|2 days ago)\b/i, '');
    dateTextRemoved = true;
  } else if (/\b(today|aaj)\b/i.test(text)) {
    text = text.replace(/\b(today|aaj)\b/i, '');
  }

  const dateStr = transactionDate.toISOString().split('T')[0];

  // 2. Amount Extraction
  // Patterns matched:
  // "10rs", "10 rs", "10/-", "rs 10", "rs. 10", "inr 10", "₹10", "$10", "10k" (10000), "10.50", "10 bucks"
  let parsedAmount = null;

  // Check for 'k' suffix e.g. 5k -> 5000, 2.5k -> 2500
  const kMatch = text.match(/(?:rs\.?|inr|₹|\$)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    parsedAmount = parseFloat(kMatch[1]) * 1000;
    text = text.replace(kMatch[0], '');
  }

  // Check for standard currency prefix or suffix
  if (!parsedAmount) {
    const currencyMatch = text.match(/(?:(?:rs\.?|inr|₹|\$|usd|eur|gbp)\s*(\d+(?:\.\d+)?))|(?:(\d+(?:\.\d+)?)\s*(?:rs\.?|inr|₹|\$|rupees|rupaye|rupee|bucks|\/-))/i);
    if (currencyMatch) {
      parsedAmount = parseFloat(currencyMatch[1] || currencyMatch[2]);
      text = text.replace(currencyMatch[0], '');
    }
  }

  // Fallback: match any standalone number
  if (!parsedAmount) {
    const numberMatch = text.match(/\b(\d+(?:\.\d+)?)\b/);
    if (numberMatch) {
      parsedAmount = parseFloat(numberMatch[1]);
      text = text.replace(numberMatch[0], '');
    }
  }

  // 3. Transaction Type Extraction
  // Types in system: 'SPENDING' | 'SAVINGS' | 'LENDING' | 'LOAN' | 'ADVANCE'
  let type = 'SPENDING';
  let useSalaryBalance = true;

  if (/\b(lent|lend|udhaar\s+diya|diye|given to|gave to|advance to|loaned to|lending|udhaar)\b/i.test(rawText) && !/\b(udhaar\s+liya|borrowed|borrow)\b/i.test(rawText)) {
    type = 'LENDING';
    useSalaryBalance = false;
  } else if (/\b(borrowed|borrow|loan from|udhaar\s+liya|taken from|took loan|personal loan|emi|loan)\b/i.test(rawText)) {
    type = 'LOAN';
    useSalaryBalance = false;
  } else if (/\b(sip|invest|invested|investment|mutual fund|stocks|shares|crypto|gold|fixed deposit|fd|rd|saved|savings)\b/i.test(rawText)) {
    type = 'SAVINGS';
    useSalaryBalance = false;
  } else if (/\b(received|salary|credited|bonus|freelance|got payment|income|inflow|refund|repaid|repayment)\b/i.test(rawText)) {
    type = 'ADVANCE';
    useSalaryBalance = false;
  } else {
    type = 'SPENDING';
    useSalaryBalance = true;
  }

  // 4. Clean Title and Subject Extraction
  // Strip noise words from remaining text
  let cleanedSubject = text
    .replace(/\b(spent on|spent for|spent|paid for|paid to|paid|bought|purchase|purchased|borrowed from|borrowed|borrow|loan from|loaned to|lent to|lent|lend|given to|gave to|udhaar diya|udhaar liya|udhaar|diya|diye|liya|liye|received from|received|got payment from|got|for|on|at|from|to|ko|se|ka|ki|ke|mein|rs|inr|rupees|rupaye|rupee|bucks|amount|using|via|through|upi|gpay|paytm|phonepe|cash|card)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9\s&'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If text became empty, fallback to intelligent default
  let title = '';
  if (cleanedSubject.length > 0) {
    title = cleanTitle(cleanedSubject);
  } else {
    if (type === 'SAVINGS') title = 'SIP / Investment';
    else if (type === 'LENDING') title = 'Friend';
    else if (type === 'LOAN') title = 'Friend / Bank';
    else if (type === 'ADVANCE') title = 'Inflow / Income';
    else title = 'Quick Expense';
  }

  // Prefix handling for Lending / Loan clarity if mentioned with a person name
  if (type === 'LENDING') {
    if (!/^lent/i.test(title)) {
      title = `Lent to ${title}`;
    }
  } else if (type === 'LOAN') {
    if (!/^loan/i.test(title)) {
      title = `Loan from ${title}`;
    }
  }

  return {
    amount: parsedAmount !== null && !isNaN(parsedAmount) ? parsedAmount.toString() : '',
    title,
    description: `Quick AI Entry: ${rawText}`,
    type,
    useSalaryBalance,
    date: dateStr,
    isAiPrefilled: true
  };
}
