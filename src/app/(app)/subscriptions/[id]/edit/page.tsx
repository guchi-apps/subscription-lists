import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import type { MasterDTO, SubscriptionDTO } from "@/types";

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/auth/signin");

  const { id } = await params;
  const [subscription, paymentMethods, contractMethods] = await Promise.all([
    db.subscription.findFirst({
      where: { id, userId },
      include: { paymentMethod: true, contractMethod: true },
    }),
    db.paymentMethod.findMany({ where: { userId, isActive: true }, orderBy: { displayOrder: "asc" } }),
    db.contractMethod.findMany({ where: { userId, isActive: true }, orderBy: { displayOrder: "asc" } }),
  ]);
  if (!subscription) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">サブスクを編集</h1>
      <SubscriptionForm
        subscription={JSON.parse(JSON.stringify(subscription)) as SubscriptionDTO}
        paymentMethods={JSON.parse(JSON.stringify(paymentMethods)) as MasterDTO[]}
        contractMethods={JSON.parse(JSON.stringify(contractMethods)) as MasterDTO[]}
      />
    </div>
  );
}
