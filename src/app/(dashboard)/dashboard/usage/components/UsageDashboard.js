"use client";

import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";
import Pagination from "@/shared/components/Pagination";
import { cn } from "@/shared/utils/cn";
import { fmtCost } from "@/shared/utils/currency";
import { translate, getCurrentLocale } from "@/i18n/runtime";
import { fmtTokens } from "@/shared/utils/compactNumber";
import ActivityHeatmap from "./ActivityHeatmap";

function scoreVariant(score) {
  if (score >= 90) return "success";
  if (score >= 70) return "warning";
  return "error";
}

function fmtLatency(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const NODE_COLUMNS = [
  { key: "name", label: "Name", align: "left", kind: "name" },
  { key: "score", label: "Health", align: "center", kind: "badge" },
  { key: "successRate", label: "Success", align: "right", kind: "rate" },
  { key: "avgTtftMs", label: "Avg TTFT", align: "right", kind: "latency" },
  { key: "avgLatencyMs", label: "Avg Latency", align: "right", kind: "latency" },
  { key: "avgSpeed", label: "Avg Speed", align: "right", kind: "speed" },
  { key: "requests", label: "Requests", align: "right", kind: "int" },
  { key: "lastUsed", label: "Last Used", align: "right", kind: "date" },
];

function fmtSpeed(tps) {
  if (tps == null || Number.isNaN(tps)) return "—";
  return `${tps.toLocaleString()} tok/s`;
}

function fmtLastUsed(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(getCurrentLocale(), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function CellContent({ col, row, nameKey, subKey }) {
  switch (col.kind) {
    case "name":
      return (
        <>
          <div className="truncate text-sm font-medium text-text-main">{row[nameKey]}</div>
          {subKey && row[subKey] && (
            <div className="truncate text-xs text-text-muted">{row[subKey]}</div>
          )}
        </>
      );
    case "badge":
      return <Badge variant={scoreVariant(row.score)} size="sm">{row.score}</Badge>;
    case "rate":
      return (
        <span className={cn(
          "font-mono",
          row.successRate >= 90 ? "text-success" : row.successRate >= 70 ? "text-warning" : "text-red-500"
        )}>
          {row.successRate}%
        </span>
      );
    case "latency":
      return <span className="font-mono">{fmtLatency(row[col.key])}</span>;
    case "speed":
      return <span className="font-mono">{fmtSpeed(row.avgSpeed)}</span>;
    case "int":
      return <span className="font-mono">{(row[col.key] || 0).toLocaleString()}</span>;
    case "cost":
      return <span className="font-mono">{fmtCost(row.cost)}</span>;
    case "date":
      return <span className="text-text-muted">{fmtLastUsed(row.lastUsed)}</span>;
    default:
      return String(row[col.key] ?? "—");
  }
}

CellContent.propTypes = {
  col: PropTypes.object.isRequired,
  row: PropTypes.object.isRequired,
  nameKey: PropTypes.string.isRequired,
  subKey: PropTypes.string,
};

function ScoreTable({ rows, columns, nameKey, subKey, emptyText }) {
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sorted = useMemo(() => {
    const valueOf = (row) => {
      if (sortKey === "name") return String(row[nameKey] || "");
      const v = row[sortKey];
      if (typeof v === "string") return v;
      return v == null ? (sortDir === "desc" ? -Infinity : Infinity) : v;
    };
    return [...rows].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      const cmp = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [rows, sortKey, sortDir, nameKey]);

  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-text-muted">{emptyText}</p>;
  }

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const alignClass = { left: "text-left", center: "text-center", right: "text-right" };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/5">
              {columns.map((col) => (
                <th key={col.key} className={cn("p-2 text-xs font-semibold text-text-muted", alignClass[col.align])}>
                  <button
                    onClick={() => toggleSort(col.key)}
                    className={cn(
                      "inline-flex items-center gap-0.5 hover:text-text-main transition-colors",
                      sortKey === col.key && "text-text-main"
                    )}
                  >
                    {translate(col.label)}
                    <span className="material-symbols-outlined text-[14px]">
                      {sortKey === col.key ? (sortDir === "desc" ? "arrow_downward" : "arrow_upward") : "unfold_more"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr
                key={`${row[nameKey]}-${i}`}
                className="border-b border-black/5 dark:border-white/5 last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "p-2 text-sm text-text-main",
                      alignClass[col.align],
                      col.kind === "name" && "max-w-[240px]"
                    )}
                  >
                    <CellContent col={col} row={row} nameKey={nameKey} subKey={subKey} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-black/5 dark:border-white/5">
        <Pagination
          currentPage={safePage}
          pageSize={pageSize}
          totalItems={rows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </div>
    </div>
  );
}

ScoreTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(PropTypes.object).isRequired,
  nameKey: PropTypes.string.isRequired,
  subKey: PropTypes.string,
  emptyText: PropTypes.string.isRequired,
};

function LifetimeCards({ lifetime }) {
  const locale = getCurrentLocale();
  if (!lifetime) return null;
  const cards = [
    { label: "Total Requests", value: (lifetime.totalRequests || 0).toLocaleString() },
    { label: "Lifetime Tokens", value: fmtTokens(lifetime.totalTokens, locale), valueClass: "text-primary" },
    { label: "Peak Day Tokens", value: fmtTokens(lifetime.peakTokens, locale), sub: lifetime.peakDate || "", valueClass: "text-info" },
    {
      label: "Cache Hit Rate",
      value: lifetime.cacheHitRate != null ? `${lifetime.cacheHitRate}%` : "—",
      sub: translate("Only real valid data is counted"),
      valueClass: "text-success",
    },
    {
      label: "Most Used Model",
      value: lifetime.topModel?.model || "—",
      sub: lifetime.topModel
        ? `${translate("Last 7 days")} ${fmtTokens(lifetime.topModel.tokens, locale, true)}${lifetime.topModel.provider ? ` · ${lifetime.topModel.provider}` : ""}`
        : "",
      valueClass: "text-warning",
      shrink: true,
    },
  ];
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="flex min-w-0 flex-col gap-1 px-4 py-3" style={{ containerType: "inline-size" }}>
          <span className="truncate text-text-muted text-sm uppercase font-semibold">{translate(c.label)}</span>
          <div className="flex h-8 items-center min-w-0">
            <span
              className={cn(
                "whitespace-nowrap font-bold",
                c.shrink ? "text-[clamp(0.875rem,4.5cqw,1.5rem)] leading-none truncate" : "truncate text-2xl leading-none",
                c.valueClass
              )}
            >
              {c.value}
            </span>
          </div>
          {c.sub ? (
            <span className="truncate text-[10px] text-text-muted">{c.sub}</span>
          ) : (
            <span className="text-[10px] invisible select-none leading-normal">&nbsp;</span>
          )}
        </Card>
      ))}
    </div>
  );
}LifetimeCards.propTypes = {
  lifetime: PropTypes.object,
};

