import React, { useState, useMemo, useEffect } from "react";
import { Search, Clock, IndianRupee, ShieldCheck, Globe2, Bookmark, BookmarkCheck, SlidersHorizontal, Code2, Palette, Megaphone, Calculator, Scale, Headphones, PenTool, BarChart3, RefreshCw, WifiOff } from "lucide-react";

// Point this at your deployed backend (see /backend in the project).
const API_URL = "https://india-remote-jobs-backend.onrender.com/api/jobs";

// ---- Domain taxonomy (color-coded) ----
const DOMAINS = {
  Engineering: { color: "#E8A33D", icon: Code2 },
  Design: { color: "#D46FB0", icon: Palette },
  Marketing: { color: "#5FB3E8", icon: Megaphone },
  Finance: { color: "#6EE7B7", icon: Calculator },
  Legal: { color: "#C9A9FF", icon: Scale },
  Support: { color: "#FF9E7D", icon: Headphones },
  Content: { color: "#FFD166", icon: PenTool },
  Data: { color: "#7DD3FC", icon: BarChart3 },
};

// ---- Fallback sample data — shown if the backend isn't reachable, so the
// UI is never blank. Real jobs come from API_URL above. ----
const MOCK_JOBS = [
  {
    id: 1, domain: "Engineering", title: "Senior Backend Engineer", company: "Northwind Labs", region: "USA (EST)",
    utcOffset: -5, salaryUSD: [95000, 130000], visaFree: true, async: true, tags: ["Node.js", "Postgres"],
    reasons: ["No US work authorization required", "Async-first team, 2hr overlap window"],
  },
  {
    id: 2, domain: "Design", title: "Product Designer", company: "Fjord & Co", region: "UK (GMT)",
    utcOffset: 0, salaryUSD: [70000, 90000], visaFree: true, async: false, tags: ["Figma", "Design Systems"],
    reasons: ["Explicitly hires from India", "4.5hr overlap with IST core hours"],
  },
  {
    id: 3, domain: "Engineering", title: "DevOps / SRE", company: "Cascadia Systems", region: "Canada (PST)",
    utcOffset: -8, salaryUSD: [100000, 140000], visaFree: true, async: true, tags: ["Kubernetes", "AWS"],
    reasons: ["No sponsorship needed — contractor model", "Fully async, no fixed hours"],
  },
  {
    id: 4, domain: "Marketing", title: "Growth Marketing Lead", company: "Solace Analytics", region: "Germany (CET)",
    utcOffset: 1, salaryUSD: [65000, 85000], visaFree: true, async: false, tags: ["B2B SaaS", "SEO"],
    reasons: ["Global contractor payroll (Deel/Remote.com)", "3.5hr overlap with IST"],
  },
  {
    id: 6, domain: "Engineering", title: "Frontend Engineer (React)", company: "Tidepool Studio", region: "Australia (AEST)",
    utcOffset: 10, salaryUSD: [75000, 95000], visaFree: true, async: false, tags: ["React", "TypeScript"],
    reasons: ["Explicitly hires from India", "5.5hr overlap — evening IST shift"],
  },
  {
    id: 7, domain: "Content", title: "Technical Writer", company: "Almanac Systems", region: "Fully distributed",
    utcOffset: null, salaryUSD: [55000, 70000], visaFree: true, async: true, tags: ["Docs", "API"],
    reasons: ["No timezone requirement at all", "Global contractor payroll"],
  },
  {
    id: 9, domain: "Finance", title: "Financial Analyst (FP&A)", company: "Harbor Point Capital", region: "USA (CST)",
    utcOffset: -6, salaryUSD: [60000, 80000], visaFree: true, async: true, tags: ["Excel", "Modeling"],
    reasons: ["Contractor-friendly payroll", "3hr overlap, rest async"],
  },
  {
    id: 10, domain: "Legal", title: "Contracts Paralegal", company: "Meridian & Voss", region: "UK (GMT)",
    utcOffset: 0, salaryUSD: [45000, 60000], visaFree: true, async: false, tags: ["Contracts", "Compliance"],
    reasons: ["Explicitly hires from India", "4.5hr overlap with IST"],
  },
  {
    id: 11, domain: "Support", title: "Customer Success Manager", company: "Bramble Software", region: "USA (EST)",
    utcOffset: -5, salaryUSD: [55000, 70000], visaFree: true, async: false, tags: ["SaaS", "Onboarding"],
    reasons: ["Evening IST shift covers US morning", "No sponsorship needed"],
  },
  {
    id: 13, domain: "Data", title: "Analytics Engineer", company: "Cascadia Systems", region: "Canada (PST)",
    utcOffset: -8, salaryUSD: [90000, 120000], visaFree: true, async: true, tags: ["dbt", "SQL"],
    reasons: ["No sponsorship needed — contractor model", "Fully async"],
  },
];

