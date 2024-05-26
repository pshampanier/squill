import cx from "classix";
import { DatasetAttribute } from "@/models/dataset-attribute";
import { Collection, Dataset } from "@/utils/dataset";
import { primary as colors, secondary as headerColors, secondary } from "@/utils/colors";
import { useEffect, useRef, useState } from "react";
import TrueIcon from "@/icons/true.svg?react";
import FalseIcon from "@/icons/false.svg?react";
import { raise } from "@/utils/telemetry";

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
  dataset: Dataset<string[]>;
};

/**
 * A table view component that displays a dataset in a table.
 *
 * The cells in the table are rendered based on the format of the column.
 * The table will load the rows as needed and display a placeholder at the end of the table until all the rows have been
 * loaded.
 */
export default function TableView({ className, dataset }: TableViewProps) {
  // The rows to display in the table.
  const [rows, setRows] = useState<Collection<string[]>>([]);

  // The table is ready when all the rows have been loaded.
  const [ready, setReady] = useState(false);

  // Get the schema of the dataset to determine the columns.
  const schema = dataset.getSchema();
  if (schema.type !== "array" || dataset.getSchema().items === undefined) {
    raise("The table view only supports datasets with an array schema.");
  }
  const columns = dataset.getSchema().items;

  // Load the next batch of rows when the placeholder placed at the bottom of the list becomes visible.
  // @see RowPlaceholder
  const handleOnRowPlaceHolderVisible = (offset: number) => {
    console.log("Loading more rows from offset", offset);
    dataset.getFragment(offset, 100).then(([data, done]) => {
      setRows([...rows, ...data]);
      if (done) {
        setReady(true);
      }
    });
  };

  // Instead of trying to find the right component for each cell, we create a list of components to be used for each
  // column. This way we avoid the overhead of finding the right component for each cell.
  const columnComponents: React.FunctionComponent<CellProps>[] = columns.map((attr: DatasetAttribute) => {
    switch (attr.format?.name) {
      case "boolean":
        return BooleanCell;
      case "int":
      case "float":
      case "money":
        return RightAlignCell;
      case "color":
        return ColorCell;
      default:
        return DefaultCell;
    }
  });

  return (
    <div className={cx("w-full overflow-auto rounded", className)}>
      <table className={cx("w-full text-sm text-left select-none", colors("background", "text"))}>
        <thead className={cx("text-xs uppercase sticky top-0", headerColors("background", "text"))}>
          <TableHeader attributes={columns} />
        </thead>
        <tbody className={cx("divide-y", colors("divide"))}>
          {rows.map((row, rowIndex) => {
            return (
              <tr key={rowIndex} className="">
                {row.map((cell, cellIndex) => {
                  const Cell = columnComponents[cellIndex];
                  return <Cell key={cellIndex} attr={columns[cellIndex]} value={cell} index={cellIndex} />;
                })}
              </tr>
            );
          })}
          {!ready && (
            <RowPlaceholder
              key={rows.length}
              attributes={columns}
              offset={rows.length}
              onVisible={handleOnRowPlaceHolderVisible}
            />
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The table header rendered at the top of the table with column names.
 */
function TableHeader({ attributes }: { attributes: DatasetAttribute[] }) {
  return (
    <tr>
      {attributes.map((attribute, index) => (
        <th key={index} scope="col" className="px-6 py-3">
          {attribute.name}
        </th>
      ))}
    </tr>
  );
}

/**
 * An individual cell in the table.
 */
function TableCell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <td className={cx("px-6 py-4 whitespace-nowrap select-text", className)}>{children}</td>;
}

type RowPlaceholderProps = {
  attributes: DatasetAttribute[];
  offset: number;
  onVisible: (offset: number) => void;
};

/**
 * A placeholder row that is displayed at the end of the table.
 *
 * Until the table has loaded all the rows, a placeholder is displayed at the end of the table and when it becomes
 * visible trigger the load more rows.
 */
function RowPlaceholder({ attributes, offset, onVisible }: RowPlaceholderProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisible(offset);
        }
      },
      { threshold: 0.1 } // Adjust this value to when you want the callback to fire
    );

    if (rowRef.current) {
      observer.observe(rowRef.current);
    }

    return () => {
      if (rowRef.current) {
        observer.unobserve(rowRef.current);
      }
    };
  }, []);
  return (
    <tr ref={rowRef}>
      {attributes.map((attribute, index) => {
        const classes = {
          td: cx("px-6 py-4 whitespace-nowrap", attribute.type === "boolean" && "flex justify-center items-center"),
          div: cx(
            "animate-pulse h-4",
            secondary("background"),
            attribute.type === "boolean" && "w-4 rounded-full justify-center",
            attribute.type !== "boolean" && "w-15 rounded"
          ),
        };
        return (
          <td key={index} className={classes.td}>
            <div className={classes.div}></div>
          </td>
        );
      })}
    </tr>
  );
}

type CellProps = {
  /**
   * The description of the column.
   */
  attr: DatasetAttribute;

  /**
   * The value to display in the cell.
   */
  value: string;

  /**
   * The index of the cell in the row.
   */
  index: number;
};

/**
 * The default cell component.
 */
function DefaultCell({ value }: CellProps) {
  return <TableCell>{value}</TableCell>;
}

/**
 * A table cell that displays a boolean value as an icon.
 */
function BooleanCell({ value }: CellProps) {
  return (
    <TableCell>
      <div className="flex justify-center">{value === "true" ? <TrueIcon /> : <FalseIcon />}</div>
    </TableCell>
  );
}

function ColorCell({ value }: CellProps) {
  return (
    <TableCell>
      <div className="flex items-center space-x-1">
        <div className="w-4 h-4 rounded" style={{ backgroundColor: value }}></div>
        <div>{value}</div>
      </div>
    </TableCell>
  );
}

/**
 * A table cell that is right-aligned.
 */
function RightAlignCell({ value }: CellProps) {
  return <TableCell className="text-right">{value}</TableCell>;
}
