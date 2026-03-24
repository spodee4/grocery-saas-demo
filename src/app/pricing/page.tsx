"use client"

import { useState } from "react"
import Link from "next/link"

const TIERS = [
  {
    name: "Core",
    price: { monthly: 599, annual: 499 },
    description: "Everything you need to replace your bookkeeper",
    highlight: false,
    features: [
      "BRdata sync — daily P&L, dept sales, shrink",
      "Invoice scanning (OCR + AI field extraction)",
      "Morning report emails",
      "Ask AI chat with full store context",
      "Vendor invoice library",
      "Standard reports (P&L, Bank Deposit, A/P Aging)",
      "1 store",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: { monthly: 899, annual: 749 },
    description: "Full intelligence platform for growing stores",
    highlight: true,
    badge: "Most Popular",
    features: [
      "Everything in Core",
      "Labor analytics (Connecteam sync)",
      "Allowance tracker + vendor deal scoring",
      "Cash & tender analysis",
      "Shrink intelligence + cause breakdown",
      "Competitor price monitoring (weekly)",
      "Up to 3 stores",
      "Priority support + onboarding call",
    ],
  },
  {
    name: "Elite",
    price: { monthly: 1099, annual: 916 },
    description: "Multi-store operations with full automation",
    highlight: false,
    features: [
      "Everything in Pro",
      "Unlimited stores",
      "Price elasticity modeling",
      "ECRS / POS direct integration",
      "Custom report builder",
      "Dedicated account manager",
      "QuickBooks sync (Phase 2)",
      "SLA: 99.9% uptime guarantee",
    ],
  },
]

const FOUNDING = {
  price: 699,
  spotsLeft: 14,
  total: 20,
  perks: [
    "Price locked forever — never increases",
    "All Pro features included",
    "Direct line to founder (John) for feature requests",
    "First access to every new feature",
    "Logo on our customer wall",
  ],
}

const MULTI_STORE = [
  { stores: "2 stores", discount: "10% off" },
  { stores: "3 stores", discount: "15% off" },
  { stores: "4+ stores", discount: "20% off" },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto">
        <div className="mb-2">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to dashboard
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            FMS charges $1,266/mo. We charge less and do more.
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Built for independent grocers. Replace your bookkeeper, not your budget.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm ${!annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-11 h-6 rounded-full transition-colors ${annual ? "bg-primary" : "bg-border"}`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  annual ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm ${annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              Annual
              <span className="ml-1.5 text-xs bg-primary/10 text-primary font-semibold px-1.5 py-0.5 rounded">
                2 months free
              </span>
            </span>
          </div>
        </div>

        {/* Founding member banner */}
        <div className="mb-8 rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-primary">⚡ Founding Member Offer</span>
              <span className="text-xs bg-primary text-primary-foreground font-bold px-2 py-0.5 rounded-full">
                {FOUNDING.spotsLeft} of {FOUNDING.total} spots left
              </span>
            </div>
            <p className="text-sm text-foreground font-medium">
              Lock in <span className="text-primary font-bold">${FOUNDING.price}/store/month forever</span> — all Pro features included. Price never increases.
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {FOUNDING.perks.map((p) => (
                <li key={p} className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="text-primary">✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
          <a
            href="mailto:john2@akinsmarket.com?subject=Founding Member Interest — Store Intelligence"
            className="shrink-0 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Claim spot →
          </a>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {TIERS.map((tier) => {
            const price = annual ? tier.price.annual : tier.price.monthly
            return (
              <div
                key={tier.name}
                className={`rounded-xl border p-6 flex flex-col relative ${
                  tier.highlight
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border bg-card"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h2 className="text-lg font-bold text-foreground">{tier.name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{tier.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">${price}</span>
                  <span className="text-muted-foreground text-sm">/store/month</span>
                  {annual && (
                    <p className="text-xs text-muted-foreground mt-1">
                      billed ${price * 10}/year (save ${(tier.price.monthly - price) * 12}/yr)
                    </p>
                  )}
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5 shrink-0">✓</span>
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="mailto:john2@akinsmarket.com?subject=Store Intelligence Demo Request"
                  className={`w-full text-center text-sm font-semibold py-2.5 rounded-lg transition-opacity hover:opacity-90 ${
                    tier.highlight
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-border"
                  }`}
                >
                  Request demo
                </a>
              </div>
            )
          })}
        </div>

        {/* Multi-store discounts */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8">
          <h3 className="text-base font-semibold text-foreground mb-4">Multi-store discounts</h3>
          <div className="grid grid-cols-3 gap-4">
            {MULTI_STORE.map((row) => (
              <div key={row.stores} className="text-center p-4 rounded-lg bg-muted">
                <div className="text-2xl font-bold text-primary">{row.discount}</div>
                <div className="text-sm text-muted-foreground mt-1">{row.stores}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Discounts applied to all stores on your account. Multi-store pricing scales as you grow.
          </p>
        </div>

        {/* vs FMS comparison */}
        <div className="rounded-xl border border-border bg-card p-6 mb-8">
          <h3 className="text-base font-semibold text-foreground mb-4">How we compare to FMS Solutions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium w-1/3" />
                  <th className="text-center py-2 text-foreground font-semibold">Store Intelligence</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">FMS Solutions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Price (1 store)", "$599–$1,099/mo", "$1,170–$1,300/mo"],
                  ["Data freshness", "Daily (real-time sync)", "2–3 months lag"],
                  ["QuickBooks integration", "Phase 2 (planned)", "No"],
                  ["AI assistant", "✓ Ask AI (Claude)", "Basic dashboard only"],
                  ["Invoice scanning", "✓ OCR + AI", "Manual entry"],
                  ["Setup", "Self-serve, 1 day", "Weeks of onboarding"],
                  ["Contract", "Month-to-month", "Annual required"],
                ].map(([feature, si, fms]) => (
                  <tr key={feature}>
                    <td className="py-3 text-muted-foreground">{feature}</td>
                    <td className="py-3 text-center text-primary font-medium">{si}</td>
                    <td className="py-3 text-center text-muted-foreground">{fms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-foreground mb-4">Common questions</h3>
          <div className="space-y-4">
            {[
              {
                q: "What POS systems do you support?",
                a: "BRdata is fully supported today. ECRS / Catapult direct integration is in Elite. More POS integrations are on the roadmap — tell us what you use.",
              },
              {
                q: "What happens after my trial?",
                a: "You'll be on a month-to-month plan — no annual contracts required. Cancel anytime.",
              },
              {
                q: "Can I add stores later?",
                a: "Yes. Each store added gets the multi-store discount applied retroactively to your account.",
              },
              {
                q: "Is my data private?",
                a: "Yes. Your store data is isolated to your account. We don't sell or share data with third parties.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border border-border rounded-lg p-4">
                <div className="font-medium text-foreground text-sm mb-1">{q}</div>
                <div className="text-sm text-muted-foreground">{a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center rounded-xl bg-primary/10 border border-primary/20 p-8">
          <h3 className="text-xl font-bold text-foreground mb-2">Ready to replace FMS?</h3>
          <p className="text-muted-foreground text-sm mb-5">
            We'll have your store live in a day. No contracts, no spreadsheets, no lag.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:john2@akinsmarket.com?subject=Store Intelligence Demo Request"
              className="bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Book a demo
            </a>
            <Link
              href="/dashboard"
              className="bg-muted text-foreground border border-border text-sm font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Explore the demo →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Questions? Reach John directly at{" "}
            <a href="mailto:john2@akinsmarket.com" className="text-primary hover:underline">
              john2@akinsmarket.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
