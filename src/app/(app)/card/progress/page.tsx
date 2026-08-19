import { redirect } from "next/navigation";

// ボーナス進捗は /card へ統合した(issue #42)。ブックマーク済みのURL向けに転送だけ残している。
export default function BonusProgressRedirectPage() {
  redirect("/card");
}
