"use client";

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { convertToJpy, getOccurrencesInMonth, getMonthlyAmount, type BillingCycle, type Currency } from "@/lib/billing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { SubscriptionDTO } from "@/types";

const CURRENCY_LABEL: Record<Currency, string> = { JPY: "円", USD: "ドル" };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ja }),
  getDay,
  locales: { ja },
});

const views: View[] = ["month"];

type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: true;
  subscription: SubscriptionDTO;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  billingInterval: number;
};

export function SubscriptionCalendar({
  subscriptions,
  usdJpyRate,
}: {
  subscriptions: SubscriptionDTO[];
  usdJpyRate: number | null;
}) {
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const events = useMemo<CalendarEvent[]>(() => {
    // 月表示は前後の月の日付もグリッドに含まれるため、3ヶ月分をまとめて計算する
    const months = [subMonths(date, 1), date, addMonths(date, 1)];
    const result: CalendarEvent[] = [];
    for (const sub of subscriptions) {
      const priceChanges = sub.priceChanges.map((p) => ({
        ...p,
        amount: Number(p.amount),
        effectiveFrom: new Date(p.effectiveFrom),
      }));
      for (const month of months) {
        const occurrences = getOccurrencesInMonth(
          {
            startDate: new Date(sub.startDate),
            endDate: sub.endDate ? new Date(sub.endDate) : null,
            priceChanges,
          },
          month.getFullYear(),
          month.getMonth() + 1
        );
        for (const occurrence of occurrences) {
          const symbol = occurrence.currency === "USD" ? "$" : "¥";
          result.push({
            title: `${sub.name} ${symbol}${occurrence.amount.toLocaleString()}`,
            start: occurrence.date,
            end: occurrence.date,
            allDay: true,
            subscription: sub,
            amount: occurrence.amount,
            currency: occurrence.currency,
            billingCycle: occurrence.billingCycle,
            billingInterval: occurrence.billingInterval,
          });
        }
      }
    }
    return result;
  }, [subscriptions, date]);

  return (
    <>
      <div className="h-[70vh] rounded-xl bg-card p-2 ring-1 ring-foreground/10">
        <Calendar
          localizer={localizer}
          culture="ja"
          events={events}
          date={date}
          onNavigate={setDate}
          views={views}
          defaultView="month"
          style={{ height: "100%" }}
          messages={{
            next: "翌月",
            previous: "前月",
            today: "今日",
            noEventsInRange: "支払い予定はありません",
            showMore: (count) => `他 ${count} 件`,
          }}
          onSelectEvent={(event) => setSelected(event as CalendarEvent)}
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
