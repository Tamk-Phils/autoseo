# ApexSEO - Autonomous AI SEO Engine

> **"Your Website's AI SEO Engineer"**
> Analyze, optimize, monitor, and continuously improve your website's search visibility with an autonomous AI-powered SEO engine.

Built strictly according to the architecture blueprint defined in `text.txt`.

---

## 🚀 Key Architectural Highlights

1. **Real Asynchronous Crawler with Strict SSRF Protection**
   - URL resolution checks DNS and strictly blocks private/internal IP spaces (`127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `169.254.169.254`, `localhost`, etc.).
   - Discovers and respects `robots.txt` directives.
   - Discovers and parses `sitemap.xml` URL indexes.
   - Deep HTML inspection via Cheerio extracting title tags, meta descriptions, canonical directives, H1/H2/H3 hierarchies, word counts, missing image alt attributes, internal/external links, schema JSON-LD, OpenGraph, Twitter Cards, and response latencies.

2. **Proprietary Dynamic Optimization Scoring Algorithm**
   - Strictly computed from detected conditions (zero hardcoding or fabricated scores).
   - Weighted dimensions:
     - **Technical SEO**: 25 points
     - **Content & Headings**: 25 points
     - **Indexability**: 15 points
     - **Response Speed / Latency**: 10 points
     - **Internal Linking**: 10 points
     - **Structured Data (Schema.org)**: 15 points
     - **Total**: 100 points

3. **Specialized AI Multi-Agent Architecture**
   - Pluggable provider abstraction (`Gemini`, `OpenAI`, `Anthropic`, or built-in zero-cost deterministic heuristic engine).
   - **Technical SEO Agent**: Evaluates canonical tags, indexing, and rich snippet schemas.
   - **Content SEO Agent**: Generates high-intent titles, meta descriptions, and image alt text.
   - **Internal Linking Agent**: Identifies orphan pages and suggests contextual anchor text links.
   - **Keyword Agent**: Classifies search intent and identifies "Almost Ranking" (positions 4–20) queries.
   - **Optimization Agent**: Proposes precise before/after code changes.
   - **Quality Assurance (QA) Agent**: Validates all proposals against strict character bounds, URL safety, and guarantees guardrails before changes can be applied.

4. **SEO Autopilot & Change Management with 1-Click Rollback**
   - Modes: `OFF`, `ASSISTED`, `AUTONOMOUS`.
   - Granular permission toggles (Title updates, Meta descriptions, Alt attributes, Internal links, Schema).
   - Complete change history capturing before/after values, reasons, affected URLs, and instantaneous 1-click rollback.

5. **Integrated SaaS Interface (No Tailwind CSS - Clean CSS System)**
   - Dark navy / deep blue foundation (`#070d19`, `#0d1527`), cyan accents (`#38bdf8`), emerald successes (`#10b981`), red critical alerts (`#ef4444`).
   - Clean data tables, progress bars, interactive score gauges, terminal execution consoles, and responsive cards.

---

## 📁 Application Structure

```
├── prisma/
│   └── schema.prisma        # 24 normalized models (Users, Projects, CrawlPages, Issues, etc.)
├── src/
│   ├── app/
│   │   ├── page.tsx          # Production SaaS Landing Page
│   │   ├── onboarding/       # 3-Step Project Onboarding
│   │   ├── dashboard/        # Main Executive Overview & Dynamic Scores
│   │   ├── live-crawl/       # Real-Time Crawler Terminal Console
│   │   ├── site-audit/       # Categorized Diagnostic Issues with Solutions
│   │   ├── pages/            # Page-Level Analyzer & On-Demand Optimizer
│   │   ├── opportunities/    # SEO Opportunity Center (Impact/Confidence/Effort)
│   │   ├── recommendations/  # AI Recommendations Approval & Execution Queue
│   │   ├── keywords/         # Keyword Tracking & "Almost Ranking" SERP Intelligence
│   │   ├── internal-links/   # Topology Engine & Orphan Page Detector
│   │   ├── competitors/      # Competitor Analysis & Content Gap Engine
│   │   ├── changes/          # Change Log & Instant Reversible Rollback Engine
│   │   ├── autopilot/        # Safety Policies & Permission Toggles
│   │   ├── search-console/   # Google Search Console Synchronization
│   │   ├── reports/          # Executive Audit Reports (CSV & Printable PDF)
│   │   └── settings/         # Crawl Parameters & Multi-lingual Settings
│   ├── components/           # Sidebar, TopHeader, ScoreGauge
│   └── lib/
│       ├── crawler/          # AutonomousCrawler, Issue Analyzer, Dynamic Scorer
│       ├── ai/               # Multi-Agent Architecture & Provider Abstraction
│       ├── ssrf.ts           # DNS verification & SSRF defense
│       ├── db.ts             # Prisma client singleton
│       └── seed.ts           # Default demo project seeder
```

---

## ⚡ Getting Started (No Payment Required)

1. **Install Dependencies & Initialize Database**:
   ```bash
   npm install
   npx prisma db push
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Or Build for Production**:
   ```bash
   npm run build
   npm start
   ```

