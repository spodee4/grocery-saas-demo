export type DeptRow = {
  dept: string
  sales: number
  purchases: number
  gm_dollars: number
  gm_pct: number
  prior_sales: number
  wow_pct: number
}

export type StoreData = {
  id: string
  name: string
  location: string
  weekly_sales: number
  weekly_gm: number
  weekly_gm_pct: number
  prior_weekly_sales: number
  transactions: number
  avg_basket: number
  departments: DeptRow[]
  recent_invoices: Invoice[]
  allowances: AllowanceSummary
  weekly_trend: WeekPoint[]
  tender: TenderSummary
  bank_deposit: BankDeposit
  shrink: ShrinkRow[]
}

export type Invoice = {
  id: string
  vendor: string
  dept: string
  date: string
  amount: number
  status: "paid" | "pending" | "overdue"
  allowance_earned: number
  allowance_applied: number
  line_items: InvoiceLineItem[]
}

export type InvoiceLineItem = {
  description: string
  upc: string
  pack_size: string
  cases: number
  unit_cost: number
  promo_dollars: number
  extended: number
}

export type AllowanceSummary = {
  total_purchases: number
  allowances_earned: number
  allowances_applied: number
  gap: number
  gap_pct: number
  vendors: VendorAllowance[]
}

export type VendorAllowance = {
  vendor: string
  purchases: number
  earned: number
  applied: number
  gap: number
}

export type WeekPoint = {
  week: string
  sales: number
  gm_pct: number
}

export type TenderSummary = {
  cash: number
  credit: number
  debit: number
  ebt: number
  checks: number
  gift_cards: number
  customer_count: number
  voids: number
  refunds: number
  refund_amount: number
}

export type BankDeposit = {
  date: string
  cash_bills: number
  cash_coins: number
  checks: CheckItem[]
  credit_batch: number
  debit_batch: number
  safe_starting: number
  safe_ending: number
  change_order: number
}

export type CheckItem = {
  check_number: string
  amount: number
  from: string
}

export type ShrinkRow = {
  dept: string
  shrink_dollars: number
  shrink_pct: number
  known: number
  unknown: number
  prior_shrink_pct: number
}

// Lakes dept data — purchases derived from (sales - gm_dollars)
const lakesDepts: DeptRow[] = [
  { dept: "Grocery",      sales: 52400, purchases: 37623, gm_dollars: 14777, gm_pct: 28.2, prior_sales: 54200, wow_pct: -3.3 },
  { dept: "Meat",         sales: 28100, purchases: 18405, gm_dollars: 9695,  gm_pct: 34.5, prior_sales: 26900, wow_pct:  4.5 },
  { dept: "Produce",      sales: 18200, purchases: 11266, gm_dollars: 6934,  gm_pct: 38.1, prior_sales: 17800, wow_pct:  2.2 },
  { dept: "Dairy",        sales: 14300, purchases: 10325, gm_dollars: 3975,  gm_pct: 27.8, prior_sales: 14600, wow_pct: -2.1 },
  { dept: "Beverages",    sales: 11900, purchases:  9115, gm_dollars: 2785,  gm_pct: 23.4, prior_sales: 12400, wow_pct: -4.0 },
  { dept: "Frozen Foods", sales:  9800, purchases:  6742, gm_dollars: 3058,  gm_pct: 31.2, prior_sales:  9200, wow_pct:  6.5 },
  { dept: "Bakery",       sales:  8400, purchases:  4023, gm_dollars: 4377,  gm_pct: 52.1, prior_sales:  7900, wow_pct:  6.3 },
  { dept: "Non-Foods",    sales:  5200, purchases:  3370, gm_dollars: 1830,  gm_pct: 35.2, prior_sales:  5100, wow_pct:  2.0 },
  { dept: "Beer & Wine",  sales:  4800, purchases:  3355, gm_dollars: 1445,  gm_pct: 30.1, prior_sales:  4600, wow_pct:  4.3 },
  { dept: "Service Deli", sales:  2100, purchases:   960, gm_dollars: 1140,  gm_pct: 54.3, prior_sales:  2000, wow_pct:  5.0 },
]

const potlatchDepts: DeptRow[] = [
  { dept: "Grocery",      sales: 30400, purchases: 21918, gm_dollars: 8482,  gm_pct: 27.9, prior_sales: 29800, wow_pct:  2.0 },
  { dept: "Meat",         sales: 16200, purchases: 10724, gm_dollars: 5476,  gm_pct: 33.8, prior_sales: 16800, wow_pct: -3.6 },
  { dept: "Produce",      sales: 10500, purchases:  6573, gm_dollars: 3927,  gm_pct: 37.4, prior_sales: 10100, wow_pct:  4.0 },
  { dept: "Dairy",        sales:  8300, purchases:  6067, gm_dollars: 2233,  gm_pct: 26.9, prior_sales:  8500, wow_pct: -2.4 },
  { dept: "Beverages",    sales:  6900, purchases:  5327, gm_dollars: 1573,  gm_pct: 22.8, prior_sales:  7200, wow_pct: -4.2 },
  { dept: "Frozen Foods", sales:  5700, purchases:  3944, gm_dollars: 1756,  gm_pct: 30.8, prior_sales:  5400, wow_pct:  5.6 },
  { dept: "Bakery",       sales:  4900, purchases:  2381, gm_dollars: 2519,  gm_pct: 51.4, prior_sales:  4600, wow_pct:  6.5 },
  { dept: "Non-Foods",    sales:  3100, purchases:  2027, gm_dollars: 1073,  gm_pct: 34.6, prior_sales:  3000, wow_pct:  3.3 },
  { dept: "Beer & Wine",  sales:  2800, purchases:  1977, gm_dollars:  823,  gm_pct: 29.4, prior_sales:  2700, wow_pct:  3.7 },
  { dept: "Service Deli", sales:  1200, purchases:   563, gm_dollars:  637,  gm_pct: 53.1, prior_sales:  1100, wow_pct:  9.1 },
]

function totalSales(depts: DeptRow[]) { return depts.reduce((s, d) => s + d.sales, 0) }
function totalGM(depts: DeptRow[]) { return depts.reduce((s, d) => s + d.gm_dollars, 0) }
function totalPurchases(depts: DeptRow[]) { return depts.reduce((s, d) => s + d.purchases, 0) }

const lakesWeeklyTrend: WeekPoint[] = [
  { week: "Feb 10", sales: 148200, gm_pct: 31.2 },
  { week: "Feb 17", sales: 151400, gm_pct: 30.8 },
  { week: "Feb 24", sales: 149800, gm_pct: 31.5 },
  { week: "Mar 3",  sales: 153100, gm_pct: 31.9 },
  { week: "Mar 10", sales: 156700, gm_pct: 32.1 },
  { week: "Mar 17", sales: 155016, gm_pct: 31.8 },
]

const potlatchWeeklyTrend: WeekPoint[] = [
  { week: "Feb 10", sales: 87100,  gm_pct: 30.4 },
  { week: "Feb 17", sales: 88400,  gm_pct: 30.8 },
  { week: "Feb 24", sales: 87900,  gm_pct: 31.1 },
  { week: "Mar 3",  sales: 89200,  gm_pct: 31.5 },
  { week: "Mar 10", sales: 91400,  gm_pct: 31.2 },
  { week: "Mar 17", sales: 90100,  gm_pct: 30.9 },
]

