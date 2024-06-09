import cx from "classix";
import { DatasetAttributeFormat } from "@/models/dataset-attribute-format";
import { primary as colors, secondary as headerColors, secondary } from "@/utils/colors";
import { DataFrame, DataFrameSlice } from "@/utils/dataframe";
import { useVirtualizer } from "@tanstack/react-virtual";
import { UseQueryResult, keepPreviousData, useQueries } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Duration } from "@/utils/duration";
import TrueIcon from "@/icons/true.svg?react";
import FalseIcon from "@/icons/false.svg?react";
import Spinner from "@/components/core/Spinner";
import ResizePanel from "@/components/core/ResizePanel";

export type ResizeObserver = (columnIndex: number, width: number) => void;

/**
 * A row of data to be displayed by the component.
 *
 * The row is an array of strings where each string represents the value to be displayed in the table cells.
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

  /**
   * The visual density of the table.
   */
  density?: "compact" | "normal";

  /**
   * Whether to display the row number in the first column.
   */
  displayRowNumber?: boolean;

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
  density = "normal",
  dataframe,
  fetchSize = 1000,
  overscan = 50,
  displayRowNumber = true,
}: TableViewProps) {
  // The height in pixels of a row in the table
  const estimatedRowHeight = getEstimatedRowHeight({ density });

  // The height in pixels of the entire table
  const estimatedTotalHeight = estimatedRowHeight * dataframe.getSizeHint();

  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState<Column[]>(null);

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
    [],
  );

  const { getVirtualItems, calculateRange } = useVirtualizer(virtualizerConfig);

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
          cellClasses: buildColumnClasses(column, index, columns, false, { density }),
        } as Column;
      });
    setColumns(columns);
  }, [density]);

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
    console.debug(`resizing column ${columnIndex} to ${width}px`);
  }, []);

  const handleResizeEnd = useCallback((columnIndex: number, width: number) => {
    console.debug(`resizing column ${columnIndex} to ${width}px completed`);
  }, []);

  console.debug(`rendering (slicesOffsets=${slicesOffsets}, range=${JSON.stringify(range)})`);
  if (!columns) {
    return null;
  } else {
    const classes = {
      container: cx("relative w-full h-full overflow-auto", className, colors("text", "background")),
      table: {
        self: cx("grid w-full text-left select-none border-collapse"),
        thead: {
          self: cx(
            "grid sticky top-0 z-50 text-xs uppercase font-semibold items-center",
            headerColors("text", "background"),
          ),
          tr: "flex w-full",
          th: cx("flex grow", density === "compact" && "p-1", density === "normal" && "px-6 py-3"),
          rowNum: buildColumnClasses(null, -1, columns, true, { density }),
        },
        tbody: {
          self: cx("relative grid w-full divide-y z-0", colors("divide")),
          rowNum: buildColumnClasses(null, -1, columns, false, { density }),
        },
      },
    };
    return (
      <div ref={containerRef} className={classes.container}>
        <table className={classes.table.self}>
          <TableViewHeader
            columns={columns}
            displayRowNumber={displayRowNumber}
            isFetching={isFetching}
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
                  displayRowNumber={displayRowNumber}
                  rowNumberClasses={classes.table.tbody.rowNum}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}

const TableViewHeader = memo(
  ({
    columns,
    displayRowNumber,
    isFetching,
    classes,
    onResize,
    onResizeEnd,
  }: {
    columns: Column[];
    displayRowNumber: boolean;
    isFetching: boolean;
    classes: { self: string; tr: string; th: string; rowNum: { self: string; div: string } };
    onResize: ResizeObserver;
    onResizeEnd: ResizeObserver;
  }) => {
    console.debug("rendering header", isFetching);
    return (
      <thead className={classes.self}>
        <tr className={classes.tr}>
          {displayRowNumber && (
            <th scope="col" className={classes.rowNum.self}>
              <div className={classes.rowNum.div}>{isFetching && <Spinner size="sm" />}</div>
            </th>
          )}
          {columns.map((column, i) => (
            <th
              key={i}
              scope="col"
              style={{ width: column.width + "px" }}
              className={cx(classes.th, column.format.name === "boolean" && "justify-center")}
            >
              <div className="truncate">{column.title}</div>
              <ResizePanel
                className="ml-auto"
                width={column.width}
                minWidth={column.width}
                onResize={(width) => onResize(i, width)}
                onResizeEnd={(width) => onResizeEnd(i, width)}
              />
            </th>
          ))}
        </tr>
      </thead>
    );
  },
  (prevProps, nextProps) => prevProps.isFetching === nextProps.isFetching,
);

TableViewHeader.displayName = "TableViewHeader";

const TableViewRow = memo(
  ({
    rowNum,
    columns,
    data,
    top,
    displayRowNumber,
    rowNumberClasses,
  }: {
    rowNum: number;
    columns: Column[];
    data: Row;
    top: number;
    displayRowNumber: boolean;
    rowNumberClasses: {
      self: string;
      div: string;
    };
  }) => {
    console.debug("rendering row ", rowNum);
    return (
      <tr
        className="z-0"
        key={rowNum}
        style={{
          display: "flex",
          position: "absolute",
          transform: `translateY(${top}px)`, // must be a `style` as it changes on scroll
          width: "100%",
        }}
      >
        {displayRowNumber && (
          <td scope="col" className={rowNumberClasses.self}>
            <div className={rowNumberClasses.div}>{rowNum}</div>
          </td>
        )}
        {data ? <DataCells columns={columns} data={data} /> : <SkeletonCells columns={columns} />}
      </tr>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.data === null && nextProps.data !== null) {
      // The row data were loading but now they are available
      return false;
    } else {
      return true;
    }
  },
);

TableViewRow.displayName = "TableViewRow";

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
        "flex w-10 justify-end items-center font-light sticky left-0 z-40 opacity-100 font-mono pr-2",
        header ? headerColors("background") : colors("background"),
      ),
      div: "",
    };
  } else {
    return {
      self: cx(
        "flex",
        tableProps.density === "compact" && "p-1",
        tableProps.density === "normal" && "px-6 py-3",
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
function getEstimatedRowHeight({ density }: Partial<TableViewProps>): number {
  if (density === "compact") {
    return 16 /* h-4 */ + 4 * 2 /* p-1 */ + 1 /* divide-y */;
  } else {
    return 16 /* h-4 */ + 12 * 2 /* py-3 */ + 1 /* divide-y */;
  }
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
