import { useAuth } from "@/hooks/auth";
import { formatObject } from "@/lib";

export default function IndexPage() {
  const { userData } = useAuth();
  return <div>
    {formatObject(userData)}
  </div>;
}