const lakesInvoices: Invoice[] = [
  {
    id: "URM-241893", vendor: "URM Distributing", dept: "Grocery", date: "Mar 14, 2026",
    amount: 89400, status: "paid", allowance_earned: 3240, allowance_applied: 890,
    line_items: [
      { description: "Heinz Ketchup 32oz", upc: "01300000391", pack_size: "12/32oz", cases: 8, unit_cost: 18.24, promo_dollars: 1.50, extended: 145.92 },
      { description: "Campbell's Tomato Soup", upc: "05100000386", pack_size: "24/10.75oz", cases: 12, unit_cost: 14.40, promo_dollars: 0.75, extended: 172.80 },
      { description: "Cheerios 18oz", upc: "01600001717", pack_size: "8/18oz", cases: 16, unit_cost: 34.56, promo_dollars: 2.00, extended: 552.96 },
      { description: "Ritz Crackers 13.7oz", upc: "04400001444", pack_size: "12/13.7oz", cases: 10, unit_cost: 22.08, promo_dollars: 1.00, extended: 220.80 },
      { description: "Skippy PB Creamy 40oz", upc: "03720000040", pack_size: "6/40oz", cases: 14, unit_cost: 28.50, promo_dollars: 0.00, extended: 399.00 },
      { description: "Hunt's Pasta Sauce 24oz", upc: "02700000205", pack_size: "12/24oz", cases: 9, unit_cost: 15.84, promo_dollars: 0.50, extended: 142.56 },
    ],
  },
  {
    id: "UNFI-88412", vendor: "UNFI Natural", dept: "Grocery", date: "Mar 12, 2026",
    amount: 12300, status: "paid", allowance_earned: 820, allowance_applied: 820,
    line_items: [
      { description: "Annie's Mac & Cheese", upc: "01251300038", pack_size: "12/6oz", cases: 6, unit_cost: 19.44, promo_dollars: 1.20, extended: 116.64 },
      { description: "Clif Bar Variety", upc: "07228700118", pack_size: "12/2.4oz", cases: 10, unit_cost: 24.00, promo_dollars: 2.00, extended: 240.00 },
      { description: "Organic Valley Whole Milk", upc: "09308000260", pack_size: "6/half-gal", cases: 8, unit_cost: 26.40, promo_dollars: 0.00, extended: 211.20 },
    ],
  },
  {
    id: "PEI-30218", vendor: "Peirone Produce", dept: "Produce", date: "Mar 11, 2026",
    amount: 8100, status: "paid", allowance_earned: 0, allowance_applied: 0,
    line_items: [
      { description: "Russet Potatoes 50lb", upc: "0000000PT50", pack_size: "50lb bag", cases: 20, unit_cost: 18.50, promo_dollars: 0, extended: 370.00 },
      { description: "Navel Oranges 40lb", upc: "0000000OR40", pack_size: "40lb carton", cases: 15, unit_cost: 22.00, promo_dollars: 0, extended: 330.00 },
      { description: "Bananas 40lb", upc: "0000000BN40", pack_size: "40lb box", cases: 30, unit_cost: 12.80, promo_dollars: 0, extended: 384.00 },
      { description: "Roma Tomatoes", upc: "0000000TM25", pack_size: "25lb case", cases: 12, unit_cost: 16.40, promo_dollars: 0, extended: 196.80 },
    ],
  },
  {
    id: "CCB-19004", vendor: "Coca-Cola Bottling", dept: "Beverages", date: "Mar 10, 2026",
    amount: 4200, status: "paid", allowance_earned: 210, allowance_applied: 210,
    line_items: [
      { description: "Coca-Cola Classic 12pk", upc: "04900006831", pack_size: "2/12pk", cases: 48, unit_cost: 15.99, promo_dollars: 2.00, extended: 767.52 },
      { description: "Diet Coke 12pk", upc: "04900000168", pack_size: "2/12pk", cases: 24, unit_cost: 15.99, promo_dollars: 2.00, extended: 383.76 },
      { description: "Sprite 2L", upc: "04900006571", pack_size: "8/2L", cases: 16, unit_cost: 13.44, promo_dollars: 1.00, extended: 214.80 },
      { description: "Dasani Water 24pk", upc: "04900002891", pack_size: "24/16.9oz", cases: 32, unit_cost: 9.60, promo_dollars: 0.50, extended: 307.20 },
    ],
  },
  {
    id: "FRI-77231", vendor: "Frito-Lay DSD", dept: "Grocery", date: "Mar 10, 2026",
    amount: 3800, status: "pending", allowance_earned: 190, allowance_applied: 0,
    line_items: [
      { description: "Lay's Classic 10oz", upc: "02840030520", pack_size: "8/10oz", cases: 20, unit_cost: 18.48, promo_dollars: 1.50, extended: 369.60 },
      { description: "Doritos Nacho 11oz", upc: "02840034900", pack_size: "8/11oz", cases: 18, unit_cost: 19.20, promo_dollars: 1.50, extended: 345.60 },
      { description: "Cheetos Crunchy 8.5oz", upc: "02840031040", pack_size: "8/8.5oz", cases: 12, unit_cost: 17.28, promo_dollars: 1.00, extended: 207.36 },
    ],
  },
  {
    id: "BIM-44102", vendor: "Bimbo Bakeries", dept: "Bakery", date: "Mar 13, 2026",
    amount: 2840, status: "paid", allowance_earned: 142, allowance_applied: 142,
    line_items: [
      { description: "Sara Lee White Bread 20oz", upc: "07270000006", pack_size: "8/20oz", cases: 16, unit_cost: 14.40, promo_dollars: 1.00, extended: 230.40 },
      { description: "Thomas English Muffins", upc: "07270001214", pack_size: "12/6ct", cases: 12, unit_cost: 18.72, promo_dollars: 1.50, extended: 224.64 },
      { description: "Ball Park Hot Dog Buns", upc: "07270001822", pack_size: "12/8ct", cases: 10, unit_cost: 12.96, promo_dollars: 0.75, extended: 129.60 },
    ],
  },
  // ─── Week of Mar 3 ────────────────────────────────────────────────────────
  {
    id: "URM-241744", vendor: "URM Distributing", dept: "Grocery", date: "Mar 7, 2026",
    amount: 87200, status: "paid", allowance_earned: 3100, allowance_applied: 3100,
    line_items: [
      { description: "Heinz Ketchup 32oz", upc: "01300000391", pack_size: "12/32oz", cases: 7, unit_cost: 18.24, promo_dollars: 0, extended: 127.68 },
      { description: "Campbell's Tomato Soup", upc: "05100000386", pack_size: "24/10.75oz", cases: 10, unit_cost: 14.40, promo_dollars: 0, extended: 144.00 },
      { description: "Cheerios 18oz", upc: "01600001717", pack_size: "8/18oz", cases: 14, unit_cost: 34.56, promo_dollars: 0, extended: 483.84 },
      { description: "Skippy PB Creamy 40oz", upc: "03720000040", pack_size: "6/40oz", cases: 12, unit_cost: 28.50, promo_dollars: 0, extended: 342.00 },
    ],
  },
  {
    id: "PEI-30198", vendor: "Peirone Produce", dept: "Produce", date: "Mar 4, 2026",
    amount: 7800, status: "paid", allowance_earned: 0, allowance_applied: 0,
    line_items: [
      { description: "Russet Potatoes 50lb", upc: "0000000PT50", pack_size: "50lb bag", cases: 18, unit_cost: 18.50, promo_dollars: 0, extended: 333.00 },
      { description: "Bananas 40lb", upc: "0000000BN40", pack_size: "40lb box", cases: 28, unit_cost: 12.80, promo_dollars: 0, extended: 358.40 },
      { description: "Navel Oranges 40lb", upc: "0000000OR40", pack_size: "40lb carton", cases: 12, unit_cost: 22.00, promo_dollars: 0, extended: 264.00 },
    ],
  },
  {
    id: "CCB-18891", vendor: "Coca-Cola Bottling", dept: "Beverages", date: "Mar 3, 2026",
    amount: 4100, status: "paid", allowance_earned: 205, allowance_applied: 205,
    line_items: [
      { description: "Coca-Cola Classic 12pk", upc: "04900006831", pack_size: "2/12pk", cases: 44, unit_cost: 15.99, promo_dollars: 0, extended: 703.56 },
      { description: "Diet Coke 12pk", upc: "04900000168", pack_size: "2/12pk", cases: 20, unit_cost: 15.99, promo_dollars: 0, extended: 319.80 },
      { description: "Sprite 2L", upc: "04900006571", pack_size: "8/2L", cases: 14, unit_cost: 13.44, promo_dollars: 0, extended: 188.16 },
    ],
  },
  // ─── Week of Feb 24 ───────────────────────────────────────────────────────
  {
    id: "URM-241601", vendor: "URM Distributing", dept: "Grocery", date: "Feb 28, 2026",
    amount: 91000, status: "paid", allowance_earned: 3380, allowance_applied: 3380,
    line_items: [
      { description: "Ritz Crackers 13.7oz", upc: "04400001444", pack_size: "12/13.7oz", cases: 12, unit_cost: 22.08, promo_dollars: 0, extended: 264.96 },
      { description: "Hunt's Pasta Sauce 24oz", upc: "02700000205", pack_size: "12/24oz", cases: 11, unit_cost: 15.84, promo_dollars: 0, extended: 174.24 },
      { description: "Skippy PB Creamy 40oz", upc: "03720000040", pack_size: "6/40oz", cases: 10, unit_cost: 28.50, promo_dollars: 0, extended: 285.00 },
    ],
  },
  {
    id: "SYS-10044", vendor: "Sysco Food Service", dept: "Meat", date: "Feb 25, 2026",
    amount: 14600, status: "overdue", allowance_earned: 0, allowance_applied: 0,
    line_items: [
      { description: "Ground Beef 80/20 10lb", upc: "0000000GB10", pack_size: "10lb chubs", cases: 40, unit_cost: 28.50, promo_dollars: 0, extended: 1140.00 },
      { description: "Pork Loin Boneless", upc: "0000000PL12", pack_size: "avg 12lb", cases: 20, unit_cost: 38.40, promo_dollars: 0, extended: 768.00 },
    ],
  },
]

