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
   * The height of a line in pixels (applies to header, rows and footer).
   */
  lineHeight: number;

  /**
   * The height of a skeleton row in pixels.
   */
  skeletonHeight: number;

  /**
   * The width of the row number column in pixels.
   */
  rowNumWidth: number;

  /**
   * The X padding of the cell in pixels (include both left and right padding).
   */
  padding: number;
};

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

export type TableViewProps = {
  /**
   * Additional classes to apply to the top element rendered by the component.
   */
  className?: string;

  /**
   * The maximum number of rows to display in the table.
   *
   * If the number of rows in the dataframe is greater than this value, the table will only display the given `maxRows`
   * rows and the user will need to scroll to see the other rows.
   *
   * If undefined, the number of rows displayed will depend on the height available in the parent element.
   */
  maxRows?: number;

  /**
   * The rows to display in the table.
   */
  rows?: DataFrame;

  /**
   * The columns to display in the table.
   */
  columns?: TableViewColumn[];

  /**
   * Indicate if the table is fetching some data.
   */
  fetching?: boolean;

  /**
   * The settings to apply to the table.
   */
  settings: TableSettings;

  /**
   * A callback called when the component is mounted.
   */
  onMount?: () => void;

  /**
   * A callback called when the component is unmounted.
   */
  onUnmount?: () => void;
};

/**
 * A table view component that displays a dataframe.
 */
