"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import type { ChangelogEntry } from "@/lib/changelog";

export function AppVersionInfo({
  version,
  changelog,
}: {
  version: string;
  changelog: ChangelogEntry[];
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          バージョン
        </h2>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="text-sm text-foreground underline-offset-4 hover:underline"
            >
              バージョン {version}
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>更新履歴</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-5 overflow-y-auto">
              {changelog.map((entry) => (
                <div key={entry.version} className="space-y-1.5">
                  <p className="text-sm font-semibold">
                    バージョン {entry.version}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {entry.date}
                    </span>
                  </p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {entry.changes.map((change, index) => (
                      <li key={index}>{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