const potlatchInvoices: Invoice[] = [
  {
    id: "URM-241912", vendor: "URM Distributing", dept: "Grocery", date: "Mar 14, 2026",
    amount: 52400, status: "paid", allowance_earned: 1890, allowance_applied: 420,
    line_items: [
      { description: "Heinz Ketchup 32oz", upc: "01300000391", pack_size: "12/32oz", cases: 4, unit_cost: 18.24, promo_dollars: 1.50, extended: 72.96 },
      { description: "Cheerios 18oz", upc: "01600001717", pack_size: "8/18oz", cases: 8, unit_cost: 34.56, promo_dollars: 2.00, extended: 276.48 },
      { description: "Skippy PB Creamy 40oz", upc: "03720000040", pack_size: "6/40oz", cases: 6, unit_cost: 28.50, promo_dollars: 0.00, extended: 171.00 },
    ],
  },
  {
    id: "UNFI-88431", vendor: "UNFI Natural", dept: "Grocery", date: "Mar 12, 2026",
    amount: 7100, status: "paid", allowance_earned: 480, allowance_applied: 480,
    line_items: [
      { description: "Annie's Mac & Cheese", upc: "01251300038", pack_size: "12/6oz", cases: 4, unit_cost: 19.44, promo_dollars: 1.20, extended: 77.76 },
      { description: "Clif Bar Variety", upc: "07228700118", pack_size: "12/2.4oz", cases: 6, unit_cost: 24.00, promo_dollars: 2.00, extended: 144.00 },
    ],
  },
  {
    id: "PEI-30224", vendor: "Peirone Produce", dept: "Produce", date: "Mar 11, 2026",
    amount: 4800, status: "pending", allowance_earned: 0, allowance_applied: 0,
    line_items: [
      { description: "Russet Potatoes 50lb", upc: "0000000PT50", pack_size: "50lb bag", cases: 12, unit_cost: 18.50, promo_dollars: 0, extended: 222.00 },
      { description: "Bananas 40lb", upc: "0000000BN40", pack_size: "40lb box", cases: 18, unit_cost: 12.80, promo_dollars: 0, extended: 230.40 },
    ],
  },
  {
    id: "CCB-19021", vendor: "Coca-Cola Bottling", dept: "Beverages", date: "Mar 10, 2026",
    amount: 2600, status: "paid", allowance_earned: 130, allowance_applied: 130,
    line_items: [
      { description: "Coca-Cola Classic 12pk", upc: "04900006831", pack_size: "2/12pk", cases: 28, unit_cost: 15.99, promo_dollars: 2.00, extended: 447.72 },
      { description: "Dasani Water 24pk", upc: "04900002891", pack_size: "24/16.9oz", cases: 20, unit_cost: 9.60, promo_dollars: 0.50, extended: 192.00 },
    ],
  },
  // ─── Week of Mar 3 ────────────────────────────────────────────────────────
  {
    id: "URM-241756", vendor: "URM Distributing", dept: "Grocery", date: "Mar 7, 2026",
    amount: 50900, status: "paid", allowance_earned: 1820, allowance_applied: 1820,
    line_items: [
      { description: "Cheerios 18oz", upc: "01600001717", pack_size: "8/18oz", cases: 6, unit_cost: 34.56, promo_dollars: 0, extended: 207.36 },
      { description: "Skippy PB Creamy 40oz", upc: "03720000040", pack_size: "6/40oz", cases: 5, unit_cost: 28.50, promo_dollars: 0, extended: 142.50 },
    ],
  },
  {
    id: "PEI-30205", vendor: "Peirone Produce", dept: "Produce", date: "Mar 4, 2026",
    amount: 4500, status: "paid", allowance_earned: 0, allowance_applied: 0,
    line_items: [
      { description: "Russet Potatoes 50lb", upc: "0000000PT50", pack_size: "50lb bag", cases: 10, unit_cost: 18.50, promo_dollars: 0, extended: 185.00 },
      { description: "Bananas 40lb", upc: "0000000BN40", pack_size: "40lb box", cases: 15, unit_cost: 12.80, promo_dollars: 0, extended: 192.00 },
    ],
  },
  // ─── Week of Feb 24 ───────────────────────────────────────────────────────
  {
    id: "URM-241522", vendor: "URM Distributing", dept: "Grocery", date: "Feb 28, 2026",
    amount: 49200, status: "paid", allowance_earned: 1740, allowance_applied: 1740,
    line_items: [
      { description: "Heinz Ketchup 32oz", upc: "01300000391", pack_size: "12/32oz", cases: 3, unit_cost: 18.24, promo_dollars: 0, extended: 54.72 },
      { description: "Ritz Crackers 13.7oz", upc: "04400001444", pack_size: "12/13.7oz", cases: 8, unit_cost: 22.08, promo_dollars: 0, extended: 176.64 },
    ],
  },
  {
    id: "CCB-18776", vendor: "Coca-Cola Bottling", dept: "Beverages", date: "Feb 24, 2026",
    amount: 2400, status: "paid", allowance_earned: 120, allowance_applied: 120,
    line_items: [
      { description: "Coca-Cola Classic 12pk", upc: "04900006831", pack_size: "2/12pk", cases: 24, unit_cost: 15.99, promo_dollars: 0, extended: 383.76 },
      { description: "Sprite 2L", upc: "04900006571", pack_size: "8/2L", cases: 12, unit_cost: 13.44, promo_dollars: 0, extended: 161.28 },
    ],
  },
]

