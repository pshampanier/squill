import cx from "classix";
import { DataFrame } from "@/utils/dataframe";
import { Format } from "@/utils/format";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { primary as colors } from "@/utils/colors";
import { NullValues, TableSettings } from "@/models/user-settings";
import ResizePanel from "@/components/core/ResizePanel";

export type ColumnAlignment = "left" | "center" | "right";

type Dimensions = {
  /**
   * The width of a character in pixels.
   */
  charWidth: number;

  /**
   * The height of a line in pixels.
   */
  lineHeight: number;

  /**
   * The width of the row number column in pixels.
   */
  rowNumWidth: number;

  /**
   * The X padding of the cell in pixels (include both left and right padding).
   */
  px: number;
};

export interface TableViewComponent {
  /**
   * Change the columns displayed in the table.
   */
  setColumns(columns: TableViewColumn[]): void;

  /**
   * Change the rows displayed in the table.
   */
  setRows(rows: DataFrame): void;

  /**
   * Change the settings of the table.
   */
  setSettings(settings: TableSettings): void;

  /**
   * Indicate that the dataframe to be displayed is fetching some data.
   */
  setFetching(fetching: boolean): void;
}

export type TableViewColumn = {
  /**
   * The name of the column in the dataframe.
   */
  name: string;

  /**
   * The title of the column.
   */
  title: string;

  /**
   * The interface to use to format a value for the column.
   */
  format: Format;

  /**
   * The width of the column in pixels.
   */
  width?: number;

  /**
   * The maximum length of the column (number of characters of the text representation of the value).
   */
  maxLength?: number;

  /**
   * The alignment of the column.
   */
  align: ColumnAlignment;

  /**
   * The index of the column in the dataframe.
   */
  dataIndex: number;
};

type TableViewProps = {
  /**
   * Additional classes to apply to the top element rendered by the component.
   */
  className?: string;

  /**
   * The rows to display in the table.
   */
  rows?: DataFrame;

  /**
   * The columns to display in the table.
   */
  columns?: TableViewColumn[];

  /**
   * The settings to apply to the table.
   */
  settings: TableSettings;

  /**
   * A callback called when the component is mounted.
   *
   * That callback provides the component instance as an argument to the parent component, allowing the parent component
   * to interact with the component later on.
   */
  onMount?: (component: TableViewComponent) => void;
};

