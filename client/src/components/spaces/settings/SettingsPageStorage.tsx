import cx from "classix";
import prettyBytes from "pretty-bytes";
import { useCallback, useEffect, useMemo, useState } from "react";
import SettingsPage from "@/components/spaces/settings/SettingsPage";
import { UserStorage } from "@/models/storages";
import { secondary as colors } from "@/utils/colors";
import LoadingContainer from "@/components/core/LoadingContainer";
import { Users } from "@/resources/users";
import StackedBarChart, { GraphValue } from "@/components/core/StackedBarChart";

export default function SettingsPageStorage() {
  const [userStorage, setUserStorage] = useState<UserStorage | Error>(null);

  const loadUserStorage = useCallback(() => {
    Users.getStorageUsage().then(setUserStorage).catch(setUserStorage);
  }, []);

  useEffect(() => {
    loadUserStorage();
  }, []);

  const { userStorageStatus, totalConnectionsUsage, connectionsUsageData } = useMemo((): {
    userStorageStatus: "error" | "running" | "success";
    totalConnectionsUsage?: number;
    connectionsUsageData?: GraphValue[];
  } => {
    if (userStorage instanceof Error) {
      return {
        userStorageStatus: "error",
      };
    } else if (!userStorage) {
      return {
        userStorageStatus: "running",
      };
    } else {
      const connectionsUsageData = userStorage.connections.map((conn) => {
        return {
          value: conn.usedBytes,
          displayValue: prettyBytes(conn.usedBytes),
          label: conn.name,
        };
      });
      return {
        userStorageStatus: "success",
        totalConnectionsUsage: userStorage.connections.reduce((acc, conn) => acc + conn.usedBytes, 0),
        connectionsUsageData,
      };
    }
  }, [userStorage]);

  return (
    <SettingsPage title="Storage">
      <LoadingContainer
        size="lg"
        status={userStorageStatus}
        errorFallback="User's storage usage cannot be loaded"
        message={""}
        onRetry={loadUserStorage}
      >
        <div
          className={cx("w-full rounded-md flex-col p-4 space-x-1 space-y-2 select-none", colors("background", "text"))}
        >
          <div className="flex flex-row items-center">
            <div className="flex-grow">Connections</div>
            <div className="flex-none text-sm mt-1">{prettyBytes(totalConnectionsUsage || 0)} used</div>
          </div>
          <div className="flex flex-row items-center justify-center">
            <StackedBarChart data={connectionsUsageData || []} />
          </div>
        </div>
        <div className="text-xs">This is the storage usage for keeping data available in the history.</div>
      </LoadingContainer>
    </SettingsPage>
  );
}
