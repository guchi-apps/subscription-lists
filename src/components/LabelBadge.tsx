import { Badge } from "@/components/ui/badge";
import { getReadableTextColor } from "@/lib/labels";
import type { LabelDTO } from "@/types";

export function LabelBadge({ label }: { label: LabelDTO }) {
  return (
    <Badge
      style={{ backgroundColor: label.color, color: getReadableTextColor(label.color) }}
      className="border-transparent"
    >
      {label.name}
    </Badge>
  );
}
