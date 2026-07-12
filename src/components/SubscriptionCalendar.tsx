"use client";

import { useCallback, useMemo, useState } from "react";
import { DayPicker, type DayProps } from "react-day-picker";
import { ja } from "date-fns/locale";
import { addMonths, format, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  convertToJpy,
  getOccurrencesInMonth,
  getMonthlyAmount,
  type BillingCycle,
  type Currency,
} from "@/lib/billing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { SubscriptionDTO } from "@/types";

const CURRENCY_LABEL: Record<Currency, string> = { JPY: "円", USD: "ドル" };

const MAX_VISIBLE_EVENTS = 3;

type DayEvent = {
  subscription: SubscriptionDTO;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  billingInterval: number;
};

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function SubscriptionCalendar({
  subscriptions,
  usdJpyRate,
}: {
  subscriptions: SubscriptionDTO[];
  usdJpyRate: number | null;
}) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<DayEvent | null>(null);

  const eventsByDate = useMemo(() => {
    // 月表示は前後の月の日付もグリッドに含まれるため、3ヶ月分をまとめて計算する
    const months = [subMonths(month, 1), month, addMonths(month, 1)];
    const map = new Map<string, DayEvent[]>();
    for (const sub of subscriptions) {
      const priceChanges = sub.priceChanges.map((p) => ({
        ...p,
        amount: Number(p.amount),
        effectiveFrom: new Date(p.effectiveFrom),
      }));
      for (const m of months) {
        const occurrences = getOccurrencesInMonth(
          {
            startDate: new Date(sub.startDate),
            endDate: sub.endDate ? new Date(sub.endDate) : null,
            priceChanges,
          },
          m.getFullYear(),
          m.getMonth() + 1
        );
        for (const occurrence of occurrences) {
          const key = dateKey(occurrence.date);
          const list = map.get(key) ?? [];
          list.push({
            subscription: sub,
            amount: occurrence.amount,
            currency: occurrence.currency,
            billingCycle: occurrence.billingCycle,
            billingInterval: occurrence.billingInterval,
          });
          map.set(key, list);
        }
      }
    }
    return map;
  }, [subscriptions, month]);

  const renderDay = useCallback(
    (props: DayProps) => (
      <CalendarDayCell
        {...props}
        events={eventsByDate.get(dateKey(props.day.date)) ?? []}
        onSelectEvent={setSelected}
      />
    ),
    [eventsByDate]
  );

  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:p-6">
        <DayPicker
          month={month}
          onMonthChange={setMonth}
          locale={ja}
          showOutsideDays
          fixedWeeks
          classNames={{
            root: "w-full",
            months: "w-full",
            month: "w-full space-y-4",
            nav: "flex items-center justify-between",
            button_previous: cn(
              "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground",
              "transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            ),
            button_next: cn(
              "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground",
              "transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            ),
            month_caption: "flex h-8 items-center justify-center text-base font-semibold tracking-tight",
            weekdays: "flex",
            weekday: "min-w-0 flex-1 pb-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase",
            month_grid: "w-full border-collapse",
            week: "flex w-full gap-1 [&+&]:mt-1",
            day: "min-w-0 flex-1 p-0 align-top",
          }}
          components={{
            Day: renderDay,
            Chevron: ({ orientation }) =>
              orientation === "left" ? (
                <ChevronLeft className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              ),
          }}
        />
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.subscription.name}</DialogTitle>
                <DialogDescription>
                  {selected.amount.toLocaleString()} {CURRENCY_LABEL[selected.currency]} / 月あたり{" "}
                  {Math.round(
                    getMonthlyAmount({
                      amount: selected.amount,
                      billingCycle: selected.billingCycle,
                      billingInterval: selected.billingInterval,
                    })
                  ).toLocaleString()}{" "}
                  {CURRENCY_LABEL[selected.currency]}
                  {selected.currency === "USD" &&
                    (() => {
                      const jpy = convertToJpy(selected.amount, selected.currency, usdJpyRate);
                      return jpy !== null ? ` (約${Math.round(jpy).toLocaleString()}円)` : "";
                    })()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>支払い方法: {selected.subscription.paymentMethod.name}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CalendarDayCell({
  day,
  modifiers,
  events,
  onSelectEvent,
  className,
  ...tdProps
}: DayProps & {
  events: DayEvent[];
  onSelectEvent: (event: DayEvent) => void;
}) {
  if (modifiers.hidden) {
    return <td className={className} {...tdProps} />;
  }

  const visibleEvents = events.slice(0, MAX_VISIBLE_EVENTS);
  const hiddenCount = events.length - visibleEvents.length;

  return (
    <td className={cn("h-24 sm:h-28", className)} {...tdProps}>
      <div
        className={cn(
          "flex h-full w-full flex-col gap-1 overflow-hidden rounded-xl p-1.5 transition-colors",
          modifiers.outside ? "opacity-40" : "hover:bg-muted/40"
        )}
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
            modifiers.today
              ? "bg-primary font-semibold text-primary-foreground"
              : "text-muted-foreground"
          )}
        >
          {day.date.getDate()}
        </span>
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
          {visibleEvents.map((event, index) => (
            <button
              key={`${event.subscription.id}_${index}`}
              type="button"
              onClick={() => onSelectEvent(event)}
              className="truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-left text-[11px] leading-tight text-primary transition-colors hover:bg-primary/20"
              title={event.subscription.name}
            >
              {event.subscription.name}
            </button>
          ))}
          {hiddenCount > 0 && (
            <span className="px-1.5 text-[11px] text-muted-foreground">他{hiddenCount}件</span>
          )}
        </div>
      </div>
    </td>
  );
}