function TableView({
  className,
  columns: defaultColumns = [],
  rows,
  fetching = false,
  settings,
  maxRows,
  onMount,
  onUnmount,
}: TableViewProps) {
  //
  // States & Refs
  //
  const [columns, setColumns] = useState<TableViewColumn[]>(defaultColumns);
  //  const [rows, setRows] = useState<DataFrame>(defaultRows);
  const bodyRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Get the background color of the parent element
  // This is needed to make the sticky columns opaque when scrolling horizontally
  // This value cannot be memoized because it can change when the light/dark mode changes
  const backgroundColor = getBackgroundColor(bodyRef.current);

  // noRows is true when there is no rows to display.
  // This will be used to display a table footer.
  const noRows = !rows?.getSizeHint();

  // Get the dimensions that depends on the properties of the component
  const dimensions = useMemo(() => {
    const dimensions: Dimensions = {
      charWidth: 0,
      lineHeight: 0,
      skeletonHeight: 0,
      rowNumWidth: 0,
      padding: 0,
    };
    const span = document.createElement("span");
    span.className = "absolute font-mono text-xs whitespace-nowrap invisible";
    span.textContent = "0".repeat(1000);
    document.body.appendChild(span);
    dimensions.charWidth = span.offsetWidth / span.textContent.length;
    dimensions.lineHeight = getLineHeight(settings);
    dimensions.skeletonHeight = dimensions.lineHeight - (settings.density === "compact" ? 6 : 12);
    if (settings.showRowNumbers) {
      const maxRowNumber = rows?.getSizeHint()?.toString().length ?? 1;
      dimensions.rowNumWidth = Math.ceil(maxRowNumber * dimensions.charWidth) + 8 /** pr-2: 8px */;
    }
    dimensions.padding = (settings.density === "compact" ? 4 /* px-1 */ : 24) /* px-6 */ * 2;
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

  // Reset the columns when the default columns change
  useEffect(() => {
    setColumns(defaultColumns);
  }, [defaultColumns]);

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
      const calculatedWidth = Math.ceil(columnLength * dimensions.charWidth) + dimensions.padding;
      if (columnLength === column.title.length) {
        return calculatedWidth + 4 /* resize handle */;
      } else {
        return calculatedWidth + 1 /* border */;
      }
    },
    [dimensions.charWidth, dimensions.padding, nullValuesText, settings.maxLength],
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
    estimateSize: () => dimensions.lineHeight,
    paddingEnd: noRows ? dimensions.lineHeight : 0,
    overscan: overscan.rows,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columnsWithSize?.length ?? 0,
    getScrollElement: () => bodyRef.current,
    estimateSize: (index) => columnsWithSize[index].width,
    overscan: overscan.columns,
  });

  useEffect(() => {
    onMount?.();
    const handleScroll = () => {
      if (headerRef.current && bodyRef.current) {
        headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
      }
    };
    bodyRef.current?.addEventListener("scroll", handleScroll);
    return () => {
      bodyRef.current?.removeEventListener("scroll", handleScroll);
      onUnmount?.();
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

  //
  // If the table density changes, we need to update the virtualizers
  //
  useEffect(() => {
    rowVirtualizer.measure();
    columnVirtualizer.measure();
  }, [settings.density]);

  // Get the virtual items to render
  const visibleRows = rowVirtualizer.getVirtualItems();
  const visibleColumns = columnVirtualizer.getVirtualItems();

  // We need to use a useEffect to load the rows when the visible rows change because it's not allowed in react to call
  // the `loadRows` method in the render method since this one is may end-up calling a `setState` during the parent
  // component render phase.
  useEffect(() => {
    if (rows && visibleRows.length > 0) {
      rows.loadRows(visibleRows[0].index, visibleRows.length);
    }
  }, [visibleRows.length > 0 ? visibleRows[0].index : 0, visibleRows.length]);

  console.debug("Rendering TableView", {
    firstRow: visibleRows[0]?.index,
    visibleRows: visibleRows.length,
    charWidth: dimensions.charWidth,
    lineHeight: dimensions.lineHeight,
    rowNumWidth: dimensions.rowNumWidth,
    showRowNumbers: settings.showRowNumbers,
    density: settings.density,
    dividers: settings.dividers,
    nullValues: settings.nullValues,
    fetching,
    rows,
  });

  const classes = {
    root: cx(
      "table-view relative flex flex-col max-w-full max-h-full font-mono text-xs box-border",
      fetching && "fetching",
      className,
    ),
    header: {
      root: cx(
        "relative flex flex-row w-full flex-none overflow-hidden font-medium font-semibold select-none",
        settings.density === "compact" && "h-5",
        settings.density === "comfortable" && "h-8",
        colors("border"),
      ),
      romNumber: {
        root: cx(
          "absolute flex flex-none sticky left-0 text-center box-border select-none items-center",
          colors("border"),
          settings.dividers === "grid" && "border-r",
        ),
      },
      cell: cx("flex flex-row flex-none select-none box-border  border-t-2 border-b-2 items-center", colors("border")),
      label: "flex-grow whitespace-nowrap text-center text-ellipsis overflow-hidden px-1",
    },
    body: {
      root: "overflow-auto",
      row: {
        root: cx(
          "box-border",
          colors("border"),
          settings.dividers !== "none" && "border-b",
          settings.density === "compact" && "h-5",
          settings.density === "comfortable" && "h-8",
        ),
        cell: cx(
          "absolute top-0 flex flex-none items-center",
          settings.dividers === "grid" && "box-border border-r",
          colors("border"),
        ),
        text: "whitespace-nowrap text-ellipsis overflow-hidden select-none px-1",
        romNumber: {
          root: cx(
            "absolute flex pr-2 sticky left-0 select-none box-border text-ellipsis overflow-hidden items-center",
            colors("border"),
            settings.dividers === "grid" && "border-r",
          ),
          text: "opacity-45 w-full text-right",
        },
      },
    },
    footer: {
      root: cx(
        "absolute bottom-0 border-box flex flex-none items-center",
        settings.dividers !== "none" && "border-b",
        settings.dividers === "grid" && "border-l border-r",
        settings.density === "compact" && "h-5",
        settings.density === "comfortable" && "h-8",
        colors("border"),
      ),
      text: "opacity-45 w-full whitespace-nowrap text-ellipsis overflow-hidden select-none px-1",
    },
    rail: {
      root: "rail absolute top-0 left-0 h-0.5 bg-transparent",
    },
  };

  // Calculate the max height of the body
  // If the number of rows is greater than the `maxRows`, the height of the body will be limited to the height of
  // `maxRows` * the height of a row, otherwise, the height will be driven by the parent element.
  const maxHeight = useMemo(() => {
    if (maxRows && rows?.getSizeHint()) {
      const actualRows = rows.getSizeHint();
      return Math.min(maxRows, actualRows) * dimensions.lineHeight + "px";
    }
    return "auto";
  }, [dimensions.lineHeight, maxRows, rows?.getSizeHint()]);

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
              className="h-full flex-shrink-0"
              width={column.width}
              minWidth={50}
              maxWidth={5000}
              onResize={(width) => handleOnResizeColumn(index, width)}
            />
          </div>
        ))}
      </div>
      {/* table body */}
      <div
        ref={bodyRef}
        data-component="table-view-body"
        className={classes.body.root}
        style={{ maxHeight, maxWidth: `${columnVirtualizer.getTotalSize() + dimensions.rowNumWidth}px` }}
      >
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
            const rowData = rows.getRow(row.index);
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
                  let displayValue: React.ReactNode = null;
                  const value = rowData?.[tableViewColumn.dataIndex];
                  if (rowData === null) {
                    // The row is not loaded yet, we are displaying a skeleton...
                    displayValue = (
                      <div
                        className="bg-gray-100 dark:bg-gray-700"
                        style={{
                          width: tableViewColumn.maxLength * dimensions.charWidth,
                          height: dimensions.skeletonHeight,
                        }}
                      ></div>
                    );
                  } else {
                    displayValue = value === null ? nullValuesText : tableViewColumn.format.format(value);
                  }
                  const className = value === null ? cx(classes.body.row.cell, "opacity-45") : classes.body.row.cell;
                  return (
                    <MemoizedTableViewCell
                      key={column.index}
                      rawValue={value}
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
          {/* footer */}
          {noRows && (
            <div
              className={classes.footer.root}
              style={{
                width: `calc(100% - (${dimensions.rowNumWidth}px))`,
                left: `${dimensions.rowNumWidth}px`,
                height: `${dimensions.lineHeight}px`,
              }}
            >
              {!fetching && <span className={classes.footer.text}>0 rows</span>}
            </div>
          )}
        </div>
      </div>
      {/* rail indicator */}
      <div
        className={classes.rail.root}
        style={{
          width: `calc(100% - (${dimensions.rowNumWidth}px))`,
          left: dimensions.rowNumWidth,
          top: dimensions.lineHeight - 2 /* remove the border-bottom (bt-2) */,
        }}
      >
        <div className={cx("w-5 h-full", colors("solid:background"))}></div>
      </div>
    </div>
  );
}

/**
 * Get the height in pixels of a line in the table.
 * All lines are the same height (headers, rows, and footer).
 */
function getLineHeight(tableSettings: TableSettings) {
  return tableSettings.density === "compact" ? 20 /* h-5 */ : 32 /* h-8 */;
}

/**
 * Estimate the height of the table in pixels.
 */
TableView.estimateSize = function (rowCount: number, tableSettings: TableSettings) {
  // All lines are the same height, including the header and the footer.
  // The table is composed with at least two lines (header and footer), or the headers + the rows.
  const lineHeight = getLineHeight(tableSettings);
  return Math.max(2, rowCount + 1) * lineHeight;
};

export default TableView;

type TableViewCellProps = {
  rawValue: unknown;
  children: React.ReactNode;
  left: number;
  width: number;
  height: number;
  align: ColumnAlignment;
  className: string;
  nullValues: NullValues;
};

function TableViewCell({ children, left, width, height, align, className }: TableViewCellProps) {
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
    prev.rawValue === next.rawValue &&
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
