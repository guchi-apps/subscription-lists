import { Badge } from "@/components/ui/badge";
import { CONTRACT_STATUS_LABEL, type ContractStatus } from "@/lib/billing";

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  if (status === "AUTO_RENEWING") {
    return <Badge variant="secondary">{CONTRACT_STATUS_LABEL[status]}</Badge>;
  }
  if (status === "SCHEDULED_TO_END") {
    return (
      <Badge
        variant="outline"
        className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
      >
        {CONTRACT_STATUS_LABEL[status]}
      </Badge>
    );
  }
  return <Badge variant="outline">{CONTRACT_STATUS_LABEL[status]}</Badge>;
}
