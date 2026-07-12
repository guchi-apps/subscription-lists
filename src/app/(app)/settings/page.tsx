import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { MasterManager } from "@/components/MasterManager";
import { LabelManager } from "@/components/LabelManager";

export default async function SettingsPage() {
  const userId = await requireUserId();
  if (!userId) return null;

  const [paymentMethods, labels] = await Promise.all([
    db.paymentMethod.findMany({
      where: { userId },
      orderBy: { displayOrder: "asc" },
    }),
    db.label.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-xl font-semibold">設定</h1>
      <MasterManager
        title="支払い方法"
        addLabel="支払い方法を追加"
        apiBasePath="/api/payment-methods"
        initialItems={JSON.parse(JSON.stringify(paymentMethods))}
      />
      <LabelManager initialLabels={JSON.parse(JSON.stringify(labels))} />
    </div>
  );
}
