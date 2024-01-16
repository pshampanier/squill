import Page from "@/components/Page";
import { Spinner } from "@/components/core/Spinner";

export default function PageLoader() {
  return (
    <Page>
      <div className="flex items-center justify-center h-full">
        <Spinner size="xl" delay={1000} />
      </div>
    </Page>
  );
}