const lakesTender: TenderSummary = {
  cash: 24840,
  credit: 58420,
  debit: 41180,
  ebt: 18260,
  checks: 3840,
  gift_cards: 8476,
  customer_count: 3842,
  voids: 23,
  refunds: 41,
  refund_amount: 2182,
}

const potlatchTender: TenderSummary = {
  cash: 15200,
  credit: 33800,
  debit: 24600,
  ebt: 10300,
  checks: 2100,
  gift_cards: 4100,
  customer_count: 2218,
  voids: 14,
  refunds: 22,
  refund_amount: 1180,
}

const lakesBankDeposit: BankDeposit = {
  date: "Mar 16, 2026",
  cash_bills: 21450,
  cash_coins: 3390,
  checks: [
    { check_number: "4821", amount: 842.50, from: "Johnson Catering" },
    { check_number: "1190", amount: 1240.00, from: "Medical Lake USD" },
    { check_number: "8834", amount: 620.00, from: "Deer Park Lodge" },
  ],
  credit_batch: 58420,
  debit_batch: 41180,
  safe_starting: 6500,
  safe_ending: 5000,
  change_order: 2000,
}

const potlatchBankDeposit: BankDeposit = {
  date: "Mar 16, 2026",
  cash_bills: 13200,
  cash_coins: 2000,
  checks: [
    { check_number: "2210", amount: 520.00, from: "Potlatch School Dist." },
    { check_number: "5501", amount: 380.00, from: "Clearwater Logging Co." },
  ],
  credit_batch: 33800,
  debit_batch: 24600,
  safe_starting: 5000,
  safe_ending: 4000,
  change_order: 1500,
}

const lakesShrink: ShrinkRow[] = [
  { dept: "Meat",         shrink_dollars: 842,  shrink_pct: 3.0, known: 310, unknown: 532, prior_shrink_pct: 2.7 },
  { dept: "Produce",      shrink_dollars: 728,  shrink_pct: 4.0, known: 520, unknown: 208, prior_shrink_pct: 3.8 },
  { dept: "Bakery",       shrink_dollars: 420,  shrink_pct: 5.0, known: 380, unknown:  40, prior_shrink_pct: 4.6 },
  { dept: "Service Deli", shrink_dollars: 189,  shrink_pct: 9.0, known: 150, unknown:  39, prior_shrink_pct: 8.2 },
  { dept: "Dairy",        shrink_dollars: 286,  shrink_pct: 2.0, known:  80, unknown: 206, prior_shrink_pct: 1.8 },
  { dept: "Grocery",      shrink_dollars: 420,  shrink_pct: 0.8, known: 190, unknown: 230, prior_shrink_pct: 0.7 },
  { dept: "Frozen Foods", shrink_dollars: 176,  shrink_pct: 1.8, known:  60, unknown: 116, prior_shrink_pct: 1.6 },
  { dept: "Beverages",    shrink_dollars: 238,  shrink_pct: 2.0, known: 100, unknown: 138, prior_shrink_pct: 1.9 },
]

const potlatchShrink: ShrinkRow[] = [
  { dept: "Meat",         shrink_dollars: 486,  shrink_pct: 3.0, known: 180, unknown: 306, prior_shrink_pct: 2.8 },
  { dept: "Produce",      shrink_dollars: 420,  shrink_pct: 4.0, known: 300, unknown: 120, prior_shrink_pct: 3.7 },
  { dept: "Bakery",       shrink_dollars: 245,  shrink_pct: 5.0, known: 210, unknown:  35, prior_shrink_pct: 4.5 },
  { dept: "Service Deli", shrink_dollars: 108,  shrink_pct: 9.0, known:  85, unknown:  23, prior_shrink_pct: 8.5 },
  { dept: "Dairy",        shrink_dollars: 166,  shrink_pct: 2.0, known:  50, unknown: 116, prior_shrink_pct: 1.9 },
  { dept: "Grocery",      shrink_dollars: 243,  shrink_pct: 0.8, known: 100, unknown: 143, prior_shrink_pct: 0.7 },
]

