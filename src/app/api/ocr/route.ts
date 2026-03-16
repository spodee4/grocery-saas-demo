import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const formData = await req.formData()

  // Collect all pages (file_0, file_1, ... or just "file" for single)
  const pageFiles: File[] = []
  const single = formData.get("file") as File | null
  if (single) {
    pageFiles.push(single)
  } else {
    let i = 0
    while (true) {
      const f = formData.get(`file_${i}`) as File | null
      if (!f) break
      pageFiles.push(f)
      i++
    }
  }

  if (pageFiles.length === 0) return NextResponse.json({ error: "No files" }, { status: 400 })

  // Build image content blocks for each page
  const imageBlocks: Anthropic.ImageBlockParam[] = []
  for (const f of pageFiles) {
    if (f.type === "application/pdf") continue // skip PDFs for now
    const bytes = await f.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")
    const mt = (f.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    imageBlocks.push({ type: "image", source: { type: "base64", media_type: mt, data: base64 } })
  }

  const pageCount = imageBlocks.length

  const prompt = `You are analyzing ${pageCount > 1 ? `${pageCount} pages of` : "a"} grocery store vendor invoice${pageCount > 1 ? "s (treat them as one invoice)" : ""}.

Extract ALL fields and return ONLY valid JSON (no markdown, no explanation):

{
  "vendor": { "value": "vendor company name", "bbox": [left_pct, top_pct, right_pct, bottom_pct] },
  "invoice_number": { "value": "invoice or order number", "bbox": [...] },
  "invoice_date": { "value": "date as string", "bbox": [...] },
  "store_delivered_to": { "value": "store name or ship-to location", "bbox": [...] },
  "total": { "value": numeric_total_no_dollar_sign, "bbox": [...] },
  "line_items": [
    {
      "description": "product name",
      "upc": "UPC or item code or null",
      "pack_size": "pack size e.g. 24/12oz or null",
      "cases": numeric_case_count_or_null,
      "unit_cost": numeric_unit_cost_or_null,
      "promo_dollars": numeric_promo_allowance_per_case_or_null,
      "extended": numeric_line_total_or_null,
      "bbox": [left_pct, top_pct, right_pct, bottom_pct],
      "page": page_index_0_based
    }
  ],
  "allowances": [
    { "program": "allowance program name", "amount": numeric_amount, "bbox": [...] }
  ],
  "raw_summary": "one sentence summary"
}

BBOX coordinates are percentages (0–100) of the image dimensions for the page where the field appears.
For bbox, estimate where the value appears on the invoice image. Be approximate but useful.
For promo_dollars, look for off-invoice deals, promotional allowances, scan credits, or per-case discounts.
If a field is not found, set value to null and bbox to null.
Return up to 30 line items if present.`

  try {
    const content: Anthropic.MessageParam["content"] = [
      ...imageBlocks,
      { type: "text", text: prompt },
    ]

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ raw_summary: text })

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ...parsed, page_count: pageCount })
  } catch (err) {
    return NextResponse.json({ error: "OCR failed", detail: String(err) }, { status: 500 })
  }
}
