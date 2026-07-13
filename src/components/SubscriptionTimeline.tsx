"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, eachYearOfInterval, format, startOfYear } from "date-fns";
import { ChevronRight } from "lucide-react";

import {
  CONTRACT_STATUS_LABEL,
  formatAmountWithJpy,
  getContractStatus,
  getCurrentPrice,
  getMonthlyAmount,
  type ContractStatus,
} from "@/lib/billing";
import { cn } from "@/lib/utils";
import { ContractStatusBadge } from "@/components/ContractStatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { SubscriptionDTO } from "@/types";

const ROW_HEIGHT = 40;
const BAR_HEIGHT = 22;
const HEADER_HEIGHT = 32;
const LABEL_COLUMN_WIDTH = 160;
const TARGET_TIMELINE_WIDTH = 2000;
const MIN_PX_PER_DAY = 1.2;
const MAX_PX_PER_DAY = 8;
const MIN_BAR_WIDTH = 10;

// 契約状況ごとの帯の色。バッジと同じ意味づけ(自動更新中=通常, 解約予定=注意, 解約済み=過去)を踏襲する
const STATUS_BAR_CLASS: Record<ContractStatus, string> = {
  AUTO_RENEWING: "bg-primary",
  SCHEDULED_TO_END: "bg-amber-500",
  ENDED: "bg-muted-foreground/50",
};

const LEGEND_ITEMS: { status: ContractStatus; label: string }[] = [
  { status: "AUTO_RENEWING", label: CONTRACT_STATUS_LABEL.AUTO_RENEWING },
  { status: "SCHEDULED_TO_END", label: CONTRACT_STATUS_LABEL.SCHEDULED_TO_END },
  { status: "ENDED", label: CONTRACT_STATUS_LABEL.ENDED },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toRow(sub: SubscriptionDTO) {
  const priceChanges = sub.priceChanges.map((p) => ({
    ...p,
    amount: Number(p.amount),
    effectiveFrom: new Date(p.effectiveFrom),
  }));
  const startDate = new Date(sub.startDate);
  const endDate = sub.endDate ? new Date(sub.endDate) : null;
  const status = getContractStatus(endDate, sub.autoRenew);
  const referenceDate = status === "ENDED" && endDate ? endDate : new Date();
  const currentPrice = getCurrentPrice(priceChanges, referenceDate);
  return { sub, status, startDate, endDate, currentPrice };
}

type Row = ReturnType<typeof toRow>;

export function SubscriptionTimeline({
  subscriptions,
  usdJpyRate,
}: {
  subscriptions: SubscriptionDTO[];
  usdJpyRate: number | null;
}) {
  const [selected, setSelected] = useState<Row | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    return subscriptions.map(toRow).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [subscriptions]);

  const today = useMemo(() => new Date(), []);

  const { minDate, pixelsPerDay, totalWidth, years, todayX } = useMemo(() => {
    if (rows.length === 0) return null as unknown as {
      minDate: Date;
      maxDate: Date;
      pixelsPerDay: number;
      totalWidth: number;
      years: Date[];
      todayX: number | null;
    };

    const starts = rows.map((r) => r.startDate.getTime());
    const ends = rows.map((r) => (r.endDate ?? today).getTime());
    const minDate = startOfYear(new Date(Math.min(...starts)));
    const maxDate = new Date(Math.max(...ends, today.getTime()));

    const totalDays = Math.max(differenceInCalendarDays(maxDate, minDate), 1);
    const pixelsPerDay = clamp(TARGET_TIMELINE_WIDTH / totalDays, MIN_PX_PER_DAY, MAX_PX_PER_DAY);
    const totalWidth = totalDays * pixelsPerDay;

    const years = eachYearOfInterval({ start: minDate, end: maxDate });

    const todayX =
      today >= minDate && today <= maxDate
        ? differenceInCalendarDays(today, minDate) * pixelsPerDay
        : null;

    return { minDate, maxDate, pixelsPerDay, totalWidth, years, todayX };
  }, [rows, today]);

  useEffect(() => {
    if (!scrollRef.current || todayX === null) return;
    const container = scrollRef.current;
    container.scrollLeft = Math.max(todayX - container.clientWidth / 2, 0);
    // 初回表示時のみ「今日」が見える位置までスクロールする
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">まだサブスクが登録されていません。</p>;
  }

  const dateToX = (date: Date) => differenceInCalendarDays(date, minDate) * pixelsPerDay;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {LEGEND_ITEMS.map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={cn("inline-block size-2.5 rounded-full", STATUS_BAR_CLASS[status])} />
            {label}
          </div>
        ))}
      </div>

      <div className="flex overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="shrink-0 border-r" style={{ width: LABEL_COLUMN_WIDTH }}>
          <div style={{ height: HEADER_HEIGHT }} />
          {rows.map(({ sub, startDate, endDate }) => (
            <div
              key={sub.id}
              className="flex flex-col justify-center overflow-hidden border-b px-2 last:border-b-0"
              style={{ height: ROW_HEIGHT }}
            >
              <p className="truncate text-sm font-medium" title={sub.name}>
                {sub.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {format(startDate, "yyyy/MM")} 〜 {endDate ? format(endDate, "yyyy/MM") : ""}
              </p>
            </div>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-x-auto">
          <div className="relative" style={{ width: totalWidth, height: HEADER_HEIGHT + rows.length * ROW_HEIGHT }}>
            {years.map((year) => (
              <div key={year.getTime()} className="absolute top-0 bottom-0" style={{ left: dateToX(year) }}>
                <div className="absolute top-0 bottom-0 w-px bg-border" />
                <span className="absolute top-1.5 left-1.5 text-[11px] text-muted-foreground">
                  {format(year, "yyyy")}
                </span>
              </div>
            ))}

            {rows.map(({ sub, status, startDate, endDate }, index) => {
              const barLeft = dateToX(startDate);
              const barRight = dateToX(endDate ?? today);
              const barWidth = Math.max(barRight - barLeft, MIN_BAR_WIDTH);
              const ongoing = status === "AUTO_RENEWING" && !endDate;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelected(rows[index])}
                  className={cn(
                    "absolute flex items-center rounded-full outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    STATUS_BAR_CLASS[status]
                  )}
                  style={{
                    left: barLeft,
                    width: barWidth,
                    height: BAR_HEIGHT,
                    top: HEADER_HEIGHT + index * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2,
                  }}
                  title={`${sub.name} (${CONTRACT_STATUS_LABEL[status]})`}
                >
                  {ongoing && (
                    <ChevronRight className="ml-auto size-4 shrink-0 translate-x-3 text-primary" />
                  )}
                </button>
              );
            })}

            {todayX !== null && (
              <div className="absolute top-0 bottom-0 border-l border-dashed border-foreground/40" style={{ left: todayX }}>
                <span className="absolute -top-0 left-1.5 text-[11px] whitespace-nowrap text-foreground/70">
                  今日
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.sub.name}
                  <ContractStatusBadge status={selected.status} />
                </DialogTitle>
                <DialogDescription>
                  {format(selected.startDate, "yyyy年MM月dd日")} 〜{" "}
                  {selected.endDate ? format(selected.endDate, "yyyy年MM月dd日") : "現在"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  {formatAmountWithJpy(selected.currentPrice.amount, selected.currentPrice.currency, usdJpyRate)}{" "}
                  / 月あたり{" "}
                  {formatAmountWithJpy(
                    Math.round(getMonthlyAmount(selected.currentPrice)),
                    selected.currentPrice.currency,
                    usdJpyRate
                  )}
                </p>
                <p>支払い方法: {selected.sub.paymentMethod.name}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
