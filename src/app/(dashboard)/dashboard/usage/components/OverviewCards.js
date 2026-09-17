"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";
import { fmtCost } from "@/shared/utils/currency";
import { fmtTokens } from "@/shared/utils/compactNumber";
import { getCurrentLocale } from "@/i18n/runtime";

export default function OverviewCards({ stats }) {
  // The 单位缩写 toggle previously did not reach this card row (it formatted
  // with a bare Intl.NumberFormat, always full thousand-separated). Route every
  // counter through fmtTokens so the Overview obeys the same switch as the
  // Details tab, and read the locale so 亿/万 vs B/M/K matches the rest of the
  // page. Est. Cost keeps fmtCost — currency is not a unit abbreviation.
  const locale = getCurrentLocale();
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:gap-4">
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Total Requests</span>
        <span className="truncate text-2xl font-bold">{fmtTokens(stats.totalRequests, locale)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Total Input Tokens</span>
        <span className="truncate text-2xl font-bold text-primary">{fmtTokens(stats.totalPromptTokens, locale)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Cached Tokens</span>
        <span className="truncate text-2xl font-bold text-info">{fmtTokens(stats.totalCachedTokens, locale)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Output Tokens</span>
        <span className="truncate text-2xl font-bold text-success">{fmtTokens(stats.totalCompletionTokens, locale)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-text-muted text-sm uppercase font-semibold">Est. Cost</span>
        <span className="truncate text-2xl font-bold text-warning">~{fmtCost(stats.totalCost)}</span>
        <span className="text-[10px] text-text-muted">Estimated, not actual billing</span>
      </Card>
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
