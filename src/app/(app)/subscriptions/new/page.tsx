import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import type { LabelDTO, MasterDTO } from "@/types";

export default async function NewSubscriptionPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const [paymentMethods, labels] = await Promise.all([
    db.paymentMethod.findMany({
      where: { userId, isActive: true },
      orderBy: { displayOrder: "asc" },
    }),
    db.label.findMany({ where: { userId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">サブスクを登録</h1>
      <SubscriptionForm
        paymentMethods={JSON.parse(JSON.stringify(paymentMethods)) as MasterDTO[]}
        labels={JSON.parse(JSON.stringify(labels)) as LabelDTO[]}
      />
    </div>
  );
}
