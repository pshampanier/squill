import cx from "classix";
import { DatasetAttributeFormat } from "@/models/dataset-attribute-format";
import { primary as colors, secondary } from "@/utils/colors";
import { DataFrame, DataFrameSlice } from "@/utils/dataframe";
import { useVirtualizer } from "@tanstack/react-virtual";
import { UseQueryResult, keepPreviousData, useQueries } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Duration } from "@/utils/duration";
import TrueIcon from "@/icons/true.svg?react";
import FalseIcon from "@/icons/false.svg?react";
import ResizePanel from "@/components/core/ResizePanel";
import { TableSettings } from "@/models/users";

/**
 * A row of data to be displayed by the component.
 *
 * The row is an array of strings where each string represents a value to be displayed in a table cell.
 * This component does not perform any formatting of the data, it is up to the caller to format the data as needed.
 */
type Row = string[];

type TableViewProps = {
  /**
   * Additional classes to apply to the top element rendered by the component.
   */
  className?: string;

  /**
   * The dataset to display in the table.
   *
   * The dataset does not need to be loaded, the table will load the rows as needed.
   */
  dataframe: DataFrame<Row>;

  /**
   * The number of rows to fetch at a time (default 1000).
   */
  fetchSize?: number;

  /**
   * The number of rows to render outside the viewport.
   */
  overscan?: number;

  settings?: TableSettings;

  /**
   * A callback to be called once a column has been resized.
   */
  onResize?: ResizeObserver;
};

type Column = {
  title: string;

  /**
   * The format of the column
   */
  format: DatasetAttributeFormat;

  /**
   * The width of the column (in pixels)
   */
  width: number;

  /**
   * Whether the column should be sticky
   */
  sticky: boolean;

  /**
   * The classes to apply to the cells displaying the column
   */
  cellClasses: ColumnClasses;
};

type ColumnClasses = {
  self: string;
  div: string;
};

type QueryResult = {
  data: Array<DataFrameSlice<Row>>;
  isFetching: boolean;
};

function combineUseQueryResult(results: UseQueryResult<DataFrameSlice<Row>, Error>[]) {
  // Combine the results of the queries into a single object
  // We are keeping only the data that are available and the fetching state
  console.debug("combining results", results);
  return {
    data: results.filter((r) => r.data).map((r) => r.data),
    isFetching: results.some((r) => r.isFetching),
  };
}

/**
 * A table view component that displays a dataset in a table.
 *
 * The cells in the table are rendered based on the format of the column.
 * The table will load the rows as needed and display a placeholder at the end of the table until all the rows have been
 * loaded.
 *
 * Inspired by https://tanstack.com/table/latest
 */