export const STORES: Record<string, StoreData> = {
  lakes: {
    id: "lakes",
    name: "Lakes",
    location: "Medical Lake, WA",
    weekly_sales: totalSales(lakesDepts),
    weekly_gm: totalGM(lakesDepts),
    weekly_gm_pct: Math.round((totalGM(lakesDepts) / totalSales(lakesDepts)) * 1000) / 10,
    prior_weekly_sales: 156700,
    transactions: 3842,
    avg_basket: totalSales(lakesDepts) / 3842,
    departments: lakesDepts,
    weekly_trend: lakesWeeklyTrend,
    recent_invoices: lakesInvoices,
    tender: lakesTender,
    bank_deposit: lakesBankDeposit,
    shrink: lakesShrink,
    allowances: {
      total_purchases: totalPurchases(lakesDepts),
      allowances_earned: 4460,
      allowances_applied: 1920,
      gap: 2540,
      gap_pct: 3.8,
      vendors: [
        { vendor: "URM Distributing", purchases: 89400, earned: 3240, applied: 890, gap: 2350 },
        { vendor: "UNFI Natural",      purchases: 12300, earned:  820, applied: 820, gap:    0 },
        { vendor: "Frito-Lay DSD",     purchases:  3800, earned:  190, applied:   0, gap:  190 },
        { vendor: "Coca-Cola Bottling",purchases:  4200, earned:  210, applied: 210, gap:    0 },
      ],
    },
  },
  potlatch: {
    id: "potlatch",
    name: "Potlatch",
    location: "Potlatch, ID",
    weekly_sales: totalSales(potlatchDepts),
    weekly_gm: totalGM(potlatchDepts),
    weekly_gm_pct: Math.round((totalGM(potlatchDepts) / totalSales(potlatchDepts)) * 1000) / 10,
    prior_weekly_sales: 91400,
    transactions: 2218,
    avg_basket: totalSales(potlatchDepts) / 2218,
    departments: potlatchDepts,
    weekly_trend: potlatchWeeklyTrend,
    recent_invoices: potlatchInvoices,
    tender: potlatchTender,
    bank_deposit: potlatchBankDeposit,
    shrink: potlatchShrink,
    allowances: {
      total_purchases: totalPurchases(potlatchDepts),
      allowances_earned: 2500,
      allowances_applied: 1030,
      gap: 1470,
      gap_pct: 2.2,
      vendors: [
        { vendor: "URM Distributing", purchases: 52400, earned: 1890, applied: 420, gap: 1470 },
        { vendor: "UNFI Natural",      purchases:  7100, earned:  480, applied: 480, gap:    0 },
        { vendor: "Coca-Cola Bottling",purchases:  2600, earned:  130, applied: 130, gap:    0 },
      ],
    },
  },
}

export const STORE_LIST = Object.values(STORES)

// ─── Product Catalog ──────────────────────────────────────────────────────────

export type ProductCatalogItem = {
  upc: string
  description: string
  dept: string
  vendor: string
  pack_size: string       // e.g. "12/32oz"
  units_per_case: number
  case_cost: number       // what store pays per case
  unit_cost: number       // case_cost / units_per_case
  unit_retail: number     // what customer pays
  gm_pct: number
  in_promo: boolean
  promo_desc?: string
  promo_retail?: number
  promo_start?: string
  promo_end?: string
}

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  // Grocery — URM
  {
    upc: "01300000391", description: "Heinz Ketchup 32oz", dept: "Grocery", vendor: "URM Distributing",
    pack_size: "12/32oz", units_per_case: 12, case_cost: 18.24, unit_cost: 1.52, unit_retail: 3.49,
    gm_pct: 56.4, in_promo: false,
  },
  {
    upc: "05100000386", description: "Campbell's Tomato Soup 10.75oz", dept: "Grocery", vendor: "URM Distributing",
    pack_size: "24/10.75oz", units_per_case: 24, case_cost: 14.40, unit_cost: 0.60, unit_retail: 1.29,
    gm_pct: 53.5, in_promo: true, promo_desc: "4/$5 Mix & Match", promo_retail: 1.25, promo_start: "Mar 11", promo_end: "Mar 17",
  },
  {
    upc: "01600001717", description: "Cheerios 18oz", dept: "Grocery", vendor: "URM Distributing",
    pack_size: "8/18oz", units_per_case: 8, case_cost: 34.56, unit_cost: 4.32, unit_retail: 5.99,
    gm_pct: 27.9, in_promo: true, promo_desc: "Buy 2 Get 1 Free", promo_retail: 5.99, promo_start: "Mar 10", promo_end: "Mar 16",
  },
  {
    upc: "04400001444", description: "Ritz Crackers 13.7oz", dept: "Grocery", vendor: "URM Distributing",
    pack_size: "12/13.7oz", units_per_case: 12, case_cost: 22.08, unit_cost: 1.84, unit_retail: 3.99,
    gm_pct: 53.9, in_promo: false,
  },
  {
    upc: "03720000040", description: "Skippy Peanut Butter Creamy 40oz", dept: "Grocery", vendor: "URM Distributing",
    pack_size: "6/40oz", units_per_case: 6, case_cost: 28.50, unit_cost: 4.75, unit_retail: 7.49,
    gm_pct: 36.6, in_promo: false,
  },
  {
    upc: "02700000205", description: "Hunt's Pasta Sauce 24oz", dept: "Grocery", vendor: "URM Distributing",
    pack_size: "12/24oz", units_per_case: 12, case_cost: 15.84, unit_cost: 1.32, unit_retail: 2.49,
    gm_pct: 47.0, in_promo: false,
  },
  // Grocery — UNFI
  {
    upc: "01251300038", description: "Annie's Mac & Cheese 6oz", dept: "Grocery", vendor: "UNFI Natural",
    pack_size: "12/6oz", units_per_case: 12, case_cost: 19.44, unit_cost: 1.62, unit_retail: 2.99,
    gm_pct: 45.8, in_promo: false,
  },
  {
    upc: "07228700118", description: "Clif Bar Variety Pack 2.4oz", dept: "Grocery", vendor: "UNFI Natural",
    pack_size: "12/2.4oz", units_per_case: 12, case_cost: 24.00, unit_cost: 2.00, unit_retail: 2.99,
    gm_pct: 33.1, in_promo: false,
  },
  // Beverages — Coca-Cola
  {
    upc: "04900006831", description: "Coca-Cola Classic 12pk Cans", dept: "Beverages", vendor: "Coca-Cola Bottling",
    pack_size: "2/12pk", units_per_case: 2, case_cost: 15.99, unit_cost: 8.00, unit_retail: 10.99,
    gm_pct: 27.2, in_promo: true, promo_desc: "2/$18 Mix & Match", promo_retail: 9.00, promo_start: "Mar 11", promo_end: "Mar 17",
  },
  {
    upc: "04900000168", description: "Diet Coke 12pk Cans", dept: "Beverages", vendor: "Coca-Cola Bottling",
    pack_size: "2/12pk", units_per_case: 2, case_cost: 15.99, unit_cost: 8.00, unit_retail: 10.99,
    gm_pct: 27.2, in_promo: true, promo_desc: "2/$18 Mix & Match", promo_retail: 9.00, promo_start: "Mar 11", promo_end: "Mar 17",
  },
  {
    upc: "04900006571", description: "Sprite 2 Liter", dept: "Beverages", vendor: "Coca-Cola Bottling",
    pack_size: "8/2L", units_per_case: 8, case_cost: 13.44, unit_cost: 1.68, unit_retail: 2.29,
    gm_pct: 26.6, in_promo: false,
  },
  {
    upc: "04900002891", description: "Dasani Water 24pk 16.9oz", dept: "Beverages", vendor: "Coca-Cola Bottling",
    pack_size: "24/16.9oz", units_per_case: 1, case_cost: 9.60, unit_cost: 9.60, unit_retail: 5.99,
    gm_pct: 0, in_promo: true, promo_desc: "$4.99 Sale", promo_retail: 4.99, promo_start: "Mar 10", promo_end: "Mar 16",
  },
  // Bakery — Bimbo
  {
    upc: "07270000006", description: "Sara Lee White Bread 20oz", dept: "Bakery", vendor: "Bimbo Bakeries",
    pack_size: "8/20oz", units_per_case: 8, case_cost: 14.40, unit_cost: 1.80, unit_retail: 3.49,
    gm_pct: 48.4, in_promo: false,
  },
  {
    upc: "07270001214", description: "Thomas' English Muffins 6ct", dept: "Bakery", vendor: "Bimbo Bakeries",
    pack_size: "12/6ct", units_per_case: 12, case_cost: 18.72, unit_cost: 1.56, unit_retail: 3.29,
    gm_pct: 52.6, in_promo: true, promo_desc: "2/$6 Featured", promo_retail: 3.00, promo_start: "Mar 11", promo_end: "Mar 17",
  },
  // Snacks — Frito-Lay
  {
    upc: "02840030520", description: "Lay's Classic Potato Chips 10oz", dept: "Grocery", vendor: "Frito-Lay DSD",
    pack_size: "8/10oz", units_per_case: 8, case_cost: 18.48, unit_cost: 2.31, unit_retail: 4.99,
    gm_pct: 53.7, in_promo: true, promo_desc: "$3.99 Ad Price", promo_retail: 3.99, promo_start: "Mar 11", promo_end: "Mar 17",
  },
  {
    upc: "02840034900", description: "Doritos Nacho Cheese 11oz", dept: "Grocery", vendor: "Frito-Lay DSD",
    pack_size: "8/11oz", units_per_case: 8, case_cost: 19.20, unit_cost: 2.40, unit_retail: 4.99,
    gm_pct: 51.9, in_promo: false,
  },
  // Produce
  {
    upc: "0000000BN40", description: "Bananas (each)", dept: "Produce", vendor: "Peirone Produce",
    pack_size: "40lb box", units_per_case: 120, case_cost: 12.80, unit_cost: 0.107, unit_retail: 0.29,
    gm_pct: 63.1, in_promo: false,
  },
  {
    upc: "0000000TM25", description: "Roma Tomatoes (per lb)", dept: "Produce", vendor: "Peirone Produce",
    pack_size: "25lb case", units_per_case: 25, case_cost: 16.40, unit_cost: 0.656, unit_retail: 1.49,
    gm_pct: 56.0, in_promo: false,
  },
]

