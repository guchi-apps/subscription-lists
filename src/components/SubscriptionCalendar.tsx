"use client";

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { getOccurrencesInMonth, getMonthlyAmount } from "@/lib/billing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { SubscriptionDTO } from "@/types";

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
};

export function SubscriptionCalendar({ subscriptions }: { subscriptions: SubscriptionDTO[] }) {
  const [date, setDate] = useState(new Date());
  const [selected, setSelected] = useState<SubscriptionDTO | null>(null);

  const events = useMemo<CalendarEvent[]>(() => {
    // 月表示は前後の月の日付もグリッドに含まれるため、3ヶ月分をまとめて計算する
    const months = [subMonths(date, 1), date, addMonths(date, 1)];
    const result: CalendarEvent[] = [];
    for (const sub of subscriptions) {
      if (!sub.isActive) continue;
      for (const month of months) {
        const occurrences = getOccurrencesInMonth(
          {
            billingCycle: sub.billingCycle,
            billingDay: sub.billingDay,
            billingMonth: sub.billingMonth,
            startDate: new Date(sub.startDate),
            cancelledAt: sub.cancelledAt ? new Date(sub.cancelledAt) : null,
          },
          month.getFullYear(),
          month.getMonth() + 1
        );
        for (const occurrence of occurrences) {
          result.push({
            title: `${sub.name} ¥${Number(sub.amount).toLocaleString()}`,
            start: occurrence,
            end: occurrence,
            allDay: true,
            subscription: sub,
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
          onSelectEvent={(event) => setSelected((event as CalendarEvent).subscription)}
        />
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>
                  {Number(selected.amount).toLocaleString()} 円 / 月あたり{" "}
                  {Math.round(
                    getMonthlyAmount({
                      amount: Number(selected.amount),
                      billingCycle: selected.billingCycle,
                    })
                  ).toLocaleString()}{" "}
                  円
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>支払い方法: {selected.paymentMethod.name}</p>
                <p>契約方法: {selected.contractMethod.name}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
