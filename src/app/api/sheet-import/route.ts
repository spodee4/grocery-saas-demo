import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Parse a CSV string into rows/columns
function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/)
  return lines.map(line => {
    const cols: string[] = []
    let cur = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        cols.push(cur.trim()); cur = ""
      } else {
        cur += ch
      }
    }
    cols.push(cur.trim())
    return cols
  })
}

export async function POST(req: NextRequest) {
  const fd = await req.formData()
  const file = fd.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const isCSV = file.name.endsWith(".csv") || file.type === "text/csv"
  if (!isCSV) {
    // For .xlsx files, ask user to save as CSV for now
    return NextResponse.json({ error: "Please save the spreadsheet as CSV (.csv) and re-upload. Excel (.xlsx) direct import coming soon." }, { status: 415 })
  }

  const text = await file.text()
  const rows = parseCSV(text)
  if (rows.length < 2) return NextResponse.json({ error: "File appears empty" }, { status: 400 })

  const headers = rows[0]
  const sampleRows = rows.slice(1, 6) // first 5 data rows for preview

  // Ask Claude to map columns to invoice fields
  const prompt = `You are analyzing a vendor invoice spreadsheet exported as CSV from a grocery distributor (like URM, Sysco, McLane, UNFI, Frito-Lay, Coca-Cola, etc.).

Headers (column names, 0-indexed):
${headers.map((h, i) => `  Col ${i}: "${h}"`).join("\n")}

Sample data rows:
${sampleRows.map((r, ri) => `  Row ${ri + 1}: ${r.map((v, i) => `Col${i}="${v}"`).join(", ")}`).join("\n")}

Identify which column index maps to each invoice field. For fields not present, use null.
Return ONLY valid JSON in this exact shape:
{
  "vendor": <col_index | null>,
  "invoice_number": <col_index | null>,
  "invoice_date": <col_index | null>,
  "store_delivered_to": <col_index | null>,
  "description": <col_index | null>,
  "upc": <col_index | null>,
  "pack_size": <col_index | null>,
  "cases": <col_index | null>,
  "unit_cost": <col_index | null>,
  "promo_dollars": <col_index | null>,
  "extended": <col_index | null>,
  "allowance": <col_index | null>,
  "confidence": "high" | "medium" | "low",
  "notes": "<one sentence about the format if relevant>"
}`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  })

  const raw = response.content[0].type === "text" ? response.content[0].text : ""
  let mapping: Record<string, number | null | string> = {}
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) mapping = JSON.parse(match[0])
  } catch {
    mapping = {}
  }

  return NextResponse.json({
    headers,
    sample_rows: sampleRows,
    total_rows: rows.length - 1,
    mapping,
  })
}