export function lookupProduct(query: string): ProductCatalogItem | null {
  const q = query.toLowerCase().trim()
  const byUpc = PRODUCT_CATALOG.find(p => p.upc === q)
  if (byUpc) return byUpc
  const byName = PRODUCT_CATALOG.find(p => {
    const dLower = p.description.toLowerCase()
    return dLower.includes(q) || q.includes(dLower.split(" ").slice(0, 2).join(" "))
  })
  return byName ?? null
}

// ─── Vendor Order Guides ──────────────────────────────────────────────────────

export type OrderGuideItem = {
  item_no: string
  upc: string
  brand: string
  description: string
  pack_size: string
  units_per_case: number
  case_cost: number
  unit_cost: number
  suggested_retail: number
  dept: string
  promo?: string
  vendor: "URM" | "UNFI"
}

export const URM_CATALOG: OrderGuideItem[] = [
  // Grocery / Center Store
  { item_no: "URM-10042", upc: "01300000391", brand: "Heinz",        description: "Heinz Ketchup 32oz",                 pack_size: "12/32oz",      units_per_case: 12, case_cost: 18.24, unit_cost: 1.52, suggested_retail: 3.49, dept: "Grocery",   vendor: "URM" },
  { item_no: "URM-10089", upc: "05100000386", brand: "Campbell's",   description: "Campbell's Tomato Soup 10.75oz",     pack_size: "24/10.75oz",   units_per_case: 24, case_cost: 14.40, unit_cost: 0.60, suggested_retail: 1.29, dept: "Grocery",   vendor: "URM", promo: "4/$5 thru Mar 17" },
  { item_no: "URM-10112", upc: "01600001717", brand: "General Mills", description: "Cheerios Whole Grain Oat 18oz",     pack_size: "8/18oz",       units_per_case:  8, case_cost: 34.56, unit_cost: 4.32, suggested_retail: 5.99, dept: "Grocery",   vendor: "URM", promo: "B2G1 thru Mar 16" },
  { item_no: "URM-10204", upc: "04400001444", brand: "Nabisco",      description: "Ritz Original Crackers 13.7oz",      pack_size: "12/13.7oz",    units_per_case: 12, case_cost: 22.08, unit_cost: 1.84, suggested_retail: 3.99, dept: "Grocery",   vendor: "URM" },
  { item_no: "URM-10310", upc: "03720000040", brand: "Skippy",       description: "Skippy Peanut Butter Creamy 40oz",  pack_size: "6/40oz",       units_per_case:  6, case_cost: 28.50, unit_cost: 4.75, suggested_retail: 7.49, dept: "Grocery",   vendor: "URM" },
  { item_no: "URM-10318", upc: "02700000205", brand: "Hunt's",       description: "Hunt's Pasta Sauce Tomato 24oz",    pack_size: "12/24oz",      units_per_case: 12, case_cost: 15.84, unit_cost: 1.32, suggested_retail: 2.49, dept: "Grocery",   vendor: "URM" },
  { item_no: "URM-10422", upc: "02840030520", brand: "Frito-Lay",    description: "Lay's Classic Potato Chips 10oz",   pack_size: "8/10oz",       units_per_case:  8, case_cost: 18.48, unit_cost: 2.31, suggested_retail: 4.99, dept: "Grocery",   vendor: "URM", promo: "$3.99 Ad thru Mar 17" },
  { item_no: "URM-10431", upc: "02840034900", brand: "Frito-Lay",    description: "Doritos Nacho Cheese 11oz",         pack_size: "8/11oz",       units_per_case:  8, case_cost: 19.20, unit_cost: 2.40, suggested_retail: 4.99, dept: "Grocery",   vendor: "URM" },
  { item_no: "URM-10502", upc: "04000000402", brand: "Oreo",         description: "Oreo Double Stuf Cookies 15.35oz",  pack_size: "12/15.35oz",   units_per_case: 12, case_cost: 26.40, unit_cost: 2.20, suggested_retail: 4.49, dept: "Grocery",   vendor: "URM" },
  { item_no: "URM-10598", upc: "01800011081", brand: "Progresso",    description: "Progresso Chicken Noodle Soup 19oz",pack_size: "12/19oz",      units_per_case: 12, case_cost: 17.28, unit_cost: 1.44, suggested_retail: 2.99, dept: "Grocery",   vendor: "URM" },
  { item_no: "URM-10611", upc: "04300000027", brand: "Jell-O",       description: "Jell-O Strawberry Gelatin 3oz",     pack_size: "24/3oz",       units_per_case: 24, case_cost:  9.60, unit_cost: 0.40, suggested_retail: 0.89, dept: "Grocery",   vendor: "URM" },
  { item_no: "URM-10702", upc: "02840044070", brand: "Quaker",       description: "Quaker Old Fashioned Oats 42oz",   pack_size: "6/42oz",       units_per_case:  6, case_cost: 22.80, unit_cost: 3.80, suggested_retail: 5.99, dept: "Grocery",   vendor: "URM" },
  { item_no: "URM-10801", upc: "01600019993", brand: "Betty Crocker", description: "Betty Crocker Brownie Mix 18.3oz",  pack_size: "12/18.3oz",    units_per_case: 12, case_cost: 20.40, unit_cost: 1.70, suggested_retail: 3.29, dept: "Grocery",   vendor: "URM" },
  // Dairy
  { item_no: "URM-20101", upc: "07025500001", brand: "Darigold",     description: "Darigold Whole Milk 1 Gallon",      pack_size: "4/1gal",       units_per_case:  4, case_cost: 14.40, unit_cost: 3.60, suggested_retail: 4.49, dept: "Dairy",     vendor: "URM" },
  { item_no: "URM-20102", upc: "07025500002", brand: "Darigold",     description: "Darigold 2% Milk 1 Gallon",         pack_size: "4/1gal",       units_per_case:  4, case_cost: 14.00, unit_cost: 3.50, suggested_retail: 4.39, dept: "Dairy",     vendor: "URM" },
  { item_no: "URM-20201", upc: "07025500201", brand: "Darigold",     description: "Darigold Butter Salted 1lb",        pack_size: "12/1lb",       units_per_case: 12, case_cost: 38.40, unit_cost: 3.20, suggested_retail: 5.49, dept: "Dairy",     vendor: "URM" },
  { item_no: "URM-20301", upc: "07025500301", brand: "Tillamook",    description: "Tillamook Medium Cheddar Block 2lb",pack_size: "6/2lb",        units_per_case:  6, case_cost: 42.00, unit_cost: 7.00, suggested_retail: 10.99,dept: "Dairy",     vendor: "URM" },
  { item_no: "URM-20401", upc: "07205600401", brand: "Yoplait",      description: "Yoplait Original Strawberry 6oz",   pack_size: "12/6oz",       units_per_case: 12, case_cost: 10.80, unit_cost: 0.90, suggested_retail: 1.29, dept: "Dairy",     vendor: "URM" },
  // Frozen
  { item_no: "URM-30101", upc: "02800055100", brand: "Birds Eye",    description: "Birds Eye Mixed Vegetables 10oz",   pack_size: "12/10oz",      units_per_case: 12, case_cost: 14.40, unit_cost: 1.20, suggested_retail: 1.99, dept: "Frozen Foods", vendor: "URM" },
  { item_no: "URM-30201", upc: "02800055201", brand: "Marie Callender", description: "Marie Callender Pot Pie Chicken 10oz", pack_size: "8/10oz", units_per_case: 8, case_cost: 16.00, unit_cost: 2.00, suggested_retail: 3.49, dept: "Frozen Foods", vendor: "URM" },
  { item_no: "URM-30301", upc: "02100001050", brand: "DiGiorno",     description: "DiGiorno Four Cheese Pizza 28.2oz", pack_size: "4/28.2oz",     units_per_case:  4, case_cost: 20.00, unit_cost: 5.00, suggested_retail: 8.99, dept: "Frozen Foods", vendor: "URM" },
  // Beverages
  { item_no: "URM-40101", upc: "04900006831", brand: "Coca-Cola",    description: "Coca-Cola Classic 12pk Cans",       pack_size: "2/12pk",       units_per_case:  2, case_cost: 15.99, unit_cost: 8.00, suggested_retail: 10.99,dept: "Beverages", vendor: "URM", promo: "2/$18 thru Mar 17" },
  { item_no: "URM-40102", upc: "04900000168", brand: "Coca-Cola",    description: "Diet Coke 12pk Cans",               pack_size: "2/12pk",       units_per_case:  2, case_cost: 15.99, unit_cost: 8.00, suggested_retail: 10.99,dept: "Beverages", vendor: "URM", promo: "2/$18 thru Mar 17" },
  { item_no: "URM-40103", upc: "04900006571", brand: "Coca-Cola",    description: "Sprite 2 Liter",                    pack_size: "8/2L",         units_per_case:  8, case_cost: 13.44, unit_cost: 1.68, suggested_retail: 2.29, dept: "Beverages", vendor: "URM" },
  { item_no: "URM-40201", upc: "01200000444", brand: "Gatorade",     description: "Gatorade Thirst Quencher 32oz Assorted", pack_size: "8/32oz",   units_per_case:  8, case_cost: 12.00, unit_cost: 1.50, suggested_retail: 2.49, dept: "Beverages", vendor: "URM" },
  // Beer & Wine
  { item_no: "URM-50101", upc: "01870040600", brand: "Coors",        description: "Coors Light 18pk Cans",             pack_size: "2/18pk",       units_per_case:  2, case_cost: 22.40, unit_cost: 11.20,suggested_retail: 16.99,dept: "Beer & Wine", vendor: "URM" },
  { item_no: "URM-50201", upc: "08700400010", brand: "Chateau Ste Michelle", description: "Chateau Ste Michelle Riesling 750ml", pack_size: "12/750ml", units_per_case: 12, case_cost: 84.00, unit_cost: 7.00, suggested_retail: 11.99, dept: "Beer & Wine", vendor: "URM" },
  // Meat
  { item_no: "URM-60101", upc: "02000000601", brand: "IBP",          description: "Fresh 80/20 Ground Beef 10lb roll", pack_size: "4/10lb",       units_per_case:  4, case_cost: 52.00, unit_cost: 13.00,suggested_retail: 3.99, dept: "Meat",      vendor: "URM" },
  { item_no: "URM-60201", upc: "02000000701", brand: "Tyson",        description: "Tyson Chicken Breasts Boneless 10lb",pack_size: "2/10lb",      units_per_case:  2, case_cost: 28.00, unit_cost: 14.00,suggested_retail: 3.49, dept: "Meat",      vendor: "URM" },
]

