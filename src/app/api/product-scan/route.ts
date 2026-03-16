import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { PRODUCT_CATALOG } from "@/lib/demo-data"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString("base64")
  const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp"

  // Step 1: Claude Vision — extract UPC and product name
  let identified: { upc: string | null; name: string | null; brand: string | null } = { upc: null, name: null, brand: null }

  try {
    const visionResp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: `Identify this grocery product. Return ONLY valid JSON, no markdown:
{"upc":"barcode/UPC if visible else null","name":"full product name with size/count","brand":"brand name"}` },
        ],
      }],
    })

    const text = visionResp.content[0].type === "text" ? visionResp.content[0].text : ""
    const m = text.match(/\{[\s\S]*?\}/)
    if (m) identified = JSON.parse(m[0])
  } catch {
    // continue to name-only lookup
  }

  // Step 2: look up in catalog
  const searchKey = identified.upc ?? identified.name ?? ""
  let found = null

  if (identified.upc) {
    found = PRODUCT_CATALOG.find(p => p.upc === identified.upc)
  }
  if (!found && identified.name) {
    const nameLower = (identified.name + " " + (identified.brand ?? "")).toLowerCase()
    found = PRODUCT_CATALOG.find(p => {
      const dLower = p.description.toLowerCase()
      // check if key words from identified name appear in description
      const words = dLower.split(" ")
      return words.some(w => w.length > 3 && nameLower.includes(w))
    })
  }

  if (found) {
    return NextResponse.json({
      status: "found",
      identified,
      product: found,
    })
  }

  // Step 3: not found — build search links
  const nameEncoded = encodeURIComponent(identified.name ?? identified.upc ?? "")
  const upcEncoded  = encodeURIComponent(identified.upc ?? "")

  return NextResponse.json({
    status: "not_found",
    identified,
    links: [
      {
        label: "Search URM Order Guide",
        url: `https://www.urmstores.com/search?q=${nameEncoded}`,
        icon: "urm",
      },
      {
        label: "Search UNFI Catalog",
        url: `https://www.unfi.com/products/search?q=${nameEncoded}`,
        icon: "unfi",
      },
      {
        label: "UPC Database Lookup",
        url: `https://www.barcodelookup.com/${upcEncoded || nameEncoded}`,
        icon: "barcode",
      },
      {
        label: "Google This Product",
        url: `https://www.google.com/search?q=${nameEncoded}+grocery+wholesale+cost`,
        icon: "google",
      },
    ],
  })
}
