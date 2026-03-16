import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import * as XLSX from "xlsx"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

  const name = file.name.toLowerCase()
  let rows: string[][]

  if (name.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text()
    rows = parseCSV(text)
  } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: "array" })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, { header: 1, defval: "" })
    rows = raw.map(r => r.map(v => String(v ?? "")))
  } else {
    return NextResponse.json({ error: "Upload a .csv, .xlsx, or .xls file" }, { status: 415 })
  }

  if (rows.length < 2) return NextResponse.json({ error: "File appears empty" }, { status: 400 })

  const headers = rows[0]
  const sampleRows = rows.slice(1, 6)

  const prompt = `You are analyzing a vendor invoice spreadsheet from a grocery distributor (URM, Sysco, McLane, UNFI, Frito-Lay, Coca-Cola, etc.).

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
