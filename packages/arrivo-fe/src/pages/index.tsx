import { useApp } from "@/hooks";
import { formatObject } from "@/lib";

export default function IndexPage() {
  const { auth } = useApp();
  return <div>
    {formatObject(auth?.userData)}
  </div>;
}
