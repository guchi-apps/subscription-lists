import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { MasterManager } from "@/components/MasterManager";
import { LabelManager } from "@/components/LabelManager";
import { AppVersionInfo } from "@/components/AppVersionInfo";
import { SignOutButton } from "@/components/SignOutButton";
import { Card, CardContent } from "@/components/ui/card";
import { CHANGELOG } from "@/lib/changelog";
import packageJson from "../../../../package.json";

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
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">設定</h1>
      <MasterManager
        title="支払い方法"
        addLabel="支払い方法を追加"
        apiBasePath="/api/payment-methods"
        initialItems={JSON.parse(JSON.stringify(paymentMethods))}
      />
      <LabelManager initialLabels={JSON.parse(JSON.stringify(labels))} />
      <Card>
        <CardContent className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            アカウント
          </h2>
          <form action="/auth/signout" method="post">
            <SignOutButton />
          </form>
        </CardContent>
      </Card>
      <AppVersionInfo version={packageJson.version} changelog={CHANGELOG} />
    </div>
  );
}
