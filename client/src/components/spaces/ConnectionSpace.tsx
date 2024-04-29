import Space, { SpaceProps } from "@/components/spaces/Space";
import { Spinner } from "@/components/core/Spinner";

export default function ConnectionSpace(props: SpaceProps) {
  return (
    <Space {...props} className="items-center justify-center">
      <div className="flex bg-transparent">
        <Spinner size="xl" />
      </div>
    </Space>
  );
}