const IST_OFFSET = 5.5;
const USD_TO_INR = 83;

function overlapHours(utcOffset) {
  if (utcOffset === null || utcOffset === undefined) return 24;
  const diff = Math.abs(IST_OFFSET - utcOffset);
  const shifted = diff > 12 ? 24 - diff : diff;
  return Math.max(0, 12 - shifted);
}

function formatINR(usd) {
  const inr = usd * USD_TO_INR;
  return `₹${(inr / 100000).toFixed(1)}L`;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [visaFreeOnly, setVisaFreeOnly] = useState(true);
  const [minOverlap, setMinOverlap] = useState(0);
  const [activeDomains, setActiveDomains] = useState(new Set());
  const [saved, setSaved] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);

  const [sourceJobs, setSourceJobs] = useState(MOCK_JOBS);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(true);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Bad response");
      const data = await res.json();
      if (Array.isArray(data.jobs) && data.jobs.length > 0) {
        setSourceJobs(data.jobs);
        setUsingMock(false);
      } else {
        setSourceJobs(MOCK_JOBS);
        setUsingMock(true);
      }
    } catch (err) {
      setSourceJobs(MOCK_JOBS);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDomain = (d) => {
    setActiveDomains((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      return next;
    });
  };

  const jobs = useMemo(() => {
    return sourceJobs.filter((j) => !j.excluded)
      .filter((j) => (visaFreeOnly ? j.visaFree : true))
      .filter((j) => overlapHours(j.utcOffset) >= minOverlap)
      .filter((j) => (activeDomains.size === 0 ? true : activeDomains.has(j.domain)))
      .filter((j) =>
        query.trim() === ""
          ? true
          : (j.title + j.company + j.tags.join(" ")).toLowerCase().includes(query.toLowerCase())
      );
  }, [sourceJobs, query, visaFreeOnly, minOverlap, activeDomains]);

  const toggleSave = (id) => {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#0D0D22] text-[#F2EEE3] font-[Inter]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .glow-text {
          background: linear-gradient(90deg, #E8A33D, #FFD166, #E8A33D);
          background-size: 200% auto;
          -webkit-background-clip: text; background-clip: text; color: transparent;
          animation: shimmer 6s linear infinite;
        }
        .card-hover { transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
        .card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 32px -12px rgba(232,163,61,0.25); }
      `}</style>

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-[#2A2A4A] px-6 py-14 md:py-20">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, rgba(232,163,61,0.25), transparent 40%), radial-gradient(circle at 85% 10%, rgba(95,179,232,0.2), transparent 45%), radial-gradient(circle at 60% 80%, rgba(212,111,176,0.18), transparent 40%)",
          }}
        />
        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-center gap-2 text-[#E8A33D] font-mono text-xs uppercase tracking-widest mb-5">
            <Globe2 size={14} style={{ animation: "float 3s ease-in-out infinite" }} />
            Eligibility-checked, across every field
          </div>
          <h1 className="font-display text-4xl md:text-7xl font-bold leading-[1.05] mb-5">
            Remote jobs that<br /><span className="glow-text">actually let you apply.</span>
          </h1>
          <p className="text-[#B8B3A8] max-w-xl text-base md:text-lg">
            Engineering, design, marketing, finance, legal, and more — every listing here
            is pre-checked for India eligibility: no US-only work auth, realistic timezone
            overlap, pay shown in rupees.
          </p>
        </div>
      </header>

      {/* Data source status */}
      <div className="max-w-5xl mx-auto px-6 pt-5 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2" style={{ color: usingMock ? "#B8B3A8" : "#2F9E8F" }}>
          {usingMock ? <WifiOff size={13} /> : <span className="w-2 h-2 rounded-full bg-[#2F9E8F] inline-block" />}
          {loading ? "Checking backend…" : usingMock ? "Showing sample data — backend not reachable" : "Live data from backend"}
        </div>
        <button
          onClick={loadJobs}
          className="flex items-center gap-1.5 text-[#B8B3A8] hover:text-[#F2EEE3] transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Domain chips */}
      <div className="max-w-5xl mx-auto px-6 pt-6 flex flex-wrap gap-2">
        {Object.entries(DOMAINS).map(([name, { color, icon: Icon }]) => {
          const active = activeDomains.has(name);
          return (
            <button
              key={name}
              onClick={() => toggleDomain(name)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
              style={{
                borderColor: active ? color : "#2A2A4A",
                backgroundColor: active ? `${color}22` : "transparent",
                color: active ? color : "#B8B3A8",
              }}
            >
              <Icon size={13} />
              {name}
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="max-w-5xl mx-auto px-6 py-6 sticky top-0 bg-[#0D0D22]/95 backdrop-blur z-10 border-b border-[#2A2A4A] mt-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#1B1B3A] rounded-lg px-4 py-2.5 border border-[#2A2A4A]">
            <Search size={16} className="text-[#6E6A94]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search role, company, or skill"
              className="bg-transparent outline-none w-full text-sm placeholder:text-[#6E6A94]"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#2A2A4A] text-sm hover:bg-[#1B1B3A] transition-colors"
          >
            <SlidersHorizontal size={15} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-col sm:flex-row gap-6 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={visaFreeOnly}
                onChange={(e) => setVisaFreeOnly(e.target.checked)}
                className="accent-[#E8A33D]"
              />
              No visa/work-auth required
            </label>
            <div className="flex items-center gap-3">
              <span className="text-[#B8B3A8] whitespace-nowrap">Min. IST overlap: {minOverlap}hr</span>
              <input
                type="range" min="0" max="12" value={minOverlap}
                onChange={(e) => setMinOverlap(Number(e.target.value))}
                className="accent-[#E8A33D] w-40"
              />
            </div>
          </div>
        )}
      </div>

      {/* Job list */}
      <main className="max-w-5xl mx-auto px-6 py-8 grid gap-4 md:grid-cols-2">
        <p className="md:col-span-2 text-[#6E6A94] text-sm font-mono">{jobs.length} eligible roles</p>

        {jobs.map((job) => {
          const overlap = overlapHours(job.utcOffset);
          const overlapPct = Math.round((overlap / 12) * 100);
          const domain = DOMAINS[job.domain] || DOMAINS.Engineering;
          const DomainIcon = domain.icon;
          return (
            <div
              key={job.id}
              className="card-hover bg-[#1B1B3A] border rounded-xl p-5 md:p-6"
              style={{ borderColor: "#2A2A4A" }}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full mb-2"
                    style={{ backgroundColor: `${domain.color}1A`, color: domain.color }}
                  >
                    <DomainIcon size={11} />
                    {job.domain}
                  </div>
                  <h3 className="font-display text-xl font-medium">{job.title}</h3>
                  <p className="text-[#B8B3A8] text-sm mt-0.5">{job.company} · {job.region}</p>
                </div>
                <button onClick={() => toggleSave(job.id)} className="text-[#E8A33D] shrink-0">
                  {saved.has(job.id) ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {(job.tags || []).map((t) => (
                  <span key={t} className="text-xs font-mono px-2 py-1 rounded bg-[#0D0D22] text-[#B8B3A8] border border-[#2A2A4A]">
                    {t}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm">
                {job.salaryUSD && (
                  <div className="flex items-center gap-1.5 text-[#2F9E8F]">
                    <IndianRupee size={14} />
                    {formatINR(job.salaryUSD[0])}–{formatINR(job.salaryUSD[1])}/yr
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[#B8B3A8] font-mono">
                  <Clock size={14} />
                  {job.utcOffset === null || job.utcOffset === undefined ? "No fixed hours" : `${overlap}hr overlap with IST`}
                </div>
              </div>

              {job.utcOffset !== null && job.utcOffset !== undefined && (
                <div className="mt-2 h-1.5 rounded-full bg-[#0D0D22] overflow-hidden">
                  <div className="h-full" style={{ width: `${overlapPct}%`, backgroundColor: domain.color }} />
                </div>
              )}

              <ul className="mt-4 space-y-1.5">
                {(job.reasons || []).map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#D9D4C9]">
                    <ShieldCheck size={15} className="text-[#2F9E8F] mt-0.5 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>

              {job.url && (
                
              href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 text-sm font-medium text-[#E8A33D] hover:underline"
                >
                  View listing →
                </a>
              )}
            </div>
          );
        })}

        {jobs.length === 0 && (
          <div className="md:col-span-2 text-center py-16 text-[#6E6A94]">
            No roles match these filters yet. Try loosening the overlap requirement or clearing domain filters.
          </div>
        )}
      </main>
    </div>
  );
}