export default function TableView({
  className = "text-xs",
  dataframe,
  fetchSize = 1000,
  overscan = 50,
  settings = new TableSettings({
    showRowNumbers: true,
    density: "comfortable",
    dividers: "rows",
  }),
}: TableViewProps) {
  // The height in pixels of a row in the table
  const estimatedRowHeight = getEstimatedRowHeight(settings);

  // The height in pixels of the entire table
  const estimatedTotalHeight = estimatedRowHeight * dataframe.getSizeHint();

  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<Column[]>(null);

  // A state to force the update of the component
  // Because the component is heavily memoized, it will not re-render when the state or property are changing. In order
  // to avoid to duplicate the logic to update the component, we use this state to force the update when needed.
  // It also speeds up the memoization test function since it does not need to compare all the properties.
  const [refreshRevision, setRefreshRevision] = useState<number>(0);

  /**
   * The offsets of the slices that are currently needed to render the table, this is based on the range of rows that
   * are currently visible in the table (including the overscan rows).
   * This will be trigger useQueries() to fetch the data needed.
   */
  const [slicesOffsets, setSlicesOffsets] = useState<Array<number>>([]);

  const virtualizerConfig = useMemo(
    () => ({
      count: dataframe.getSizeHint(),
      estimateSize: () => estimatedRowHeight, // for accurate scrollbar dragging
      getScrollElement: () => containerRef.current,
      gap: 1,
      overscan,
    }),
    [estimatedRowHeight],
  );

  const { getVirtualItems, calculateRange, measure } = useVirtualizer(virtualizerConfig);

  const makeQueryConfig = useCallback(
    (offset: number) => ({
      queryKey: ["dataframe", dataframe.getId(), offset, fetchSize],
      queryFn: () => dataframe.getSlice(offset, fetchSize),
      placeholderData: keepPreviousData,
      staleTime: new Duration(1, "minute").toMilliseconds(),
    }),
    [],
  );

  const { data, isFetching } = useQueries<Array<DataFrameSlice<Row>>, QueryResult>({
    queries: slicesOffsets.map(makeQueryConfig),
    combine: combineUseQueryResult,
  });

  useEffect(() => {
    // Get the schema of the dataset to determine the columns.
    const columns = dataframe
      .getSchema()
      .items.map((attr): Partial<Column> => {
        return {
          title: attr.name,
          format: attr.format,
          width: 120,
          sticky: false,
        };
      })
      .map((column: Partial<Column>, index: number, columns: Partial<Column>[]): Column => {
        // A second pass is needed to apply the CSS classes (because they depend on the other columns)
        return {
          ...column,
          cellClasses: buildColumnClasses(column, index, columns, false, { settings }),
        } as Column;
      });
    setColumns(columns);

    // When the density changes, we need the virtualizer to re-measure the rows and trigger a refresh of the table.
    measure();
    setRefreshRevision((prev) => prev + 1);
  }, [settings.density, settings.dividers, settings.showRowNumbers]);

  /**
   * Update the slices offsets when the range of visible rows changes.
   *
   * This will trigger the fetching of the data needed to render the rows in the range.
   */

  const handleRangeChange = useCallback(
    (range: { startIndex: number; endIndex: number }) => {
      const offsets = getSlicesOffsetsFromRange(range, overscan, dataframe.getSizeHint(), fetchSize);
      // As long as the offsets already present in the state `slicesOffsets`, we don't need to update the state.
      if (!offsets.every((offset) => slicesOffsets.includes(offset))) {
        setSlicesOffsets(offsets);
      }
    },
    [slicesOffsets],
  );

  const range = calculateRange();
  if (range !== null) {
    handleRangeChange(range);
  }

  const handleResize = useCallback((columnIndex: number, width: number) => {
    // TODO: update the width of the column in the state
    console.debug(`resizing column ${columnIndex} to ${width}px`);
  }, []);

  const handleResizeEnd = useCallback((columnIndex: number, width: number) => {
    // TODO: update the column definition and call the column observer
    console.debug(`resizing column ${columnIndex} to ${width}px completed`);
  }, []);

  console.debug(
    `rendering (slicesOffsets=${slicesOffsets}, range=${JSON.stringify(range)}, settings=${JSON.stringify(settings)}, revision=${refreshRevision})`,
  );
  if (!columns) {
    return null;
  } else {
    const classes = {
      container: cx("relative w-full h-full overflow-auto", className, colors("text", "background")),
      table: {
        self: cx("table-view grid w-full text-left select-none border-collapse", isFetching && "fetching"),
        thead: {
          self: cx("grid sticky top-0 z-10 text-xs uppercase font-semibold items-center", colors("background")),
          tr: "flex w-full",
          th: cx(
            "flex grow",
            settings.density === "compact" && "p-1",
            settings.density === "comfortable" && "px-6 py-3",
          ),
          rowNum: buildColumnClasses(null, -1, columns, true, { settings }),
        },
        tbody: {
          self: cx(
            "relative grid w-full z-0",
            settings.dividers !== "none" && "divide-y",
            settings.dividers !== "none" && colors("divide"),
          ),
          tr: {
            self: cx("z-0", settings.dividers === "grid" && cx("divide-x", colors("divide"))),
            rowNum: buildColumnClasses(null, -1, columns, false, { settings }),
          },
        },
      },
    };
    return (
      <div ref={containerRef} className={classes.container}>
        <table className={classes.table.self}>
          <TableViewHeader
            refreshRevision={refreshRevision}
            columns={columns}
            settings={settings}
            classes={classes.table.thead}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
          />
          <tbody className={classes.table.tbody.self} style={{ height: `${estimatedTotalHeight}px` }}>
            {getVirtualItems().map((virtualRow) => {
              const rowNum = virtualRow.index + 1;
              const rowData = getRowData(data, virtualRow.index, fetchSize);
              return (
                <TableViewRow
                  key={virtualRow.index}
                  rowNum={rowNum}
                  columns={columns}
                  data={rowData}
                  top={virtualRow.start}
                  settings={settings}
                  refreshRevision={refreshRevision}
                  classes={classes.table.tbody}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

/**
 * A callback to be called when a column is resized.
 */
type ResizeObserver = (columnIndex: number, width: number) => void;

/**
 * A component that display the table table header.
 *
 * This component is memoized to avoid re-rendering whenever possible.
 */
const TableViewHeader = memo(
  ({
    columns,
    settings,
    classes,
    onResize,
    onResizeEnd,
  }: {
    refreshRevision: number;
    columns: Column[];
    settings: TableSettings;
    classes: { self: string; tr: string; th: string; rowNum: { self: string; div: string } };
    onResize: ResizeObserver;
    onResizeEnd: ResizeObserver;
  }) => {
    console.debug("rendering header");
    return (
      <thead className={classes.self}>
        <tr className={classes.tr}>
          {settings.showRowNumbers && (
            <th scope="col" className={classes.rowNum.self}>
              <div className={classes.rowNum.div}></div>
            </th>
          )}
          {columns.map((column, i) => (
            <th
              key={i}
              scope="col"
              style={{ width: column.width + "px" }}
              className={cx("relative", classes.th, column.format.name === "boolean" && "justify-center")}
            >
              <div className="truncate">{column.title}</div>
              <ResizePanel
                className="absolute right-0 h-4"
                width={column.width}
                minWidth={100}
                maxWidth={1000}
                onResize={(width) => onResize(i, width)}
                onResizeEnd={(width) => onResizeEnd(i, width)}
              />
            </th>
          ))}
        </tr>
        <tr>
          <th
            className={cx("relative flex w-full h-0.5 overflow-hidden", colors("divide-background"))}
            colSpan={columns.length + (settings.showRowNumbers ? 1 : 0)}
          >
            <div className="rail absolute top-0 left-0 w-full h-full">
              <div className={cx("w-5 h-full", colors("selected:background"))}></div>
            </div>
          </th>
        </tr>
      </thead>
    );
  },
  (prev, next) => prev.refreshRevision === next.refreshRevision,
);

TableViewHeader.displayName = "TableViewHeader";

/**
 * A component that display a row in the table.
 *
 * This component is memoized to avoid re-rendering whenever possible.
 */
const TableViewRow = memo(
  ({
    rowNum,
    columns,
    data,
    top,
    settings,
    classes,
  }: {
    refreshRevision: number;
    rowNum: number;
    columns: Column[];
    data: Row;
    top: number;
    settings: TableSettings;
    classes: {
      tr: {
        self: string;
        rowNum: {
          self: string;
          div: string;
        };
      };
    };
  }) => {
    console.debug("rendering row ", rowNum);
    return (
      <tr
        className={classes.tr.self}
        key={rowNum}
        style={{
          display: "flex",
          position: "absolute",
          transform: `translateY(${top}px)`, // must be a `style` as it changes on scroll
          width: "100%",
        }}
      >
        {settings.showRowNumbers && (
          <td scope="col" className={classes.tr.rowNum.self}>
            <div className={classes.tr.rowNum.div}>{rowNum}</div>
          </td>
        )}
        {data ? <DataCells columns={columns} data={data} /> : <SkeletonCells columns={columns} />}
      </tr>
    );
  },
  (prev, next) => {
    if (prev.data === null && next.data !== null) {
      // The row data were loading but now they are available
      return false;
    } else {
      return prev.refreshRevision === next.refreshRevision;
    }
  },
);

TableViewRow.displayName = "TableViewRow";

/**
 * A component that display the cells of a row when the data is not available.
 *
 * Note: This component does not render the first cell of the row (the row number).
 */
function SkeletonCells({ columns }: { columns: Column[] }) {
  return (
    <>
      {columns.map((column, i) => {
        const classes = {
          ...column.cellClasses,
          div: cx(
            column.cellClasses.div,
            secondary("background"),
            column.format.name === "boolean" ? "w-4 rounded-full" : "rounded w-3/4",
          ),
        };
        return (
          <td key={i} scope="col" className={classes.self} style={{ width: column.width + "px" }}>
            <div className={classes.div}></div>
          </td>
        );
      })}
    </>
  );
}

/**
 * A component that display the cells of a row when the data is available.
 */
function DataCells({ columns, data }: { columns: Column[]; data: Row }) {
  return (
    <>
      {columns.map((column, i) => {
        const classes = {
          ...column.cellClasses,
          div: cx(column.cellClasses.div),
        };
        let children: string | React.ReactNode = data[i];
        switch (column.format.name) {
          case "boolean":
            children = data[i] === "true" ? <TrueIcon /> : <FalseIcon />;
            break;
        }
        return (
          <td key={i} scope="col" className={classes.self} style={{ width: column.width + "px" }}>
            <div className={classes.div}>{children}</div>
          </td>
        );
      })}
    </>
  );
}

/**
 * An helper function to apply sticky column classes to the given.
 */
function buildColumnClasses(
  column: Partial<Column> | null,
  index: number,
  columns: Partial<Column>[],
  header: boolean,
  tableProps: Partial<TableViewProps>,
): ColumnClasses {
  if (index === -1) {
    // Row number column
    return {
      self: cx(
        "flex w-10 justify-end items-center font-light sticky left-0 z-1 opacity-100 font-mono pr-2",
        colors("background"),
      ),
      div: "",
    };
  } else {
    return {
      self: cx(
        "flex",
        tableProps.settings.density === "compact" && "p-1",
        tableProps.settings.density === "comfortable" && "px-6 py-3",
        column.sticky ? "" /** TODO: add support for sticky columns */ : "grow",
        column.format.name === "boolean" && "justify-center",
        column.format.name === "int" && "justify-end",
        column.format.name === "float" && "justify-end",
        column.format.name === "money" && "justify-end",
      ),
      div: cx("truncate h-4"),
    };
  }
}

/**
 * Get an estimation of the height of a row in the table.
 */
function getEstimatedRowHeight({ density, dividers }: TableSettings): number {
  let height = 16; /* h-4 */
  if (density === "compact") {
    height += 4 * 2 /* p-1 */;
  } else {
    height += 12 * 2 /* py-3 */;
  }

  // FIXME: seems like divider should be taken into account but the dividers="grid" is having 1 pixel space between rows
  // if adding that pixel to the estimated height.
  if (false && dividers !== "none" /* eslint-disable-line no-constant-condition */) {
    height += 1 /* divide-y */;
  }
  return height;
}

function getSlicesOffsetsFromRange(
  range: { startIndex: number; endIndex: number },
  overscan: number,
  dataframeSize: number,
  fetchSize: number,
): Array<number> {
  const offsets = Array<number>();
  if (range !== null) {
    const startIndex = Math.max(0, range.startIndex - overscan);
    const endIndex = Math.min(Math.max(0, dataframeSize - 1), range.endIndex + overscan);
    let offset = startIndex - (startIndex % fetchSize);
    do {
      offsets.push(offset);
      offset += fetchSize;
    } while (offset < endIndex);
  }
  return offsets;
}

function getRowData(data: Array<DataFrameSlice<Row>>, rowOffset: number, fetchSize: number): Row | null {
  const sliceOffset = rowOffset - (rowOffset % fetchSize);
  const slice = data.find((slice) => slice.offset === sliceOffset);
  if (slice) {
    return slice.data[rowOffset - sliceOffset];
  } else {
    return null;
  }
}
