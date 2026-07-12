import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import type { MasterDTO } from "@/types";

export default async function NewSubscriptionPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const [paymentMethods, contractMethods] = await Promise.all([
    db.paymentMethod.findMany({ where: { userId, isActive: true }, orderBy: { displayOrder: "asc" } }),
    db.contractMethod.findMany({ where: { userId, isActive: true }, orderBy: { displayOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">サブスクを登録</h1>
      <SubscriptionForm
        paymentMethods={JSON.parse(JSON.stringify(paymentMethods)) as MasterDTO[]}
        contractMethods={JSON.parse(JSON.stringify(contractMethods)) as MasterDTO[]}
      />
    </div>
  );
}
