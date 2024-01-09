import cx from "classix";
import { tertiary as colors } from "@/utils/colors";
import React from "react";
import { ColorsContext } from "@/stores/ColorsContext";

type TitlebarProps = {
  children?: React.ReactNode;
};

export default function Titlebar({ children }: TitlebarProps) {
  return (
    <ColorsContext.Provider value={colors}>
      <header
        className={cx("flex space-x-2 h-11 p-1 justify-between text-white w-full draggable", colors("background"))}
      >
        {children}
      </header>
    </ColorsContext.Provider>
  );
}
