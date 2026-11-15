"use client";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  createContext,
  useContext,
  ReactNode,
  FormEvent,
} from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Download,
  FileCheck2,
  FileText,
  FlaskConical,
  History,
  Info,
  Languages,
  LoaderCircle,
  Mic,
  Pause,
  Receipt,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Upload,
  Volume2,
  X,
  AlertTriangle,
  RefreshCw,
  ArrowDownRight,
  CheckCheck,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { BillingScreen, AnalyticsScreen } from "./billing-components";
import { AIAssistantScreen } from "./ai-assistant-component";
import { PresentationReportScreen } from "./presentation-report-component";
import {
  State,
  Lang,
  Action,
  Context,
  Experiment,
  ImportResult,
  clone,
  emptyState,
  money,
  time,
  minute,
  addDays,
  MAX_BYTES,
} from "@/lib/domain";
import {
  analyze,
  economics,
  parseCSV,
  splitCSV,
  REQUIRED,
} from "@/lib/analytics";
import { tr, periodLabel, briefing, approvedTerms } from "@/lib/i18n";
import { sampleCSV, sampleContext } from "@/lib/fixtures";
import {
  Command,
  Correction,
  interpretCorrection,
  contextSchema,
} from "@/lib/commands";
import { download, posterHTML } from "@/lib/poster";

type StateResponse = { state?: State; error?: string };
type ProviderResponse = {
  text?: string;
  source?: string;
  reason?: string;
  audio?: string;
  mime?: string;
  cached?: boolean;
  transcript?: string;
  correction?: Correction | null;
  error?: string;
};
type Page =
  | "billing"
  | "analytics"
  | "assistant"
  | "report"
  | "pulse"
  | "setup"
  | "receipt"
  | "actions"
  | "experiment"
  | "results";
type InputCommand =
  | Omit<Extract<Command, { type: "loadSample" }>, "expectedVersion">
  | Omit<Extract<Command, { type: "upload" }>, "expectedVersion">
  | Omit<Extract<Command, { type: "context" }>, "expectedVersion">
  | Omit<Extract<Command, { type: "approve" }>, "expectedVersion">
  | Omit<Extract<Command, { type: "reject" }>, "expectedVersion">
  | Omit<Extract<Command, { type: "stage" }>, "expectedVersion">
  | Omit<Extract<Command, { type: "review" }>, "expectedVersion">
  | { type: "reset" };