export const UNFI_CATALOG: OrderGuideItem[] = [
  // Natural Grocery
  { item_no: "UNFI-1001", upc: "01251300038", brand: "Annie's",         description: "Annie's Mac & Cheese Classic 6oz",       pack_size: "12/6oz",      units_per_case: 12, case_cost: 19.44, unit_cost: 1.62, suggested_retail: 2.99, dept: "Grocery",   vendor: "UNFI" },
  { item_no: "UNFI-1002", upc: "07228700118", brand: "Clif Bar",        description: "Clif Bar Variety Pack 2.4oz",             pack_size: "12/2.4oz",    units_per_case: 12, case_cost: 24.00, unit_cost: 2.00, suggested_retail: 2.99, dept: "Grocery",   vendor: "UNFI" },
  { item_no: "UNFI-1003", upc: "08224900102", brand: "KIND",            description: "KIND Dark Chocolate Nuts & Sea Salt",     pack_size: "12/1.4oz",    units_per_case: 12, case_cost: 22.80, unit_cost: 1.90, suggested_retail: 2.49, dept: "Grocery",   vendor: "UNFI" },
  { item_no: "UNFI-1004", upc: "07124900040", brand: "RxBar",           description: "RxBar Chocolate Sea Salt 1.83oz",         pack_size: "12/1.83oz",   units_per_case: 12, case_cost: 26.40, unit_cost: 2.20, suggested_retail: 2.99, dept: "Grocery",   vendor: "UNFI" },
  { item_no: "UNFI-1005", upc: "00751000401", brand: "Simple Mills",    description: "Simple Mills Almond Flour Crackers 4.25oz",pack_size: "6/4.25oz",   units_per_case:  6, case_cost: 21.00, unit_cost: 3.50, suggested_retail: 5.49, dept: "Grocery",   vendor: "UNFI" },
  { item_no: "UNFI-1006", upc: "04920802000", brand: "Bob's Red Mill",  description: "Bob's Red Mill Rolled Oats 32oz",         pack_size: "4/32oz",      units_per_case:  4, case_cost: 14.40, unit_cost: 3.60, suggested_retail: 5.99, dept: "Grocery",   vendor: "UNFI" },
  { item_no: "UNFI-1007", upc: "05123400106", brand: "Amy's",           description: "Amy's Tomato Soup Light Sodium 14.5oz",   pack_size: "12/14.5oz",   units_per_case: 12, case_cost: 26.40, unit_cost: 2.20, suggested_retail: 3.49, dept: "Grocery",   vendor: "UNFI" },
  { item_no: "UNFI-1008", upc: "08902100101", brand: "Justin's",        description: "Justin's Classic Peanut Butter 16oz",    pack_size: "6/16oz",      units_per_case:  6, case_cost: 28.80, unit_cost: 4.80, suggested_retail: 7.99, dept: "Grocery",   vendor: "UNFI" },
  { item_no: "UNFI-1009", upc: "05227200202", brand: "Siete",           description: "Siete Grain Free Tortilla Chips 5oz",    pack_size: "12/5oz",      units_per_case: 12, case_cost: 36.00, unit_cost: 3.00, suggested_retail: 4.99, dept: "Grocery",   vendor: "UNFI" },
  { item_no: "UNFI-1010", upc: "03600048062", brand: "Nature Valley",   description: "Nature Valley Granola Bars Oats & Honey", pack_size: "12/8ct",      units_per_case: 12, case_cost: 28.80, unit_cost: 2.40, suggested_retail: 3.79, dept: "Grocery",   vendor: "UNFI" },
  // Natural Dairy
  { item_no: "UNFI-2001", upc: "09308000260", brand: "Organic Valley", description: "Organic Valley Whole Milk 64oz",          pack_size: "6/64oz",      units_per_case:  6, case_cost: 26.40, unit_cost: 4.40, suggested_retail: 6.99, dept: "Dairy",     vendor: "UNFI" },
  { item_no: "UNFI-2002", upc: "09308000280", brand: "Organic Valley", description: "Organic Valley 2% Milk 64oz",             pack_size: "6/64oz",      units_per_case:  6, case_cost: 25.20, unit_cost: 4.20, suggested_retail: 6.79, dept: "Dairy",     vendor: "UNFI" },
  { item_no: "UNFI-2003", upc: "03600090001", brand: "Siggi's",        description: "Siggi's Plain Yogurt 24oz",               pack_size: "6/24oz",      units_per_case:  6, case_cost: 30.00, unit_cost: 5.00, suggested_retail: 7.99, dept: "Dairy",     vendor: "UNFI" },
  { item_no: "UNFI-2004", upc: "02980000101", brand: "Kite Hill",      description: "Kite Hill Almond Milk Yogurt Plain 16oz", pack_size: "6/16oz",      units_per_case:  6, case_cost: 28.80, unit_cost: 4.80, suggested_retail: 6.99, dept: "Dairy",     vendor: "UNFI" },
  { item_no: "UNFI-2005", upc: "09200000501", brand: "Miyoko's",       description: "Miyoko's European Style Butter 8oz",     pack_size: "12/8oz",      units_per_case: 12, case_cost: 60.00, unit_cost: 5.00, suggested_retail: 8.49, dept: "Dairy",     vendor: "UNFI" },
  // Natural Beverages
  { item_no: "UNFI-4001", upc: "07200000401", brand: "GT's Kombucha",  description: "GT's Kombucha Gingerade 16oz",            pack_size: "12/16oz",     units_per_case: 12, case_cost: 32.40, unit_cost: 2.70, suggested_retail: 4.49, dept: "Beverages", vendor: "UNFI" },
  { item_no: "UNFI-4002", upc: "08524000200", brand: "Califia Farms",  description: "Califia Farms Oat Milk Barista 32oz",     pack_size: "6/32oz",      units_per_case:  6, case_cost: 21.60, unit_cost: 3.60, suggested_retail: 5.99, dept: "Beverages", vendor: "UNFI" },
  { item_no: "UNFI-4003", upc: "07228900300", brand: "Olipop",         description: "Olipop Vintage Cola 12oz",                pack_size: "12/12oz",     units_per_case: 12, case_cost: 33.60, unit_cost: 2.80, suggested_retail: 3.99, dept: "Beverages", vendor: "UNFI" },
  { item_no: "UNFI-4004", upc: "08574000400", brand: "Liquid I.V.",    description: "Liquid I.V. Hydration Multiplier Lemon", pack_size: "8/16ct",      units_per_case:  8, case_cost: 80.00, unit_cost: 10.00,suggested_retail: 14.99,dept: "Beverages", vendor: "UNFI" },
  // Frozen Natural
  { item_no: "UNFI-3001", upc: "05123400300", brand: "Amy's",          description: "Amy's Bean & Rice Burrito 6oz",           pack_size: "12/6oz",      units_per_case: 12, case_cost: 28.80, unit_cost: 2.40, suggested_retail: 3.99, dept: "Frozen Foods", vendor: "UNFI" },
  { item_no: "UNFI-3002", upc: "08902100300", brand: "Kashi",          description: "Kashi Frozen Waffles Blueberry 7.4oz",   pack_size: "8/7.4oz",     units_per_case:  8, case_cost: 24.00, unit_cost: 3.00, suggested_retail: 4.99, dept: "Frozen Foods", vendor: "UNFI" },
  // Household / Health
  { item_no: "UNFI-6001", upc: "07520700601", brand: "Method",         description: "Method All Purpose Cleaner Lavender 28oz",pack_size: "8/28oz",     units_per_case:  8, case_cost: 24.00, unit_cost: 3.00, suggested_retail: 4.49, dept: "Non-Foods",  vendor: "UNFI" },
  { item_no: "UNFI-6002", upc: "07924900602", brand: "Dr. Bronner's",  description: "Dr. Bronner's Pure Castile Soap 32oz",   pack_size: "6/32oz",      units_per_case:  6, case_cost: 40.20, unit_cost: 6.70, suggested_retail: 11.99,dept: "Non-Foods",  vendor: "UNFI" },
]

export function searchCatalog(query: string, vendor?: "URM" | "UNFI"): OrderGuideItem[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const catalog = vendor === "URM" ? URM_CATALOG : vendor === "UNFI" ? UNFI_CATALOG : [...URM_CATALOG, ...UNFI_CATALOG]
  return catalog.filter(item =>
    item.description.toLowerCase().includes(q) ||
    item.brand.toLowerCase().includes(q) ||
    item.upc.includes(q) ||
    item.item_no.toLowerCase().includes(q) ||
    item.dept.toLowerCase().includes(q)
  ).slice(0, 50)
}