export default function TableView({
  className,
  columns: defaultColumns = [],
  rows: defaultRows,
  settings: defaultSettings,
  onMount,
}: TableViewProps) {
  //
  // States & Refs
  //
  const [rows, setRows] = useState<DataFrame>(defaultRows);
  const [columns, setColumns] = useState<TableViewColumn[]>(defaultColumns);
  const [settings, setSettings] = useState<TableSettings>(defaultSettings);
  const [fetching, setFetching] = useState<boolean>(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Get the background color of the parent element
  // This is needed to make the sticky columns opaque when scrolling horizontally
  // This value cannot be memoized because it can change when the light/dark mode changes
  const backgroundColor = getBackgroundColor(bodyRef.current);

  // Get the dimensions that depends on the properties of the component
  const dimensions = useMemo(() => {
    const dimensions: Dimensions = { charWidth: 0, lineHeight: 0, rowNumWidth: 0, px: 0 };
    const span = document.createElement("span");
    span.className = "absolute font-mono text-xs whitespace-nowrap invisible";
    span.textContent = "0".repeat(1000);
    document.body.appendChild(span);
    dimensions.charWidth = span.offsetWidth / span.textContent.length;
    dimensions.lineHeight =
      span.offsetHeight + (settings.density === "comfortable" ? 4 * 2 /* p-1 */ : 2 * 2) /* p-0.5 */;
    if (settings.showRowNumbers) {
      const maxRowNumber = rows?.getSizeHint()?.toString().length ?? 1;
      dimensions.rowNumWidth = Math.ceil(maxRowNumber * dimensions.charWidth) + 8 /** pr-2: 8px */;
    }
    dimensions.px = (settings.density === "compact" ? 4 /* px-1 */ : 24) /* px-6 */ * 2;
    document.body.removeChild(span);
    return dimensions;
  }, [settings.showRowNumbers, settings.density, bodyRef.current, rows?.getSizeHint()]);

  const overscan = useMemo(() => {
    switch (settings.overscan) {
      case "small":
        return { rows: 5, columns: 1 };
      case "medium":
        return { rows: 25, columns: 3 };
      case "large":
        return { rows: 125, columns: 9 };
    }
  }, [settings.overscan]);

  const nullValuesText = useMemo(() => {
    switch (settings.nullValues) {
      case "null_lowercase":
        return "null";
      case "null_uppercase":
        return "NULL";
      case "empty":
        return "";
      case "not_available_lowercase":
        return "n/a";
      case "not_available_uppercase":
        return "N/A";
      case "dash":
        return "-";
    }
  }, [settings.nullValues]);

  const getColumnsWidth = useCallback(
    (column: TableViewColumn) => {
      let columnLength = Math.max(column.title.length, column.maxLength ?? 0, nullValuesText.length);
      columnLength = Math.min(columnLength, settings.maxLength);
      const calculatedWidth = Math.ceil(columnLength * dimensions.charWidth) + dimensions.px;
      if (columnLength === column.title.length) {
        return calculatedWidth + 4 /* resize handle */;
      } else {
        return calculatedWidth + 1 /* border */;
      }
    },
    [dimensions.charWidth, dimensions.px, nullValuesText, settings.maxLength],
  );

  const columnsWithSize = useMemo(() => {
    const columnsWithSize = columns.map((column) => {
      return {
        ...column,
        width: column.width ?? getColumnsWidth(column),
      };
    });
    return columnsWithSize;
  }, [columns, getColumnsWidth]);

  const rowVirtualizer = useVirtualizer({
    count: rows?.getSizeHint() ?? 0,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => {
      return dimensions.lineHeight;
    },
    overscan: overscan.rows,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columnsWithSize?.length ?? 0,
    getScrollElement: () => bodyRef.current,
    estimateSize: (index) => columnsWithSize[index].width,
    overscan: overscan.columns,
  });

  const tableViewComponentInterface: TableViewComponent = useMemo(() => {
    return {
      setColumns,
      setRows,
      setSettings,
      setFetching,
    };
  }, []);

  useEffect(() => {
    onMount?.(tableViewComponentInterface);

    const handleScroll = () => {
      if (headerRef.current && bodyRef.current) {
        headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
      }
    };
    bodyRef.current?.addEventListener("scroll", handleScroll);
    return () => {
      bodyRef.current?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  //
  // Column resizing
  //
  const handleOnResizeColumn = (index: number, width: number) => {
    setColumns((columns) => {
      const newColumns = [...columns];
      newColumns[index] = { ...newColumns[index], width };
      return newColumns;
    });
    columnVirtualizer.resizeItem(index, width);
  };

  // Get the virtual items to render
  const visibleRows = rowVirtualizer.getVirtualItems();
  const visibleColumns = columnVirtualizer.getVirtualItems();

  console.debug("Rendering TableView", {
    charWidth: dimensions.charWidth,
    lineHeight: dimensions.lineHeight,
    rowNumWidth: dimensions.rowNumWidth,
    showRowNumbers: settings.showRowNumbers,
    density: settings.density,
    dividers: settings.dividers,
    fetching,
    nullValues: settings.nullValues,
  });

  const classes = {
    root: cx(
      "table-view relative flex flex-col max-w-full font-mono text-xs box-border",
      fetching && "fetching",
      className,
    ),
    header: {
      root: cx(
        "relative flex flex-row w-full flex-none overflow-hidden font-medium font-semibold select-none",
        colors("border"),
      ),
      romNumber: {
        root: cx(
          "absolute flex flex-none sticky left-0 text-center box-border select-none items-center",
          colors("border"),
        ),
      },
      cell: cx("flex flex-row flex-none select-none box-border  border-t border-b-2", colors("border")),
      label: cx(
        "flex-grow whitespace-nowrap text-center text-ellipsis overflow-hidden",
        settings.density === "compact" && "p-1",
        settings.density === "comfortable" && "px-6",
      ),
    },
    body: {
      root: "overflow-auto",
      row: {
        root: cx("box-border", colors("border"), settings.dividers !== "none" && "border-b"),
        cell: cx(
          "absolute top-0 px-1 flex flex-none items-center",
          settings.dividers === "grid" && "box-border border-r",
          colors("border"),
        ),
        text: "whitespace-nowrap text-ellipsis overflow-hidden select-none",
        romNumber: {
          root: cx(
            "absolute flex pr-2 sticky left-0 select-none box-border",
            colors("border"),
            settings.dividers === "grid" && "border-r",
          ),
          text: "opacity-45 w-full text-right",
        },
      },
    },
    rail: {
      root: "rail absolute top-0 left-0 h-0.5 bg-transparent",
    },
  };

  return (
    <div data-component="table-view" className={classes.root}>
      {/* table header */}
      <div ref={headerRef} data-component="table-view-header" className={classes.header.root}>
        {/* rows number */}
        {settings.showRowNumbers && (
          <div
            className={classes.header.romNumber.root}
            style={{
              backgroundColor,
              width: `${dimensions.rowNumWidth}px`,
            }}
          ></div>
        )}
        {columnsWithSize.map((column, index) => (
          <div
            key={index}
            style={{ width: column.width }}
            className={cx(classes.header.cell, index === 0 && "border-l")}
          >
            <span className={classes.header.label}>{column.title}</span>
            <ResizePanel
              className="flex-shrink-0"
              width={column.width}
              minWidth={50}
              maxWidth={5000}
              onResize={(width) => handleOnResizeColumn(index, width)}
            />
          </div>
        ))}
      </div>
      {/* table body */}
      <div ref={bodyRef} data-component="table-view-body" className={classes.body.root}>
        <div
          data-component="table-view-virtual-content"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: `${columnVirtualizer.getTotalSize() + dimensions.rowNumWidth}px`,
            position: "relative",
          }}
        >
          {/* rows */}
          {visibleRows.map((row) => {
            const rowData = rows.get(row.index);
            return (
              <div
                key={row.index}
                className={classes.body.row.root}
                style={{
                  position: "absolute",
                  top: `${row.start}px`,
                  left: 0,
                  right: 0,
                  height: `${row.size}px`,
                }}
              >
                {visibleColumns.map((column) => {
                  const tableViewColumn = columnsWithSize[column.index];
                  const value = rowData[tableViewColumn.dataIndex];
                  const displayValue = value === null ? nullValuesText : tableViewColumn.format.format(value);
                  const className = value === null ? cx(classes.body.row.cell, "opacity-45") : classes.body.row.cell;
                  return (
                    <MemoizedTableViewCell
                      key={column.index}
                      left={column.start + dimensions.rowNumWidth}
                      width={column.size}
                      height={row.size}
                      align={tableViewColumn.align}
                      nullValues={settings.nullValues}
                      className={cx(className, column.index === 0 && settings.dividers === "grid" && "border-l")}
                    >
                      <span className={classes.body.row.text}>{displayValue}</span>
                    </MemoizedTableViewCell>
                  );
                })}
                {/* rows number */}
                {settings.showRowNumbers && (
                  <div
                    data-component="table-view-row-number"
                    className={classes.body.row.romNumber.root}
                    style={{
                      width: `${dimensions.rowNumWidth}px`,
                      height: `${dimensions.lineHeight}px`,
                      backgroundColor,
                    }}
                  >
                    <span className={classes.body.row.romNumber.text}>{row.index + 1}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* rail indicator */}
      <div
        className={classes.rail.root}
        style={{
          width: `calc(100% - (${dimensions.rowNumWidth}px))`,
          left: dimensions.rowNumWidth,
          top: dimensions.lineHeight + (settings.density === "compact" ? 4 /* p-1 */ : 8 * 2) /* p-2 */ * 2 - 1,
        }}
      >
        <div className={cx("w-5 h-full", colors("selected:background"))}></div>
      </div>
    </div>
  );
}

type TableViewCellProps = {
  children: React.ReactNode;
  left: number;
  width: number;
  height: number;
  align: ColumnAlignment;
  className: string;
  nullValues: NullValues;
};

function TableViewCell({ children, left, width, height, align, className }: TableViewCellProps) {
  // console.debug("render TableViewCell");
  return (
    <div
      className={className}
      style={{
        left,
        width: `${width}px`,
        height: `${height}px`,
        justifyContent: align,
      }}
    >
      {children}
    </div>
  );
}

const MemoizedTableViewCell = memo(
  TableViewCell,
  (prev, next) =>
    prev.left === next.left &&
    prev.width === next.width &&
    prev.className === next.className &&
    prev.nullValues === next.nullValues,
);

function getBackgroundColor(element: HTMLElement) {
  while (element) {
    const color = window.getComputedStyle(element).backgroundColor;
    if (color !== "rgba(0, 0, 0, 0)" && color !== "transparent") {
      return color;
    }
    element = element.parentElement!;
  }
  return "transparent";
}
