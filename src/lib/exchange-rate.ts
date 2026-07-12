/** USD/JPY の現在レートを取得する。取得できない場合は null(呼び出し側は円換算表示を省略する) */
export async function getUsdJpyRate(): Promise<number | null> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=JPY", {
      next: { revalidate: 21600 }, // 6時間キャッシュ(Frankfurterの更新頻度は平日1日1回程度)
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { rates?: { JPY?: number } };
    return data.rates?.JPY ?? null;
  } catch {
    return null;
  }
}