export default function UsageDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/usage/dashboard`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setData(json);
          setError(false);
        }
      } catch (e) {
        console.error("Failed to fetch usage dashboard:", e);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Card padding="md">
        <div className="flex items-center justify-center gap-2 py-8 text-text-muted">
          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
          {translate("Loading dashboard...")}
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card padding="md">
        <p className="py-6 text-center text-sm text-text-muted">{translate("Failed to load usage dashboard")}</p>
      </Card>
    );
  }

  const nodes = data.nodes || [];
  const daily = data.daily || [];

  return (
    <>
      <LifetimeCards lifetime={data.lifetime} />
      <Card title={translate("Activity Heatmap")} icon="calendar_month" padding="md">
        {daily.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-muted">{translate("No activity in the selected period")}</p>
        ) : (
          <ActivityHeatmap daily={daily} days={365} currentStreak={data.lifetime?.currentStreak} />
        )}
      </Card>
      <Card title={translate("Node Health")} icon="dns" padding="md">
        <p className="mb-2 text-xs text-text-muted">{translate("Last 7 days (>50 requests)")}</p>
        <ScoreTable
          rows={nodes}
          columns={NODE_COLUMNS}
          nameKey="name"
          emptyText={translate("No nodes with 50+ requests in this period")}
        />
      </Card>
    </>
  );
}
