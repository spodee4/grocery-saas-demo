import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { STORES, PRODUCT_CATALOG, URM_CATALOG, UNFI_CATALOG, searchCatalog } from "@/lib/demo-data"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function buildContext() {
  return Object.values(STORES).map(store => {
    const deptLines = store.departments
      .map(d => `    ${d.dept}: Sales $${d.sales.toLocaleString()} | Purchases $${d.purchases.toLocaleString()} | GM $${d.gm_dollars.toLocaleString()} (${d.gm_pct}%) | WoW ${d.wow_pct >= 0 ? "+" : ""}${d.wow_pct}%`)
      .join("\n")

    const invoiceLines = store.recent_invoices
      .map(i => `    ${i.id} | ${i.vendor} | ${i.dept} | $${i.amount.toLocaleString()} | Status: ${i.status} | Allowance earned: $${i.allowance_earned} applied: $${i.allowance_applied} gap: $${i.allowance_earned - i.allowance_applied}`)
      .join("\n")

    const vendorLines = store.allowances.vendors
      .map(v => `    ${v.vendor}: $${v.purchases.toLocaleString()} purchases | $${v.earned} earned | $${v.applied} applied | $${v.gap} GAP`)
      .join("\n")

    const shrinkLines = store.shrink
      .map(s => `    ${s.dept}: $${s.shrink_dollars} shrink (${s.shrink_pct}%) | Known: $${s.known} | Unknown/suspicious: $${s.unknown}`)
      .join("\n")

    const t = store.tender
    const tenderTotal = t.cash + t.credit + t.debit + t.ebt + t.checks + t.gift_cards
    const bd = store.bank_deposit

    return `
═══════════════════════════════════════
STORE: ${store.name} (${store.location}) | ID: ${store.id}
PERIOD: Week of Mar 10–16, 2026
═══════════════════════════════════════

WEEKLY P&L SUMMARY
  Net Sales:       $${store.weekly_sales.toLocaleString()} (prior: $${store.prior_weekly_sales.toLocaleString()} | WoW: ${((store.weekly_sales - store.prior_weekly_sales) / store.prior_weekly_sales * 100).toFixed(1)}%)
  Total Purchases: $${store.departments.reduce((s, d) => s + d.purchases, 0).toLocaleString()}
  Gross Profit:    $${store.weekly_gm.toLocaleString()} | GM: ${store.weekly_gm_pct}%
  Transactions:    ${store.transactions.toLocaleString()} | Avg Basket: $${store.avg_basket.toFixed(2)}

DEPARTMENTS (Sales | Purchases | GM$ | GM% | WoW%):
${deptLines}

VENDOR INVOICES:
${invoiceLines}

ALLOWANCES:
  Total Purchases: $${store.allowances.total_purchases.toLocaleString()}
  Earned: $${store.allowances.allowances_earned.toLocaleString()} | Applied: $${store.allowances.allowances_applied.toLocaleString()} | UNCLAIMED: $${store.allowances.gap.toLocaleString()} ($${(store.allowances.gap * 52).toLocaleString()}/yr)
  By Vendor:
${vendorLines}

TENDER SUMMARY (weekly totals = $${tenderTotal.toLocaleString()}):
  Cash: $${t.cash.toLocaleString()} | Credit: $${t.credit.toLocaleString()} | Debit: $${t.debit.toLocaleString()} | EBT: $${t.ebt.toLocaleString()} | Checks: $${t.checks.toLocaleString()} | Gift Cards: $${t.gift_cards.toLocaleString()}
  Customers: ${t.customer_count.toLocaleString()} | Voids: ${t.voids} | Refunds: ${t.refunds} ($${t.refund_amount.toLocaleString()})

BANK DEPOSIT (${bd.date}):
  Cash Bills: $${bd.cash_bills.toLocaleString()} | Coins: $${bd.cash_coins.toLocaleString()} | Check Total: $${bd.checks.reduce((s, c) => s + c.amount, 0).toLocaleString()}
  Checks: ${bd.checks.map(c => `#${c.check_number} $${c.amount} (${c.from})`).join(", ")}
  Safe Start: $${bd.safe_starting.toLocaleString()} | Safe End: $${bd.safe_ending.toLocaleString()} | Change Order Needed: $${bd.change_order.toLocaleString()}

SHRINK / LOSS ANALYSIS:
${shrinkLines}
  TOTAL SHRINK: $${store.shrink.reduce((s, r) => s + r.shrink_dollars, 0).toLocaleString()} | Unknown (suspicious): $${store.shrink.reduce((s, r) => s + r.unknown, 0).toLocaleString()}
`
  }).join("\n")
}

function buildCatalogContext(userMessage: string) {
  // Extract search terms from message and find relevant catalog items
  const searchTerms = userMessage.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(" ").filter(w => w.length > 3)
  const hits: string[] = []

  for (const term of searchTerms.slice(0, 3)) {
    const results = searchCatalog(term)
    results.slice(0, 3).forEach(item => {
      const inStore = PRODUCT_CATALOG.find(p => p.upc === item.upc)
      const storeInfo = inStore ? ` | YOUR RETAIL: $${inStore.unit_retail.toFixed(2)} | YOUR GM: ${inStore.gm_pct.toFixed(1)}%` : " | NOT IN YOUR STORE"
      hits.push(`[${item.vendor}] ${item.item_no} | ${item.description} | UPC: ${item.upc} | Pack: ${item.pack_size} | Case: $${item.case_cost.toFixed(2)} | Each: $${item.unit_cost.toFixed(2)} | Sugg Retail: $${item.suggested_retail.toFixed(2)}${item.promo ? ` | PROMO: ${item.promo}` : ""}${storeInfo}`)
    })
  }

  return hits.length > 0 ? `\nRELEVANT CATALOG ITEMS:\n${hits.join("\n")}` : ""
}

export async function POST(req: NextRequest) {
  const { messages, store: storeId } = await req.json()
  const currentStore = STORES[storeId] ?? STORES.lakes
  const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").slice(-1)[0]?.content ?? ""

  const systemPrompt = `You are the financial intelligence engine for Store Intelligence — a BRdata-connected analytics platform built for independent grocery store operators.

You are talking directly to the store owner. You have COMPLETE access to their live data: P&L by department, vendor invoices, allowance tracking, tender summary, bank deposit, safe counts, and shrink/theft analysis. All data is current as of the week of Mar 10–16, 2026.

RULES:
- Be direct. Use exact dollar amounts and percentages from the data. Never be vague.
- Answer in 2–5 sentences unless asked for full detail. Don't pad.
- Surface the #1 actionable takeaway when relevant.
- You understand how grocery accounting works: GM% = (Sales - COGS) / Sales. Shrink = known spoilage + unknown variance (unknown = potential theft). Allowances are off-invoice credits from vendors that must be claimed separately.
- When asked about "the store" and storeId is "company", give a combined view across both stores.
- Format numbers as dollars/percentages. Use tabular format for comparisons.

CURRENT VIEW: ${currentStore.name} (${currentStore.location})

FULL DATA SNAPSHOT:
${buildContext()}

KEY OPPORTUNITIES (surface these when relevant):
- URM allowance gap: Lakes $2,350 unclaimed, Potlatch $1,470 unclaimed → $197K/year combined if annualized
- Bakery (52% GM) and Service Deli (54% GM) are highest-margin — any growth here is high-impact
- Beverages margin is only 23% — lowest across both stores — review URM vs direct vendor pricing
- Service Deli unknown shrink ratio is high — warrants a physical count review
- Frito-Lay invoice FRI-77231 at Lakes is still PENDING — $190 allowance at risk if not applied
- Combined company weekly sales: $${(STORES.lakes.weekly_sales + STORES.potlatch.weekly_sales).toLocaleString()}, GP: $${(STORES.lakes.weekly_gm + STORES.potlatch.weekly_gm).toLocaleString()}

PRODUCT DATABASE SUMMARY:
  Your store catalog: ${PRODUCT_CATALOG.length} items on file
  URM order guide: ${URM_CATALOG.length} items available
  UNFI catalog: ${UNFI_CATALOG.length} natural/organic items available
  Items on current promotion (your store): ${PRODUCT_CATALOG.filter(p => p.in_promo).map(p => p.description).join(", ")}
${buildCatalogContext(lastUserMessage)}`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 768,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  })

  return NextResponse.json({
    content: response.content[0].type === "text" ? response.content[0].text : "",
  })
}