type AppCtx = {
  s: State;
  l: Lang;
  t: (key: string) => string;
  busy: boolean;
  run: (c: InputCommand) => Promise<boolean>;
  go: (p: Page) => void;
  action: Action;
  setAction: (a: Action) => void;
  notify: (s: string) => void;
  provider: { configured: boolean; dailyApplicationLimit: number } | null;
};
const AppContext = createContext<AppCtx>(null!);
const useApp = () => useContext(AppContext);
const NAV: [Page, string, typeof Activity][] = [
  ["pulse", "Today’s Pulse", Activity],
  ["receipt", "Decision Receipt", Receipt],
  ["actions", "Compare actions", SlidersHorizontal],
  ["experiment", "Experiment", FlaskConical],
  ["results", "Results & history", History],
  ["billing", "Quick Billing & POS", ShoppingCart],
  ["analytics", "Sales & Time Analytics", BarChart3],
  ["assistant", "AI Assistant (Tamil Voice)", Sparkles],
  ["report", "Executive Report (PDF)", FileText],
  ["setup", "Setup & upload", Upload],
];
function IconButton({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      className="icon-button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
function Button({
  children,
  onClick,
  secondary = false,
  disabled = false,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${secondary ? "button secondary" : "button"} ${className}`}
    >
      {children}
    </button>
  );
}
function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`tag ${tone}`}>{children}</span>;
}
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Empty({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Store size={32} />
      </span>
      <h2>{title}</h2>
      <p>{detail}</p>
      {children}
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="dialog-head">
        <h2 id="dialog-title">{title}</h2>
        <IconButton label={tr(useApp().l, "Close")} onClick={onClose}>
          <X size={22} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
function Status({ e }: { e: Experiment }) {
  const { t } = useApp();
  return (
    <Tag
      tone={e.stage === "Reviewed" ? "lime" : e.invalidated ? "amber" : "cyan"}
    >
      {t(e.stage)}
    </Tag>
  );
}

const STORAGE_STATE_KEY = "dukaanpulse_state_v2";

export default function Workspace() {
  const [s, setS] = useState<State>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_STATE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.version === "number") return parsed;
        }
      } catch {}
    }
    return emptyState();
  });
  const [l, setL] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dp-language");
      if (["en-IN", "hi-IN", "ta-IN"].includes(saved || "")) return saved as Lang;
    }
    return "en-IN";
  });
  const [page, setPage] = useState<Page>("pulse");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<Action>("investigate");
  const [settings, setSettings] = useState(false);
  const [reset, setReset] = useState(false);
  const [provider, setProvider] = useState<AppCtx["provider"]>(null);
  const [sarvamKeyInput, setSarvamKeyInput] = useState("");
  const [sarvamSaving, setSarvamSaving] = useState(false);
  const [sarvamMsg, setSarvamMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const lock = useRef(false);
  const main = useRef<HTMLElement>(null);
  const t = (key: string) => tr(l, key);

  useEffect(() => {
    Promise.all([
      fetch("/api/state")
        .then((r) => r.json() as Promise<StateResponse>)
        .then((d) => {
          if (d.state) {
            setS((prev) => {
              if (d.state!.version >= prev.version) {
                try {
                  localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(d.state));
                } catch {}
                return d.state!;
              }
              // If client local state has unsynced progress, keep client state
              return prev;
            });
            setError("");
          } else {
            setError(d.error || "network");
          }
        }),
      fetch("/api/health")
        .then((r) => r.json() as Promise<AppCtx["provider"]>)
        .then(setProvider),
    ])
      .catch(() => setError("network"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.lang = l;
    localStorage.setItem("dp-language", l);
  }, [l]);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(""), 6500);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  function go(p: Page) {
    setPage(p);
    requestAnimationFrame(() => {
      main.current?.focus({ preventScroll: true });
      window.scrollTo({
        top: 0,
        behavior: "instant",
      });
    });
  }

  async function handleSaveSarvamKey(e: React.FormEvent) {
    e.preventDefault();
    if (!sarvamKeyInput.trim()) return;
    setSarvamSaving(true);
    setSarvamMsg(null);
    try {
      const res = await fetch("/api/config-sarvam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: sarvamKeyInput.trim() }),
      });
      const data = (await res.json()) as { message?: string };
      if (res.ok) {
        setSarvamMsg({
          text:
            l === "ta-IN"
              ? "சர்வம் API சாவி வெற்றிகரமாக இணைக்கப்பட்டது!"
              : "Sarvam API Key connected successfully!",
          ok: true,
        });
        setSarvamKeyInput("");
        fetch("/api/health")
          .then((r) => r.json() as Promise<AppCtx["provider"]>)
          .then(setProvider)
          .catch(() => {});
      } else {
        setSarvamMsg({
          text: data.message || "Failed to update key",
          ok: false,
        });
      }
    } catch {
      setSarvamMsg({ text: "Network error saving API key", ok: false });
    } finally {
      setSarvamSaving(false);
    }
  }

  async function run(c: InputCommand) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...c, expectedVersion: s.version }),
      });
      const d = (await r.json()) as StateResponse;
      if (!r.ok || !d.state) {
        setError(d.error || "network");
        if (r.status === 409) {
          const fresh = await fetch("/api/state").then(
            (x) => x.json() as Promise<StateResponse>,
          );
          if (fresh.state) {
            setS(fresh.state);
            try {
              localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(fresh.state));
            } catch {}
          }
        }
        return false;
      }
      setS(d.state);
      try {
        localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(d.state));
      } catch {}
      setAction("investigate");
      return true;
    } catch {
      setError("network");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const ctx: AppCtx = {
    s,
    l,
    t,
    busy,
    run,
    go,
    action,
    setAction,
    notify: setNotice,
    provider,
  };
  return (
    <AppContext.Provider value={ctx}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <a
            className="logo"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              go("pulse");
            }}
          >
            <span className="logo-symbol">
              <Activity size={26} />
            </span>
            <span>
              Dukaan<span className="logo-light">Pulse</span>
              <small>PAYTM MERCHANT POS & AI</small>
            </span>
          </a>
          <div className="workspace-label">{t("Merchant workspace")}</div>
          <nav aria-label={t("Merchant workspace")}>
            {NAV.map(([id, label, Icon]) => (
              <button
                key={id}
                className={`${page === id ? "nav-item active" : "nav-item"} ${id === "receipt" ? "standout-nav" : ""}`}
                onClick={() => go(id)}
                aria-current={page === id ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{t(label)}</span>
                {id === "receipt" && (
                  <span className="nav-badge" style={{ background: "var(--accent)", color: "var(--navy)", fontWeight: 700 }}>
                    {s.revision > 0 ? `#${String(s.revision).padStart(2, "0")}` : "CORE"}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="pilot-note">
              <ShieldCheck size={20} />
              <p>
                {t("Independent hackathon prototype. No Paytm connection.")}
              </p>
            </div>
            <button className="nav-item" onClick={() => setSettings(true)}>
              <Settings2 size={19} />
              <span>{t("Settings & provider")}</span>
            </button>
            <div className="team-label">
              <span className="team-avatar">T₃</span>
              <div>
                <strong>Team Trio</strong>
                <small>Merchant Growth AI · Chennai</small>
              </div>
            </div>
          </div>
        </aside>
        <div className="main-wrap">
          <header className="topbar">
            <div className="shop-header">
              <span className="shop-icon">
                <Coffee size={21} />
              </span>
              <div>
                <strong>{s.context.shop}</strong>
                <small>{t("All times Asia/Kolkata")}</small>
              </div>
            </div>
            <div className="top-actions">
              <span className={`save-state ${error ? "failed" : ""}`}>
                {busy ? (
                  <LoaderCircle size={14} className="spin" />
                ) : (
                  <CheckCheck size={15} />
                )}
                <span>
                  {t(
                    busy
                      ? "Saving…"
                      : error
                        ? "Save failed"
                        : "Saved on server",
                  )}
                </span>
              </span>
              <label className="language-picker">
                <Languages size={17} />
                <select
                  aria-label={t("Language")}
                  value={l}
                  onChange={(e) => setL(e.target.value as Lang)}
                >
                  <option value="en-IN">English</option>
                  <option value="hi-IN">हिन्दी</option>
                  <option value="ta-IN">தமிழ்</option>
                </select>
              </label>
              <button className="icon-button mobile-settings" onClick={() => setSettings(true)} aria-label={t("Settings & provider")}>
                <Settings2 size={18}/>
              </button>
            </div>
          </header>
          <main id="main" ref={main} tabIndex={-1}>
            {error && (
              <div role="alert" className="alert error">
                <AlertTriangle size={20} />
                <span>{t(error)}</span>
                <button onClick={() => location.reload()}>
                  {t("Continue")}
                </button>
              </div>
            )}
            {loading ? (
              <div className="loading">
                <LoaderCircle className="spin" />
                {t("Loading your workspace…")}
              </div>
            ) : (
              <>
                {page === "pulse" ? (
                  <Pulse />
                ) : page === "receipt" ? (
                  <Evidence />
                ) : page === "actions" ? (
                  <Actions key={s.revision} />
                ) : page === "experiment" ? (
                  <ExperimentScreen />
                ) : page === "results" ? (
                  <Results />
                ) : page === "billing" ? (
                  <BillingScreen
                    lang={l}
                    onGoToAnalytics={() => setPage("analytics")}
                  />
                ) : page === "analytics" ? (
                  <AnalyticsScreen
                    lang={l}
                    onGoToBilling={() => setPage("billing")}
                    onGoToActions={() => setPage("actions")}
                  />
                ) : page === "assistant" ? (
                  <AIAssistantScreen
                    lang={l}
                    onGoToBilling={() => setPage("billing")}
                    onGoToActions={() => setPage("actions")}
                  />
                ) : page === "report" ? (
                  <PresentationReportScreen
                    lang={l}
                    onGoToBilling={() => setPage("billing")}
                    onGoToActions={() => setPage("actions")}
                  />
                ) : (
                  <Setup key={s.revision} />
                )}
              </>
            )}
          </main>
          <footer className="app-footer">
            <span>
              DukaanPulse <span className="footer-dot">/</span>{" "}
              {t("Team Trio · Track 1")}
            </span>
            <span>
              {s.loaded && s.sourceName.startsWith("synthetic-")
                ? t("Synthetic demonstration")
                : t("Independent hackathon prototype. No Paytm connection.")}
            </span>
          </footer>
        </div>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Info size={18} />
          {t(notice)}
        </div>
      )}
      {settings && (
        <Modal
          title={t("Sarvam configuration")}
          onClose={() => setSettings(false)}
        >
          <div className="stack">
            <Tag tone={provider?.configured ? "cyan" : "amber"}>
              {t(
                provider?.configured
                  ? "Configured, live check pending"
                  : "Not configured",
              )}
            </Tag>
            <p>
              {t(
                "Organiser allocation: 500 credits (reported). Unit, current balance, eligibility and expiry are unverified.",
              )}
            </p>
            <p className="muted">
              {t(
                "Server-side calls only. No automatic retries. Daily application limit is not a provider balance.",
              )}
            </p>
            <div className="facts">
              <div>
                <span>TTS</span>
                <strong>bulbul:v3</strong>
              </div>
              <div>
                <span>STT</span>
                <strong>saaras:v3</strong>
              </div>
              <div>
                <span>Q&A</span>
                <strong>sarvam-105b</strong>
              </div>
              <div>
                <span>{t("Limit")}</span>
                <strong>12 / UTC day / workspace</strong>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                padding: "14px",
                background: "var(--surface-hover)",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 13,
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={15} style={{ color: "var(--accent)" }} />
                <span>
                  {l === "ta-IN"
                    ? "சர்வம் AI API சாவி (Sarvam Key)"
                    : "Connect Your Sarvam API Key"}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                {l === "ta-IN"
                  ? "உங்களிடம் உள்ள சர்வம் API சாவியை உள்ளிட்டு நேரடி bulbul:v3 குரல், saaras:v3 பேச்சு அறிதல் & sarvam-105b வணிக பகுப்பாய்வை இயக்கவும்."
                  : "Enter your Sarvam API key to activate live bulbul:v3 neural Tamil speech, saaras:v3 STT & sarvam-105b analytics."}
              </p>
              <form
                onSubmit={handleSaveSarvamKey}
                style={{ display: "flex", gap: 8, flexDirection: "column" }}
              >
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="password"
                    placeholder="Enter Sarvam API key..."
                    value={sarvamKeyInput}
                    onChange={(e) => setSarvamKeyInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "inherit",
                      fontSize: 13,
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={sarvamSaving || !sarvamKeyInput.trim()}
                  >
                    {sarvamSaving
                      ? "..."
                      : l === "ta-IN"
                      ? "இணைக்க"
                      : "Connect"}
                  </Button>
                </div>
                {sarvamMsg && (
                  <div
                    style={{
                      fontSize: 12,
                      color: sarvamMsg.ok ? "var(--good)" : "var(--warn)",
                      fontWeight: 500,
                    }}
                  >
                    {sarvamMsg.text}
                  </div>
                )}
              </form>
            </div>
            <p className="small">
              {t(
                "Server storage is isolated by signed-in owner or private demo-session cookie. Keep an export.",
              )}
            </p>
            <Button
              secondary
              onClick={() => {
                setSettings(false);
                setReset(true);
              }}
            >
              <RefreshCw size={16} />
              {t("Reset demo")}
            </Button>
          </div>
        </Modal>
      )}
      {reset && (
        <Modal title={t("Reset demo")} onClose={() => setReset(false)}>
          <p>
            {t(
              "Reset clears this workspace’s saved records. Download an export first.",
            )}
          </p>
          <div className="dialog-actions">
            <Button secondary onClick={() => setReset(false)}>
              {t("Cancel")}
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (await run({ type: "reset" })) {
                  setReset(false);
                  go("pulse");
                }
              }}
            >
              {t("Confirm reset")}
            </Button>
          </div>
        </Modal>
      )}
    </AppContext.Provider>
  );
}
function PageHead({
  eyebrow,
  title,
  detail,
  children,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {detail && <p className="page-detail">{detail}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </div>
  );
}
function NoData() {
  const { t, run, go, busy } = useApp();
  return (
    <Empty
      title={t("No records yet")}
      detail={t("Upload a CSV or explore the labelled synthetic shop.")}
    >
      <div className="inline-actions">
        <Button
          onClick={async () => {
            await run({ type: "loadSample", kind: "valid" });
          }}
          disabled={busy}
        >
          <Coffee size={18} />
          {t("Load synthetic shop")}
          <ArrowRight size={18} />
        </Button>
        <Button secondary onClick={() => go("setup")}>
          <Upload size={18} />
          {t("Start with your records")}
        </Button>
      </div>
    </Empty>
  );
}
function Pulse() {
  const { s, t, l, go } = useApp();
  const a = analyze(s.data.rows, s.context);
  return (
    <>
      <PageHead
        eyebrow={t("Today’s Pulse")}
        title={t("Your next move, with a reason.")}
        detail={t("From payment patterns to a small, measurable experiment.")}
      >
        {s.loaded && (
          <Tag tone="cyan">
            <span className="status-dot" />
            {s.context.date}
          </Tag>
        )}
      </PageHead>
      {!s.loaded ? (
        <NoData />
      ) : (
        <>
          <div className="demo-strip">
            <span>
              <Info size={15} />
              {t(
                s.sourceName.startsWith("synthetic-")
                  ? "Synthetic demonstration"
                  : "Uploaded records",
              )}{" "}
              <span className="strip-separator">/</span>{" "}
              {t("Fixed reference date")}: {s.context.date}
            </span>
            <button onClick={() => go("setup")}>
              {t("Source file")}
              <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="stat-grid">
            {[
              [t("Recorded completed value"), money(a.total), "01"],
              [t("Completed payments"), String(a.count), "02"],
              [
                t("Average completed value"),
                money(Math.round(a.average)),
                "03",
              ],
            ].map(([label, value, n]) => (
              <article className="stat-card" key={n}>
                <div className="stat-label">
                  {label}
                  <span>{n}</span>
                </div>
                <strong>{value}</strong>
                <small>
                  {t(
                    "Recorded payments only. Cash and other missing channels are outside this file.",
                  )}
                </small>
              </article>
            ))}
          </div>
          <div className="pulse-grid">
            <section className="panel chart-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{t("Completed payments")}</p>
                  <h2>{t("Payments by time window")}</h2>
                </div>
                <BarChart3 size={20} className="muted" />
              </div>
              <div
                className="chart"
                role="img"
                aria-label={a.windows
                  .map(
                    (w) =>
                      `${time(w.start)}–${time(w.end)}: ${w.count}, ${periodLabel(l, w.state)}`,
                  )
                  .join("; ")}
              >
                {a.windows.map((w, i) => (
                  <div
                    className={`bar-group ${i === 2 ? "quiet" : ""}`}
                    key={i}
                  >
                    <span className="bar-number">{w.count}</span>
                    <div className="bar-track">
                      <div
                        className="bar"
                        style={{
                          height: `${Math.max(3, (w.count / Math.max(...a.windows.map((x) => x.count), 1)) * 100)}%`,
                        }}
                      >
                        <span />
                      </div>
                    </div>
                    <strong>
                      {time(w.start)}–{time(w.end)}
                    </strong>
                    <small>
                      {w.state === "eligible"
                        ? t("Recorded payments")
                        : periodLabel(l, w.state)}
                    </small>
                  </div>
                ))}
              </div>
              <div className="chart-caption">
                <span className="legend-dot" />
                {t("Recorded completed value")}{" "}
                <span className="chart-timezone">Asia/Kolkata</span>
              </div>
            </section>
            <ReceiptCard />
          </div>
          <div className="two-col bottom-panels">
            <section className="panel compact-panel">
              <span className="round-icon">
                <ShieldCheck size={22} />
              </span>
              <div>
                <h3>{t("Same weekday. Same window. Visible evidence.")}</h3>
                <p>
                  {t(
                    "Minimum three matched periods. This is descriptive evidence, not statistical significance.",
                  )}
                </p>
              </div>
            </section>
            <section className="panel compact-panel">
              <span className="round-icon lime-bg">
                <FlaskConical size={22} />
              </span>
              <div>
                <h3>{t("Choose one small experiment")}</h3>
                <p>{t("Feasibility, not predicted demand.")}</p>
                <button
                  className="text-button"
                  onClick={() =>
                    go(s.experiments.length ? "experiment" : "actions")
                  }
                >
                  {t(
                    s.experiments.length
                      ? "Review experiment"
                      : "Compare actions",
                  )}
                  <ArrowRight size={16} />
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
function ReceiptCard() {
  const { s, t, l, go } = useApp(),
    a = analyze(s.data.rows, s.context);
  return (
    <section className="receipt-card">
      <div className="receipt-top">
        <span>
          <Receipt size={17} />
          {t("Decision Receipt")}
        </span>
        <span>#{String(s.revision).padStart(3, "0")}</span>
      </div>
      <div className="receipt-rule" />
      <p className="receipt-kicker">{t("One priority observation")}</p>
      <h2>
        {t(
          a.flag
            ? "Investigate the 4–6 PM window"
            : a.eligible
              ? "No supported dip to act on"
              : "Context needs attention",
        )}
      </h2>
      <div className="receipt-comparison">
        <div>
          <strong>{a.current.count ?? "—"}</strong>
          <small>{t("payments")}</small>
        </div>
        <span className="vs">/</span>
        <div>
          <strong>{a.baseline ?? "—"}</strong>
          <small>{t("historical median")}</small>
        </div>
      </div>
      {a.change !== null && (
        <div className="receipt-delta">
          <ArrowDownRight size={16} />
          {Math.abs(a.change).toFixed(1)}%{" "}
          {t(a.change! < 0 ? "below median" : "above median")}{" "}
          <span>
            · {a.included.length} {t("matched periods")}
          </span>
        </div>
      )}
      <p className="receipt-copy">
        {!a.eligible
          ? periodLabel(l, a.current.state)
          : t("Feasibility, not predicted demand.")}
      </p>
      <Button onClick={() => go("receipt")}>
        {t("View evidence")}
        <ArrowRight size={18} />
      </Button>
      <button className="receipt-correct" onClick={() => go("setup")}>
        <SlidersHorizontal size={15} />
        {t("Correct context")}
      </button>
      <div className="receipt-teeth" />
    </section>
  );
}

type CSVSelection = {
  csv: string;
  mapping: Record<string, string>;
  report: ImportResult;
  name: string;
};
function CsvPicker({
  onSelect,
}: {
  onSelect: (v: CSVSelection | null) => void;
}) {
  const { t } = useApp();
  const [raw, setRaw] = useState(""),
    [name, setName] = useState(""),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [fileError, setFileError] = useState("");

  const { matrix, report, parseError } = useMemo(() => {
    if (!raw) return { matrix: [] as string[][], report: null as ImportResult | null, parseError: "" };
    try {
      return {
        matrix: splitCSV(raw),
        report: parseCSV(raw, mapping),
        parseError: "",
      };
    } catch (e) {
      return {
        matrix: [] as string[][],
        report: null as ImportResult | null,
        parseError: e instanceof Error ? e.message : "invalidInput",
      };
    }
  }, [raw, mapping]);

  const error = fileError || parseError;

  useEffect(() => {
    if (!raw || !report) {
      onSelect(null);
    } else {
      onSelect({ csv: raw, mapping, report, name });
    }
  }, [raw, mapping, report, name, onSelect]);
  return (
    <div className="csv-picker">
      <label className="upload-zone">
        <Upload size={27} />
        <strong>{t("Choose CSV")}</strong>
        <span>{name || t("Payment CSV")}</span>
        <small>
          {t(
            "2 MB maximum. 10,000 rows. ISO timestamps with timezone. Amounts in rupees.",
          )}
        </small>
        <input
          aria-label={t("Choose CSV")}
          type="file"
          accept=".csv,text/csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > MAX_BYTES) {
              setFileError("fileSize");
              return;
            }
            setFileError("");
            setMapping({});
            setName(file.name);
            setRaw(await file.text());
          }}
        />
      </label>
      {raw && matrix.length > 0 && (
        <details open className="evidence-details">
          <summary>{t("Preview & map columns")}</summary>
          <div className="form-grid mapping-grid">
            {REQUIRED.map((k) => (
              <Field key={k} label={k}>
                <select
                  value={mapping[k] || k}
                  onChange={(e) =>
                    setMapping({ ...mapping, [k]: e.target.value })
                  }
                >
                  <option value="">—</option>
                  {matrix[0].map((h: string) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {matrix[0].map((h: string) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.slice(1, 4).map((r: string[], i: number) => (
                  <tr key={i}>
                    {r.map((cell: string, j: number) => (
                      <td key={j}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {error && (
        <p role="alert" className="form-error">
          {t(error)}
        </p>
      )}
      {report && <ValidationReport report={report} />}
    </div>
  );
}
function ValidationReport({ report }: { report: ImportResult }) {
  const { t } = useApp();
  return (
    <div className="validation-report">
      <div className="validation-totals">
        <Tag tone="cyan">
          {report.rows.length} {t("Valid completed rows")}
        </Tag>
        <Tag tone={report.issues.length ? "amber" : "neutral"}>
          {report.issues.length} {t("Validation issues")}
        </Tag>
        <span>
          {report.duplicates} {t("Identical duplicates removed")}
        </span>
      </div>
      {Object.keys(report.excluded).length > 0 && (
        <p className="small">
          {t("Excluded statuses")}:{" "}
          {Object.entries(report.excluded)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")}
        </p>
      )}
      {report.issues.length > 0 && (
        <details className="evidence-details">
          <summary>{t("Validation issues")}</summary>
          <p className="small">
            {t(
              "Conflicting IDs are excluded entirely. Review all issues before importing.",
            )}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("Row")}</th>
                  <th>{t("Reason")}</th>
                  <th>ID / value</th>
                </tr>
              </thead>
              <tbody>
                {report.issues.slice(0, 60).map((x, i) => (
                  <tr key={i}>
                    <td>{x.row}</td>
                    <td>{t(x.code)}</td>
                    <td className="mono">{x.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
function Samples() {
  const { t } = useApp();
  return (
    <details className="evidence-details">
      <summary>{t("Download sample files")}</summary>
      <div className="sample-list">
        {[
          ["valid", "Valid sample"],
          ["insufficient", "Insufficient history"],
          ["dirty", "Dirty data"],
          ["positive", "Positive follow-up"],
          ["negative", "Negative follow-up"],
        ].map(([kind, label]) => (
          <button
            key={kind}
            className="sample-link"
            onClick={() =>
              download(`dukaanpulse-${kind}.csv`, sampleCSV(kind), "text/csv")
            }
          >
            <FileText size={16} />
            {t(label)}
            <Download size={15} />
          </button>
        ))}
        <button
          className="sample-link"
          onClick={() =>
            download(
              "dukaanpulse-coverage.json",
              JSON.stringify(sampleContext(), null, 2),
              "application/json",
            )
          }
        >
          <FileCheck2 size={16} />
          {t("Coverage context")}
          <Download size={15} />
        </button>
      </div>
    </details>
  );
}
function Setup() {
  const { s, t, busy, run, notify } = useApp();
  const [c, setC] = useState<Context>(() => clone(s.context)),
    [reason, setReason] = useState(""),
    [selection, setSelection] = useState<CSVSelection | null>(null),
    [formError, setFormError] = useState("");
  const dates = [
    ...new Set([
      c.date,
      ...s.data.rows.map((r) => r.date),
      ...Object.keys(c.coverage),
    ]),
  ]
    .filter((d) => d <= c.date)
    .sort()
    .reverse()
    .slice(0, 20);
  function patch<K extends keyof Context>(k: K, v: Context[K]) {
    setC({ ...c, [k]: v });
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!contextSchema.safeParse(c).success || !reason.trim()) {
      setFormError("invalidInput");
      return;
    }
    if (await run({ type: "context", context: c, reason })) {
      setFormError("");
      setReason("");
      notify("Saved on server");
    }
  }
  return (
    <>
      <PageHead
        eyebrow={t("Setup & upload")}
        title={t("Setup & upload")}
        detail={t("Merchant-provided context")}
      />
      <div className="setup-grid">
        <div className="stack">
          <section className="panel">
            <div className="section-heading">
              <h2>{t("Payment CSV")}</h2>
              <Upload size={20} />
            </div>
            <CsvPicker onSelect={setSelection} />
            <p className="small muted">
              {t(
                "Importing clears prior coverage confirmations. Confirm them again.",
              )}
            </p>
            <Button
              disabled={busy || !selection?.report.rows.length}
              onClick={async () => {
                if (
                  selection &&
                  (await run({
                    type: "upload",
                    csv: selection.csv,
                    mapping: selection.mapping,
                    name: selection.name,
                  }))
                )
                  notify("Saved on server");
              }}
            >
              {t("Import validated rows")}
              <ArrowRight size={17} />
            </Button>
            <Samples />
          </section>
          <section className="panel">
            <h3>{t("Synthetic demonstration")}</h3>
            <p className="small muted">
              {t("Fixed reference date")}: 2026-11-14
            </p>
            <div className="sample-list">
              {[
                ["valid", "Load synthetic shop"],
                ["insufficient", "Insufficient history"],
                ["dirty", "Dirty data"],
              ].map(([kind, label]) => (
                <Button
                  secondary
                  disabled={busy}
                  key={kind}
                  onClick={async () => {
                    await run({
                      type: "loadSample",
                      kind: kind as "valid" | "insufficient" | "dirty",
                    });
                  }}
                >
                  {t(label)}
                  <ArrowRight size={16} />
                </Button>
              ))}
            </div>
          </section>
          {s.loaded && (
            <section className="panel">
              <p className="eyebrow">{t("Source file")}</p>
              <h3 className="break-word">{s.sourceName}</h3>
              <ValidationReport report={s.data} />
            </section>
          )}
        </div>
        <form className="stack" onSubmit={save}>
          <section className="panel">
            <div className="section-heading">
              <h2>{t("Merchant-provided context")}</h2>
              <Store size={21} />
            </div>
            <div className="form-grid">
              <Field label={t("Shop name")}>
                <input
                  value={c.shop}
                  maxLength={80}
                  required
                  onChange={(e) => patch("shop", e.target.value)}
                />
              </Field>
              <Field label={t("Reference date")}>
                <input
                  type="date"
                  value={c.date}
                  required
                  onChange={(e) => patch("date", e.target.value)}
                />
              </Field>
              <Field label={t("Regular opening")}>
                <input
                  type="time"
                  value={time(c.open)}
                  required
                  onChange={(e) => {
                    if (e.target.value) patch("open", minute(e.target.value));
                  }}
                />
              </Field>
              <Field label={t("Regular closing")}>
                <input
                  type="time"
                  value={time(c.close)}
                  required
                  onChange={(e) => {
                    if (e.target.value) patch("close", minute(e.target.value));
                  }}
                />
              </Field>
              <Field label={t("Experiment date")}>
                <input
                  type="date"
                  value={c.testDate}
                  required
                  min={addDays(c.date || "2026-11-14", 1)}
                  onChange={(e) => patch("testDate", e.target.value)}
                />
              </Field>
              <Field label={t("Review date")}>
                <input
                  type="date"
                  value={c.reviewDate}
                  required
                  min={c.testDate}
                  onChange={(e) => patch("reviewDate", e.target.value)}
                />
              </Field>
              <Field label={t("Goal")}>
                <select
                  value={c.goal}
                  onChange={(e) =>
                    patch("goal", e.target.value as Context["goal"])
                  }
                >
                  <option value="count">{t("Increase payment count")}</option>
                  <option value="average">
                    {t("Increase average payment value")}
                  </option>
                </select>
              </Field>
              <Field label={`${t("Flagging threshold")} (%)`}>
                <input
                  type="number"
                  min={5}
                  max={90}
                  value={c.threshold}
                  onChange={(e) => patch("threshold", +e.target.value)}
                />
              </Field>
            </div>
            <p className="small muted">
              {t("A bundle does not establish more customers or payments.")}
            </p>
          </section>
          <section className="panel">
            <h2>{t("Coverage & date exceptions")}</h2>
            <p className="small muted">
              {t(
                "Confirm only dates and hours actually covered by your upload.",
              )}
            </p>
            {dates.map((date) => {
              const cov = c.coverage[date] || {
                  state: "unknown",
                  start: 720,
                  end: 1200,
                },
                ex = c.exceptions[date];
              return (
                <details className="date-detail" key={date}>
                  <summary>
                    <span>
                      {date}
                      {date === c.date && (
                        <Tag tone="cyan">{t("Current window")}</Tag>
                      )}
                    </span>
                    <Tag tone={cov.state === "confirmed" ? "lime" : "amber"}>
                      {t(
                        cov.state === "confirmed"
                          ? "Complete upload coverage"
                          : "Coverage unknown",
                      )}
                    </Tag>
                  </summary>
                  <div className="date-detail-content">
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={cov.state === "confirmed"}
                        onChange={(e) =>
                          patch("coverage", {
                            ...c.coverage,
                            [date]: {
                              ...cov,
                              state: e.target.checked ? "confirmed" : "unknown",
                            },
                          })
                        }
                      />
                      {t("Complete upload coverage")}
                    </label>
                    <div className="form-grid">
                      <Field label={t("Coverage starts")}>
                        <input
                          type="time"
                          value={time(cov.start)}
                          onChange={(e) => {
                            if (e.target.value)
                              patch("coverage", {
                                ...c.coverage,
                                [date]: {
                                  ...cov,
                                  start: minute(e.target.value),
                                },
                              });
                          }}
                        />
                      </Field>
                      <Field label={t("Coverage ends")}>
                        <input
                          type="time"
                          value={time(cov.end)}
                          onChange={(e) => {
                            if (e.target.value)
                              patch("coverage", {
                                ...c.coverage,
                                [date]: { ...cov, end: minute(e.target.value) },
                              });
                          }}
                        />
                      </Field>
                    </div>
                    <label className="check-field">
                      <input
                        type="checkbox"
                        checked={!!ex}
                        onChange={(e) => {
                          const next = { ...c.exceptions };
                          if (e.target.checked)
                            next[date] = {
                              closed: false,
                              open: c.open,
                              close: c.close,
                              exclude: false,
                              reason: "",
                            };
                          else delete next[date];
                          patch("exceptions", next);
                        }}
                      />
                      {t("Opening override")} / {t("Exclude exceptional day")}
                    </label>
                    {ex && (
                      <>
                        <div className="form-grid">
                          <Field label={t("Opening override")}>
                            <input
                              type="time"
                              value={time(ex.open)}
                              onChange={(e) => {
                                if (e.target.value)
                                  patch("exceptions", {
                                    ...c.exceptions,
                                    [date]: {
                                      ...ex,
                                      open: minute(e.target.value),
                                    },
                                  });
                              }}
                            />
                          </Field>
                          <Field label={t("Closing override")}>
                            <input
                              type="time"
                              value={time(ex.close)}
                              onChange={(e) => {
                                if (e.target.value)
                                  patch("exceptions", {
                                    ...c.exceptions,
                                    [date]: {
                                      ...ex,
                                      close: minute(e.target.value),
                                    },
                                  });
                              }}
                            />
                          </Field>
                        </div>
                        <label className="check-field">
                          <input
                            type="checkbox"
                            checked={ex.closed}
                            onChange={(e) =>
                              patch("exceptions", {
                                ...c.exceptions,
                                [date]: { ...ex, closed: e.target.checked },
                              })
                            }
                          />
                          {t("Closed all day")}
                        </label>
                        <label className="check-field">
                          <input
                            type="checkbox"
                            checked={ex.exclude}
                            onChange={(e) =>
                              patch("exceptions", {
                                ...c.exceptions,
                                [date]: { ...ex, exclude: e.target.checked },
                              })
                            }
                          />
                          {t("Exclude exceptional day")}
                        </label>
                        <Field label={t("Exception reason")}>
                          <input
                            maxLength={200}
                            required={ex.exclude}
                            value={ex.reason}
                            onChange={(e) =>
                              patch("exceptions", {
                                ...c.exceptions,
                                [date]: { ...ex, reason: e.target.value },
                              })
                            }
                          />
                        </Field>
                      </>
                    )}
                  </div>
                </details>
              );
            })}
            <p className="small muted">
              {t("No coverage confirmation means unknown, never zero.")}
            </p>
          </section>
          <section className="save-context">
            <Field label={t("Why did this change?")}>
              <input
                value={reason}
                maxLength={240}
                required
                placeholder={t("Owner correction")}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            {formError && (
              <p role="alert" className="form-error">
                {t(formError)}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              <Check size={17} />
              {t("Save context")}
            </Button>
          </section>
        </form>
      </div>
    </>
  );
}
function Evidence() {
  const { s, t, l, go } = useApp();
  if (!s.loaded) return <NoData />;
  const a = analyze(s.data.rows, s.context);
  return (
    <>
      <PageHead
        eyebrow={`02 / ${t("Revision")} ${s.revision}`}
        title={t("Decision Receipt")}
        detail={t("Same weekday. Same window. Visible evidence.")}
      >
        <Button
          secondary
          onClick={() =>
            download(
              "dukaanpulse-receipt-history.json",
              JSON.stringify(
                {
                  receipt: s.revisions.at(-1),
                  experiments: s.experiments,
                  rejections: s.rejections,
                },
                null,
                2,
              ),
              "application/json",
            )
          }
        >
          <Download size={17} />
          {t("Export receipt & history")}
        </Button>
      </PageHead>
      <div className="evidence-grid">
        <div className="stack">
          <section className="panel evidence-main">
            <div className="section-heading">
              <Tag tone={a.eligible ? "cyan" : "amber"}>
                {t(a.eligible ? "Included" : "Context needs attention")}
              </Tag>
              <span className="mono muted">
                DP / {String(s.revision).padStart(3, "0")}
              </span>
            </div>
            <h2 className="evidence-title">
              {t(
                a.flag
                  ? "Investigate the 4–6 PM window"
                  : a.eligible
                    ? "No supported dip to act on"
                    : "Context needs attention",
              )}
            </h2>
            <p className="evidence-briefing">{briefing(a, s.context, l)}</p>
            <div className="metric-equation">
              <div>
                <small>{t("Current window")}</small>
                <strong>{a.current.count ?? "—"}</strong>
                <span>{s.context.date}</span>
              </div>
              <span className="equation-divider">/</span>
              <div>
                <small>{t("Historical baseline")}</small>
                <strong>{a.baseline ?? "—"}</strong>
                <span>
                  {a.included.length} {t("matched periods")}
                </span>
              </div>
              <span className="equation-divider">=</span>
              <div>
                <small>{t("Change from baseline")}</small>
                <strong className="cyan-text">
                  {a.change === null ? "—" : `${a.change.toFixed(1)}%`}
                </strong>
                <span>{t("No forecast")}</span>
              </div>
            </div>
            <div className="inline-actions">
              <Button onClick={() => go("actions")}>
                {t("Compare actions")}
                <ArrowRight size={17} />
              </Button>
              <Button secondary onClick={() => go("setup")}>
                <SlidersHorizontal size={17} />
                {t("Correct context")}
              </Button>
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>{t("Calculation & source")}</h2>
              <Search size={19} />
            </div>
            <div className="table-scroll">
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>{t("Date")}</th>
                    <th>16:00–18:00</th>
                    <th>{t("Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="current-row">
                    <td>
                      {a.current.date}
                      <small>{t("Current window")}</small>
                    </td>
                    <td>{a.current.count ?? "—"}</td>
                    <td>
                      <Tag
                        tone={a.current.state === "eligible" ? "cyan" : "amber"}
                      >
                        {periodLabel(l, a.current.state, a.current.count)}
                      </Tag>
                    </td>
                  </tr>
                  {a.history.map((p) => (
                    <tr key={p.date}>
                      <td>{p.date}</td>
                      <td>{p.count ?? "—"}</td>
                      <td>
                        {periodLabel(l, p.state, p.count)}
                        {p.reason &&
                          !["closed", "partial", "unknown"].includes(
                            p.reason,
                          ) && <small>{p.reason}</small>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="calculation-note">
              <p>
                <strong>{t("Historical baseline")}: </strong>median(
                {a.included
                  .map((p) => p.count)
                  .sort((x, y) => x! - y!)
                  .join(", ") || "—"}
                ) = {a.baseline ?? "—"}
              </p>
              <p>
                {t("Flagging threshold")}: {s.context.threshold}%
              </p>
              <p>
                {t(
                  "Minimum three matched periods. This is descriptive evidence, not statistical significance.",
                )}
              </p>
            </div>
            <details className="evidence-details">
              <summary>{t("What is missing?")}</summary>
              <p>{briefing(a, s.context, l, "missing")}</p>
              <p className="small">
                {t("Source file")}: {s.sourceName}.{" "}
                {t("All times Asia/Kolkata")}.
              </p>
              <ValidationReport report={s.data} />
            </details>
          </section>
          <section className="panel">
            <h2>{t("Revisions")}</h2>
            <p className="small muted">
              {t(
                "Every meaningful change invalidates earlier approvals and generated content.",
              )}
            </p>
            <div className="revision-list">
              {[...s.revisions].reverse().map((r) => (
                <div key={r.revision}>
                  <span className="revision-number">
                    {String(r.revision).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{t(r.reason)}</strong>
                    <small>
                      {new Date(r.at).toLocaleString(l, {
                        timeZone: "Asia/Kolkata",
                      })}
                    </small>
                    <small>
                      {time(r.context.exceptions[r.context.date]?.open ?? r.context.open)}–{time(r.context.exceptions[r.context.date]?.close ?? r.context.close)} ·{" "}
                      {t(
                        r.context.goal === "count"
                          ? "Increase payment count"
                          : "Increase average payment value",
                      )}{" "}
                      · {money(r.context.offer.cost)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="stack">
          <BriefingPanel key={`${s.revision}-${l}`} />
          <VoiceCorrection />
        </div>
      </div>
    </>
  );
}
function BriefingPanel() {
  const { s, t, l, notify, provider } = useApp(),
    a = analyze(s.data.rows, s.context);
  const [pending, setPending] = useState(false),
    [question, setQuestion] = useState(""),
    [content, setContent] = useState(""),
    [source, setSource] = useState("Rule-based explanation"),
    [device, setDevice] = useState(false),
    [audioUrl, setAudioUrl] = useState("");
  const audio = useRef<HTMLAudioElement>(null),
    lock = useRef(false);

  useEffect(() => {
    const audioEl = audio.current;
    return () => {
      audioEl?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function request(kind: "audio" | "explain", focus = "summary", q = "") {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    const r = s.revision;
    const reqLang = l;
    try {
      const res = await fetch("/api/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: r,
          lang: l,
          kind,
          focus,
          question: q,
        }),
      });
      const d = (await res.json()) as ProviderResponse;
      if (s.revision !== r || l !== reqLang) return;
      setContent(d.text || briefing(a, s.context, l, focus));
      if (d.source === "sarvam") {
        if (kind === "audio") {
          setAudioUrl(`data:${d.mime};base64,${d.audio}`);
          setSource(d.cached ? "Cached Sarvam audio" : "Sarvam audio");
          setDevice(false);
          requestAnimationFrame(() => audio.current?.play().catch(() => {}));
        } else
          setSource(
            d.cached ? "Cached explanation" : "Sarvam-assisted explanation",
          );
      } else {
        setSource("Rule-based explanation");
        setDevice(kind === "audio");
        notify(
          d.reason === "notConfigured"
            ? "Sarvam is not configured. Analytics still work."
            : d.reason === "rateLimit"
              ? "rateLimit"
              : "Provider unavailable. Using the rule-based explanation.",
        );
      }
    } catch {
      setContent(briefing(a, s.context, l, focus));
      setSource("Rule-based explanation");
      setDevice(kind === "audio");
      notify("Provider unavailable. Using the rule-based explanation.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function speak() {
    const voices = window.speechSynthesis?.getVoices() || [],
      voice = voices.find((v) =>
        v.lang.toLowerCase().startsWith(l.slice(0, 2)),
      );
    if (!window.speechSynthesis || !voice) {
      notify("Speech is unavailable on this device. Read the receipt below.");
      return;
    }
    const u = new SpeechSynthesisUtterance(
      content || briefing(a, s.context, l),
    );
    u.lang = l;
    u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSource("Device speech fallback");
  }
  return (
    <section className="panel briefing-panel">
      <span className="round-icon navy-bg">
        <Volume2 size={23} />
      </span>
      <h2>{t("Listen to this receipt")}</h2>
      <p className="small muted">English · हिन्दी · தமிழ்</p>
      <Button onClick={() => request("audio")} disabled={pending}>
        {pending ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <Volume2 size={17} />
        )}{" "}
        {t("Listen to this receipt")}
      </Button>
      {audioUrl && (
        <audio
          ref={audio}
          src={audioUrl}
          controls
          aria-label={t("Listen to this receipt")}
        />
      )}
      <div className="question-chips">
        {[
          ["dates", "Why these dates?"],
          ["missing", "What is missing?"],
          ["economics", "Is the offer feasible?"],
        ].map(([focus, label]) => (
          <button
            key={focus}
            onClick={() => {
              setContent(briefing(a, s.context, l, focus));
              setSource("Rule-based explanation");
            }}
          >
            {t(label)}
            <ChevronRight size={14} />
          </button>
        ))}
      </div>
      <form
        className="question-form"
        onSubmit={(e) => {
          e.preventDefault();
          request("explain", "summary", question);
        }}
      >
        <Field label={t("Ask about this evidence")}>
          <input
            value={question}
            maxLength={300}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("Why these dates?")}
          />
        </Field>
        <Button secondary type="submit" disabled={pending || !question.trim()}>
          {t("Ask")}
          <ArrowUpRight size={16} />
        </Button>
      </form>
      {(content || !provider?.configured) && (
        <div className="explanation">
          <Tag>{t(source)}</Tag>
          <p>{content || briefing(a, s.context, l)}</p>
          {source === "Sarvam-assisted explanation" && (
            <p className="small">
              {t(
                "Sarvam selects the explanation focus. Validated templates supply every figure.",
              )}
            </p>
          )}
        </div>
      )}
      {device && (
        <div className="stack">
          <Button secondary onClick={speak}>
            {t("Listen using device voice")}
          </Button>
          <small className="muted">
            {t(
              "No provider credits used. Voice availability depends on this device.",
            )}
          </small>
        </div>
      )}
    </section>
  );
}
function VoiceCorrection() {
  const { s, t, l, run, busy, notify, provider } = useApp();
  const [text, setText] = useState(""),
    [correction, setCorrection] = useState<Correction | null>(null),
    [confirm, setConfirm] = useState(false),
    [recording, setRecording] = useState(false),
    [working, setWorking] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    stream = useRef<MediaStream | null>(null),
    recordRevision = useRef(0);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      recorder.current?.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  async function start() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const chunks: BlobPart[] = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const r = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : {},
      );
      recorder.current = r;
      recordRevision.current = s.revision;
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = async () => {
        setRecording(false);
        stream.current?.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
        setWorking(true);
        try {
          const form = new FormData();
          form.append(
            "file",
            new Blob(chunks, { type: r.mimeType }),
            "correction.webm",
          );
          form.append("revision", String(recordRevision.current));
          form.append("lang", l);
          const res = await fetch("/api/speech", {
            method: "POST",
            body: form,
          });
          const d = (await res.json()) as ProviderResponse;
          if (!res.ok) {
            notify(
              d.error === "notConfigured"
                ? "Sarvam is not configured. Analytics still work."
                : "Provider unavailable. Using the rule-based explanation.",
            );
            return;
          }
          setText(d.transcript || "");
          setCorrection(d.correction || null);
          if (d.correction) setConfirm(true);
          else notify("Could not identify one safe correction. Use the form.");
        } catch {
          notify("Microphone unavailable. Use the text field.");
        } finally {
          setWorking(false);
        }
      };
      r.start();
      setRecording(true);
      timer.current = setTimeout(() => r.stop(), 15000);
    } catch {
      notify("Microphone unavailable. Use the text field.");
    }
  }
  function interpret() {
    const c = interpretCorrection(text);
    setCorrection(c);
    if (c) setConfirm(true);
    else notify("Could not identify one safe correction. Use the form.");
  }
  function description() {
    if (!correction) return "";
    return correction.field === "budget"
      ? `${t("Budget")}: ${money(correction.value)}`
      : correction.field === "close"
        ? `${t("Closing time")}: ${time(correction.value)} · ${s.context.date}`
        : correction.field === "available"
          ? `${t("Availability")}: ${t(correction.value ? "Available" : "Blocked")}`
          : t(
              correction.value === "count"
                ? "Increase payment count"
                : "Increase average payment value",
            );
  }
  async function apply() {
    if (!correction) return;
    const c = clone(s.context);
    if (correction.field === "budget") c.offer.budget = correction.value;
    if (correction.field === "close")
      c.exceptions[c.date] = {
        ...(c.exceptions[c.date] || {
          closed: false,
          open: c.open,
          close: c.close,
          exclude: false,
          reason: "",
        }),
        close: correction.value,
      };
    if (correction.field === "available") c.offer.available = correction.value;
    if (correction.field === "goal") c.goal = correction.value;
    if (
      await run({
        type: "context",
        context: c,
        reason: `${t("Merchant-provided context")}: ${text.slice(0, 160)}`,
      })
    ) {
      setConfirm(false);
      setCorrection(null);
      notify("Saved on server");
    }
  }
  return (
    <section className="panel">
      <div className="section-heading">
        <h2>{t("Speak a correction")}</h2>
        <Mic size={21} />
      </div>
      <p className="small muted">
        {t("Record up to 15 seconds. Nothing changes until you confirm.")}
      </p>
      <Button
        secondary
        disabled={working || (!recording && !provider?.configured)}
        onClick={() => (recording ? recorder.current?.stop() : start())}
      >
        {recording ? <Pause size={17} /> : <Mic size={17} />}{" "}
        {t(recording ? "Stop recording" : "Start recording")}
      </Button>
      <form
        className="stack correction-form"
        onSubmit={(e) => {
          e.preventDefault();
          interpret();
        }}
      >
        <Field label={t("Type a correction instead")}>
          <textarea
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              l === "hi-IN"
                ? "बजट 200"
                : l === "ta-IN"
                  ? "பட்ஜெட் 200"
                  : "Budget 200"
            }
          />
        </Field>
        <Button secondary type="submit" disabled={!text.trim() || working}>
          {t("Interpret correction")}
        </Button>
      </form>
      {confirm && (
        <Modal
          title={t("Confirm a spoken correction")}
          onClose={() => setConfirm(false)}
        >
          <p className="muted">
            {t("I heard")}: “{text}”
          </p>
          <p className="readback-value">{description()}</p>
          <p>{t("This is not an approval. Confirm the change explicitly.")}</p>
          <div className="dialog-actions">
            <Button secondary onClick={() => setConfirm(false)}>
              {t("Cancel")}
            </Button>
            <Button disabled={busy} onClick={apply}>
              {t("Apply correction")}
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

const ACTIONS: [Action, string, string, typeof Search][] = [
  [
    "investigate",
    "Investigate first",
    "Observe the window and record context. No customer offer.",
    Search,
  ],
  [
    "existing",
    "Promote existing offer",
    "Use the current selling price without a new discount.",
    Store,
  ],
  [
    "discount",
    "Owner-defined discount",
    "Test a bounded discount with explicit limits.",
    FlaskConical,
  ],
];
function Actions() {
  const { s, t, l, busy, run, action, setAction, notify, go } = useApp();
  const [o, setO] = useState(() => clone(s.context.offer)),
    [approve, setApprove] = useState(false),
    [checked, setChecked] = useState(false),
    [reject, setReject] = useState(false),
    [rejection, setRejection] = useState("");
  if (!s.loaded) return <NoData />;
  const a = analyze(s.data.rows, s.context),
    ec = economics(s.context.offer, action),
    dirty = JSON.stringify(o) !== JSON.stringify(s.context.offer),
    canApprove =
      (action === "investigate" || (ec.eligible && a.flag && a.eligible)) &&
      !dirty &&
      !s.experiments.some(
        (e) =>
          e.revision === s.revision &&
          !["Stopped", "Skipped"].includes(e.stage),
      );
  const chosen = ACTIONS.find((x) => x[0] === action)!;
  const draft: Experiment = {
    id: "preview",
    revision: s.revision,
    context: s.context,
    analysis: a,
    action,
    stage: "Approved",
    createdAt: "",
    invalidated: false,
    events: [],
  };
  function num(key: keyof typeof o, label: string, rupees = true) {
    return (
      <Field key={key} label={t(label)}>
        <input
          type="number"
          min={0}
          step={rupees ? "0.01" : "1"}
          max={rupees ? 1000000 : 10000}
          value={rupees ? (o[key] as number) / 100 : (o[key] as number)}
          onChange={(e) =>
            setO({
              ...o,
              [key]: rupees
                ? Math.round(+e.target.value * 100)
                : +e.target.value,
            })
          }
        />
      </Field>
    );
  }
  return (
    <>
      <PageHead
        eyebrow={t("Compare actions")}
        title={t("Choose one small experiment")}
        detail={t("Feasibility, not predicted demand.")}
      />
      <div className="goal-strip">
        <span className="round-icon">
          <Activity size={19} />
        </span>
        <div>
          <small>{t("Goal")}</small>
          <strong>
            {t(
              s.context.goal === "count"
                ? "Increase payment count"
                : "Increase average payment value",
            )}
          </strong>
        </div>
        <Tag>{t("No forecast")}</Tag>
      </div>
      <div className="action-cards">
        {ACTIONS.filter(
          ([id]) => id === "investigate" || s.context.offer.available,
        ).map(([id, title, desc, Icon]) => {
          const e = economics(s.context.offer, id),
            blocked =
              id !== "investigate" && (!e.eligible || !a.flag || !a.eligible);
          return (
            <button
              key={id}
              className={`action-card ${action === id ? "selected" : ""} ${blocked ? "blocked" : ""}`}
              onClick={() => setAction(id)}
              aria-pressed={action === id}
            >
              <div className="action-card-top">
                <span className="round-icon">
                  <Icon size={23} />
                </span>
                <span className="radio-indicator">
                  {action === id && <Check size={14} />}
                </span>
              </div>
              <h2>{t(title)}</h2>
              <p>{t(desc)}</p>
              <Tag
                tone={blocked ? "amber" : action === id ? "lime" : "neutral"}
              >
                {t(
                  blocked
                    ? "Blocked"
                    : action === id
                      ? "Selected"
                      : "Available",
                )}
              </Tag>
            </button>
          );
        })}
      </div>
      {!s.context.offer.available && (
        <div className="alert amber">
          <Info size={18} />
          {t("Unavailable items have no eligible offer.")}
        </div>
      )}
      <div className="two-col action-economics">
        <section className="panel">
          <div className="section-heading">
            <h2>{t("Item & economics")}</h2>
            <SlidersHorizontal size={21} />
          </div>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await run({
                  type: "context",
                  context: { ...s.context, offer: o },
                  reason:
                    "Merchant-provided economics / " + t("Item & economics"),
                })
              )
                notify("Saved on server");
            }}
          >
            <div className="form-grid">
              {(["en-IN", "hi-IN", "ta-IN"] as Lang[]).map((lang, i) => (
                <Field
                  key={lang}
                  label={t(
                    [
                      "Item name (English)",
                      "Item name (Hindi)",
                      "Item name (Tamil)",
                    ][i],
                  )}
                >
                  <input
                    required
                    maxLength={80}
                    value={o.name[lang]}
                    onChange={(e) =>
                      setO({
                        ...o,
                        name: { ...o.name, [lang]: e.target.value },
                      })
                    }
                  />
                </Field>
              ))}
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={o.available}
                  onChange={(e) => setO({ ...o, available: e.target.checked })}
                />
                {t("Item available")}
              </label>
              {num("price", "Selling price (₹)")}
              {num("cost", "Variable cost (₹)")}
              {num("discount", "Discount (₹)")}
              {num("additional", "Additional cost per redemption (₹)")}
              {num("quantity", "Available quantity", false)}
              {num("limit", "Redemption limit", false)}
              {num("budget", "Discount budget (₹)")}
              {num("floor", "Contribution floor (₹)")}
              {num("referenceVolume", "Reference redemptions", false)}
            </div>
            <Button secondary type="submit" disabled={busy || !dirty}>
              {t("Save economics")}
              <Check size={17} />
            </Button>
            {dirty && (
              <p className="form-error">
                {t("Save economics before approval.")}
              </p>
            )}
          </form>
        </section>
        <div className="stack">
          <section className="panel economics-receipt">
            <p className="eyebrow">{t(chosen[1])}</p>
            {action === "investigate" ? (
              <>
                <h2>{t("Investigate first")}</h2>
                <p>{t(chosen[2])}</p>
              </>
            ) : (
              <>
                <h2>{s.context.offer.name[l]}</h2>
                <div className="contribution-number">
                  {money(ec.contribution)}
                  <small>{t("Contribution per redemption")}</small>
                </div>
                <div className="formula">
                  {money(s.context.offer.price)} − {money(ec.discount)} −{" "}
                  {money(s.context.offer.cost)} −{" "}
                  {money(s.context.offer.additional)} ={" "}
                  <strong>{money(ec.contribution)}</strong>
                </div>
                <div className="facts">
                  <div>
                    <span>{t("Maximum discount exposure")}</span>
                    <strong>{money(ec.exposure)}</strong>
                  </div>
                  <div>
                    <span>{t("Discount budget (₹)")}</span>
                    <strong>{money(s.context.offer.budget)}</strong>
                  </div>
                  <div>
                    <span>{t("Redemption limit")}</span>
                    <strong>
                      {s.context.offer.limit} / {s.context.offer.quantity}
                    </strong>
                  </div>
                </div>
                <p className="small muted">
                  {t(
                    "Before fixed costs. This does not establish overall profitability.",
                  )}
                </p>
                <details className="evidence-details">
                  <summary>{t("Scenario threshold")}</summary>
                  <p>
                    <strong>{ec.requiredVolume ?? "—"}</strong>{" "}
                    {t("redemptions to preserve reference contribution")}
                  </p>
                  <p className="small">
                    {s.context.offer.referenceVolume} ×{" "}
                    {money(ec.referenceContribution)} ÷ {money(ec.contribution)}
                  </p>
                  <p className="small muted">
                    {t(
                      "Assumes unchanged price, cost and product mix. This is not predicted demand.",
                    )}
                  </p>
                  {ec.requiredVolume !== null && ec.requiredVolume > s.context.offer.limit && <p className="form-error">{t("Scenario threshold exceeds the redemption limit. This capped test cannot preserve the reference contribution.")}</p>}
                </details>
                {ec.reasons.map((r) => (
                  <p key={r} className="form-error">
                    <AlertTriangle size={16} />
                    {t(
                      r === "unavailable"
                        ? "Unavailable items have no eligible offer."
                        : r === "floor"
                          ? "Contribution below your floor"
                          : r === "stock"
                            ? "Redemption limit exceeds stock"
                            : "Discount exposure exceeds budget",
                    )}
                  </p>
                ))}
                {(!a.eligible || !a.flag) && (
                  <p className="form-error">
                    {t("Evidence is incomplete or no dip meets the threshold.")}
                  </p>
                )}
              </>
            )}
            <div className="approval-footer">
              <Button
                disabled={busy || !canApprove}
                onClick={() => {
                  setChecked(false);
                  setApprove(true);
                }}
              >
                <ShieldCheck size={17} />
                {t("Approve this experiment")}
              </Button>
              <button
                className="text-button muted"
                onClick={() => setReject(true)}
              >
                {t("Reject action")}
              </button>
            </div>
          </section>
          <section className="panel compact-panel">
            <Info size={22} />
            <p>
              {t("A bundle does not establish more customers or payments.")}
            </p>
          </section>
        </div>
      </div>
      {approve && (
        <Modal title={t("Approval readback")} onClose={() => setApprove(false)}>
          <div className="stack">
            <Tag tone="cyan">
              {t("Revision")} {s.revision}
            </Tag>
            <h3>{t(chosen[1])}</h3>
            <p className="terms-readback">{approvedTerms(draft, l)}</p>
            <p>
              {t("Goal")}:{" "}
              <strong>
                {t(
                  s.context.goal === "count"
                    ? "Increase payment count"
                    : "Increase average payment value",
                )}
              </strong>
            </p>
            {action !== "investigate" && (
              <p>
                {t("Maximum discount exposure")}: {money(ec.exposure)}.{" "}
                {t("Contribution per redemption")}: {money(ec.contribution)}.
              </p>
            )}
            <label className="check-field approval-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              {t("I approve these exact terms.")}
            </label>
            <div className="dialog-actions">
              <Button secondary onClick={() => setApprove(false)}>
                {t("Cancel")}
              </Button>
              <Button
                disabled={busy || !checked}
                onClick={async () => {
                  if (
                    await run({ type: "approve", revision: s.revision, action })
                  ) {
                    setApprove(false);
                    notify("Saved experiment");
                    go("experiment");
                  }
                }}
              >
                {t("Confirm approval")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {reject && (
        <Modal title={t("Reject action")} onClose={() => setReject(false)}>
          <Field label={t("Reason for rejection")}>
            <textarea
              value={rejection}
              maxLength={240}
              onChange={(e) => setRejection(e.target.value)}
            />
          </Field>
          <div className="dialog-actions">
            <Button secondary onClick={() => setReject(false)}>
              {t("Cancel")}
            </Button>
            <Button
              disabled={busy || !rejection.trim()}
              onClick={async () => {
                if (
                  await run({
                    type: "reject",
                    revision: s.revision,
                    action,
                    reason: rejection,
                  })
                ) {
                  setReject(false);
                  setRejection("");
                  notify("Saved on server");
                }
              }}
            >
              {t("Save rejection")}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
async function embeddedPoster(e: Experiment, l: Lang) {
  let html = posterHTML(e, l);
  for (const font of ["Tamil", "Hindi"]) {
    const r = await fetch(`/fonts/${font}.ttf`);
    if (!r.ok) throw Error("font");
    const bytes = new Uint8Array(await r.arrayBuffer());
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    html = html.replace(
      `/fonts/${font}.ttf`,
      `data:font/ttf;base64,${btoa(s)}`,
    );
  }
  return html;
}
function ExperimentScreen() {
  const { s, t, l, busy, run, go, notify } = useApp();
  const [ran, setRan] = useState(false),
    [preparing, setPreparing] = useState(false);
  const e = s.experiments.at(-1);
  if (!e)
    return (
      <>
        <PageHead eyebrow={t("Experiment")} title={t("Experiment")} />
        <Empty
          title={t("No experiment yet")}
          detail={t("Choose and approve an action first.")}
        >
          <Button onClick={() => go("actions")}>
            {t("Compare actions")}
            <ArrowRight size={17} />
          </Button>
        </Empty>
      </>
    );
  const ec = economics(e.context.offer, e.action);
  async function prepare() {
    if (preparing) return;
    setPreparing(true);
    try {
      const html = await embeddedPoster(e!, l);
      if (e!.stage === "Approved" || e!.stage === "Prepared") {
        if (
          !(await run({ type: "stage", id: e!.id, stage: "Prepared", lang: l }))
        )
          return;
      }
      download(`dukaanpulse-${e!.id.slice(0, 8)}-${l}.html`, html, "text/html");
      notify("Materials created does not mean the experiment ran.");
    } catch {
      notify("network");
    } finally {
      setPreparing(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow={`04 / DP-${e.id.slice(0, 8)}`}
        title={t("Approved experiment")}
        detail={`${t("Revision")} ${e.revision} · ${e.context.shop}`}
      >
        <Status e={e} />
      </PageHead>
      <div className="stage-track">
        {["Draft", "Approved", "Prepared", "Ran", "Reviewed"].map(
          (stage, i) => (
            <div
              key={stage}
              className={
                ["Approved", "Prepared", "Ran", "Reviewed"].indexOf(e.stage) >=
                i - 1
                  ? "reached"
                  : ""
              }
            >
              <span>
                {["Approved", "Prepared", "Ran", "Reviewed"].indexOf(e.stage) >=
                i - 1 ? (
                  <Check size={15} />
                ) : (
                  i + 1
                )}
              </span>
              <strong>{t(stage)}</strong>
            </div>
          ),
        )}
      </div>
      {e.invalidated && (
        <div className="alert amber">
          <AlertTriangle size={20} />
          {t("Approval invalidated by a newer revision.")}
        </div>
      )}
      <div className="two-col experiment-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>{t("Approved terms")}</h2>
            <ShieldCheck size={23} />
          </div>
          <p className="experiment-action">
            {t(ACTIONS.find((a) => a[0] === e.action)![1])}
          </p>
          <h2 className="offer-name">
            {e.action === "investigate"
              ? t("Investigate first")
              : e.context.offer.name[l]}
          </h2>
          {e.action !== "investigate" && (
            <div className="offer-price">
              {money(e.context.offer.price - ec.discount)}
              <span>{t("Before fixed costs")}</span>
            </div>
          )}
          <p className="terms-readback">{approvedTerms(e, l)}</p>
          <div className="facts">
            <div>
              <span>{t("Goal")}</span>
              <strong>
                {t(
                  e.context.goal === "count"
                    ? "Increase payment count"
                    : "Increase average payment value",
                )}
              </strong>
            </div>
            <div>
              <span>{t("Review date")}</span>
              <strong>{e.context.reviewDate}</strong>
            </div>
            {e.action !== "investigate" && (
              <>
                <div>
                  <span>{t("Contribution per redemption")}</span>
                  <strong>{money(ec.contribution)}</strong>
                </div>
                <div>
                  <span>{t("Maximum discount exposure")}</span>
                  <strong>{money(ec.exposure)}</strong>
                </div>
              </>
            )}
          </div>
          <p className="small muted">
            {t("Customer messaging and payments are not executed.")}
          </p>
        </section>
        <div className="stack">
          <section className="panel poster-section">
            <div className="mini-poster">
              <div className="mini-poster-brand">{e.context.shop}</div>
              <div className="mini-poster-rule" />
              <h3>
                {e.action === "investigate"
                  ? t("Investigate first")
                  : e.context.offer.name[l]}
              </h3>
              {e.action !== "investigate" && (
                <strong>{money(e.context.offer.price - ec.discount)}</strong>
              )}
              <div className="mini-poster-date">
                {e.context.testDate} · 16:00–18:00
              </div>
              <small>
                {e.action === "investigate"
                  ? t(
                      "Observe the window and record context. No customer offer.",
                    )
                  : `${t("Maximum redemptions")}: ${e.context.offer.limit}`}
              </small>
              <small>
                {t("Expiry")}: {e.context.testDate} 18:00 IST
              </small>
            </div>
            <Button
              disabled={
                busy ||
                preparing ||
                e.invalidated ||
                ["Skipped", "Stopped"].includes(e.stage)
              }
              onClick={prepare}
            >
              {preparing ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Download size={17} />
              )}{" "}
              {t(
                e.stage === "Approved"
                  ? "Prepare materials"
                  : e.action === "investigate"
                    ? "Download observation card"
                    : "Download counter poster",
              )}
            </Button>
            <p className="small muted">
              {t("Materials created does not mean the experiment ran.")}
            </p>
          </section>
          {["Approved", "Prepared"].includes(e.stage) && !e.invalidated && (
            <section className="panel">
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={ran}
                  onChange={(x) => setRan(x.target.checked)}
                  disabled={e.stage !== "Prepared"}
                />
                {t("I confirm this experiment ran")}
              </label>
              <Button
                disabled={busy || e.stage !== "Prepared" || !ran}
                onClick={async () => {
                  if (
                    await run({
                      type: "stage",
                      id: e.id,
                      stage: "Ran",
                      confirmed: true,
                    })
                  ) {
                    setRan(false);
                    notify("Saved on server");
                  }
                }}
              >
                {t("Mark as ran")}
                <Check size={17} />
              </Button>
              <div className="inline-actions small-actions">
                <button
                  className="text-button muted"
                  disabled={busy}
                  onClick={() =>
                    run({ type: "stage", id: e.id, stage: "Skipped" })
                  }
                >
                  {t("Skip")}
                </button>
                <button
                  className="text-button muted"
                  disabled={busy}
                  onClick={() =>
                    run({ type: "stage", id: e.id, stage: "Stopped" })
                  }
                >
                  {t("Stop")}
                </button>
              </div>
            </section>
          )}
          {["Ran", "Reviewed"].includes(e.stage) && (
            <Button onClick={() => go("results")}>
              {t("Review experiment")}
              <ArrowRight size={17} />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
function Results() {
  const { s, t, l, busy, run } = useApp();
  const [id, setId] = useState(
      s.experiments.filter((e) => e.stage === "Ran").at(-1)?.id ||
        s.experiments.at(-1)?.id ||
        "",
    ),
    [selection, setSelection] = useState<CSVSelection | null>(null),
    [date, setDate] = useState(
      s.experiments.find((e) => e.id === id)?.context.testDate ||
        s.context.testDate,
    ),
    [cov, setCov] = useState(false),
    [hours, setHours] = useState(false),
    [ran, setRan] = useState(false),
    [exception, setException] = useState("");
  const e = s.experiments.find((e) => e.id === id) || s.experiments.at(-1);
  const metric = (v: number | null, goal = e?.context.goal) =>
    v === null ? "—" : goal === "average" ? money(Math.round(v)) : String(v);
  const o = e?.outcome;
  const canReview = e?.stage === "Ran";
  function applySample(kind: string) {
    const csv = sampleCSV(kind);
    setSelection({
      csv,
      mapping: {},
      name: `synthetic-${kind}.csv`,
      report: parseCSV(csv),
    });
  }
  return (
    <>
      <PageHead
        eyebrow={t("Results & history")}
        title={t("Results & history")}
        detail={t(
          "History remembers choices and outcomes, not improved predictions.",
        )}
      >
        <Button
          secondary
          onClick={() =>
            download(
              "dukaanpulse-history.json",
              JSON.stringify(
                {
                  experiments: s.experiments,
                  revisions: s.revisions,
                  rejections: s.rejections,
                },
                null,
                2,
              ),
              "application/json",
            )
          }
        >
          <Download size={17} />
          {t("Export receipt & history")}
        </Button>
      </PageHead>
      {!e ? (
        <Empty
          title={t("No experiment yet")}
          detail={t("Choose and approve an action first.")}
        />
      ) : (
        <>
          <div className="history-selector">
            <Field label={t("Saved experiment")}>
              <select
                value={e.id}
                onChange={(x) => {
                  setId(x.target.value);
                  setDate(
                    s.experiments.find((e) => e.id === x.target.value)!.context
                      .testDate,
                  );
                  setSelection(null);
                  setCov(false);
                  setHours(false);
                  setRan(false);
                }}
              >
                {[...s.experiments].reverse().map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.context.shop} · R{ex.revision} · {t(ex.stage)} ·{" "}
                    {ex.id.slice(0, 6)}
                  </option>
                ))}
              </select>
            </Field>
            <Status e={e} />
          </div>
          {o ? (
            <section className="panel outcome-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    {t("Review what happened")} · {o.date}
                  </p>
                  <h2>
                    {t(
                      o.direction === "improved"
                        ? "Improved"
                        : o.direction === "deteriorated"
                          ? "Deteriorated"
                          : o.direction === "unchanged"
                            ? "Unchanged"
                            : "Inconclusive",
                    )}
                  </h2>
                </div>
                <Tag
                  tone={
                    o.direction === "improved"
                      ? "lime"
                      : o.direction === "deteriorated"
                        ? "amber"
                        : "neutral"
                  }
                >
                  {t("Reviewed")}
                </Tag>
              </div>
              <div className="outcome-metrics">
                {[
                  [t("Original metric"), metric(o.original)],
                  [t("Historical baseline"), metric(o.baseline)],
                  [t("Follow-up metric"), metric(o.followup)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <small>{label}</small>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="outcome-deltas">
                <p>
                  {t("Change from original")}:{" "}
                  <strong>
                    {o.deltaOriginal !== null && o.deltaOriginal > 0 ? "+" : ""}
                    {metric(o.deltaOriginal)}
                  </strong>
                </p>
                <p>
                  {t("Change from baseline")}:{" "}
                  <strong>
                    {o.deltaBaseline !== null && o.deltaBaseline > 0 ? "+" : ""}
                    {metric(o.deltaBaseline)}
                  </strong>
                </p>
              </div>
              <div className="alert">
                <Info size={20} />
                {t(
                  "Arithmetic comparison only. The offer cannot be credited with causing this change.",
                )}
              </div>
              {!o.comparable && (
                <p className="form-error">
                  {t(
                    "Comparability is limited by coverage, opening hours, weekday, data quality or exceptional events.",
                  )}
                </p>
              )}
              {o.exception && (
                <p>
                  {t("Exceptional events or limitations")}: {o.exception}
                </p>
              )}
              <details className="evidence-details">
                <summary>{t("Calculation & source")}</summary>
                <p>
                  {t("Goal")}:{" "}
                  {t(
                    e.context.goal === "count"
                      ? "Increase payment count"
                      : "Increase average payment value",
                  )}{" "}
                  · 16:00–18:00 · Asia/Kolkata
                </p>
                <p>
                  {t("Full 4–6 PM coverage confirmed")}: {String(o.coverage)}
                  <br />
                  {t("Open throughout 4–6 PM")}: {String(o.hours)}
                  <br />
                  {t("Experiment actually ran")}: {String(o.ran)}
                </p>
                <ValidationReport
                  report={{
                    ...o.report,
                    rows:
                      (o as unknown as { records: ImportResult["rows"] })
                        .records || [],
                    preview: [],
                  }}
                />
              </details>
            </section>
          ) : canReview ? (
            <div className="two-col">
              <section className="panel">
                <h2>{t("Upload follow-up records")}</h2>
                <p className="small muted">
                  {t("Synthetic demonstration")} · {e.context.testDate}
                </p>
                <CsvPicker onSelect={setSelection} />
                <div className="inline-actions small-actions">
                  <Button secondary onClick={() => applySample("positive")}>
                    {t("Positive follow-up")}
                  </Button>
                  <Button secondary onClick={() => applySample("negative")}>
                    {t("Negative follow-up")}
                  </Button>
                </div>
                {selection && (
                  <p className="small mono">
                    {selection.name} · {selection.report.rows.length}{" "}
                    {t("Valid completed rows")}
                  </p>
                )}
                <Samples />
              </section>
              <section className="panel">
                <h2>{t("Review what happened")}</h2>
                <form
                  className="stack"
                  onSubmit={async (x) => {
                    x.preventDefault();
                    if (selection && e)
                      await run({
                        type: "review",
                        id: e.id,
                        csv: selection.csv,
                        mapping: selection.mapping,
                        date,
                        coverage: cov,
                        hours,
                        ran,
                        exception,
                      });
                  }}
                >
                  <Field label={t("Date")}>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(x) => setDate(x.target.value)}
                    />
                  </Field>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={cov}
                      onChange={(x) => setCov(x.target.checked)}
                    />
                    {t("Full 4–6 PM coverage confirmed")}
                  </label>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={hours}
                      onChange={(x) => setHours(x.target.checked)}
                    />
                    {t("Open throughout 4–6 PM")}
                  </label>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={ran}
                      onChange={(x) => setRan(x.target.checked)}
                    />
                    {t("Experiment actually ran")}
                  </label>
                  <Field label={t("Exceptional events or limitations")}>
                    <textarea
                      maxLength={240}
                      value={exception}
                      onChange={(x) => setException(x.target.value)}
                    />
                  </Field>
                  <p className="small muted">
                    {t(
                      "Comparability is limited by coverage, opening hours, weekday, data quality or exceptional events.",
                    )}
                  </p>
                  <Button disabled={busy || !selection} type="submit">
                    {t("Save outcome review")}
                    <Check size={17} />
                  </Button>
                </form>
              </section>
            </div>
          ) : (
            <div className="alert">
              <Info size={20} />
              {t("Materials created does not mean the experiment ran.")}{" "}
              {t(e.stage)}
            </div>
          )}
          <section className="panel history-panel">
            <h2>{t("Results & history")}</h2>
            {[...s.experiments].reverse().map((ex) => (
              <details className="date-detail" key={ex.id}>
                <summary>
                  <span>
                    <FlaskConical size={17} />R{ex.revision} ·{" "}
                    {ex.context.testDate} ·{" "}
                    {t(ACTIONS.find((a) => a[0] === ex.action)![1])}
                  </span>
                  <Status e={ex} />
                </summary>
                <div className="date-detail-content">
                  <p>{approvedTerms(ex, l)}</p>
                  {ex.events.map((ev, i) => (
                    <div className="timeline-event" key={i}>
                      <CheckCircle2 size={16} />
                      <strong>{t(ev.stage)}</strong>
                      <span>{t(ev.note)}</span>
                      <small>
                        {new Date(ev.at).toLocaleString(l, {
                          timeZone: "Asia/Kolkata",
                        })}
                      </small>
                    </div>
                  ))}
                </div>
              </details>
            ))}
            {s.rejections.length > 0 && (
              <details className="evidence-details">
                <summary>
                  {t("Reject action")} ({s.rejections.length})
                </summary>
                {s.rejections.map((r, i) => (
                  <p key={i}>
                    R{r.revision} ·{" "}
                    {t(ACTIONS.find((a) => a[0] === r.action)![1])}: {r.reason}
                  </p>
                ))}
              </details>
            )}
          </section>
        </>
      )}
    </>
  );
}
