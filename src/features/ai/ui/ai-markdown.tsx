import { Fragment, useId, type ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

import { inlineText, outline, type Block, type Inline } from "../model/markdown";
import { formatCell, isNumericColumn } from "../model/numbers";

/**
 * AI javobi Markdown daraxtidan: bo'limlar (eng yuqori sarlavha bo'yicha) chiziq bilan ajraladi,
 * jadval — sarlavhasi muzlatilgan, raqamli ustunlar o'ngda va panel formatida, telefonda
 * gorizontal aylanadi. Faqat React elementlari — AI matni HTML sifatida bajarilmaydi.
 */
type AiMarkdownProps = {
  blocks: readonly Block[];
  /** Uch va undan ko'p bo'limda yuqorida mundarija (bo'limga o'tish). */
  contentsLabel?: string;
  /** Chop etish (PDF) ko'rinishi: aylantirish yo'q, jadval to'liq kenglikda. */
  print?: boolean;
  className?: string;
};

export const AiMarkdown = ({ blocks, contentsLabel, print = false, className }: AiMarkdownProps) => {
  const prefix = useId();
  const { intro, sections } = outline(blocks);
  const anchor = (index: number) => `${prefix}-section-${index}`;

  return (
    <div className={cn("text-ink flex min-w-0 flex-col gap-4 text-sm leading-relaxed", className)}>
      {intro.length > 0 ? <Blocks blocks={intro} print={print} /> : null}
      {contentsLabel && sections.length >= 3 && !print ? (
        <nav aria-label={contentsLabel} className="flex flex-wrap items-center gap-1.5">
          <span className="text-2xs text-ink-3 me-1 font-semibold tracking-wide uppercase">
            {contentsLabel}
          </span>
          {sections.map((section, index) => (
            <a
              key={anchor(index)}
              href={`#${anchor(index)}`}
              className="bg-surface-3 text-ink-2 hover:text-ink hover:bg-accent-soft rounded-full px-2.5 py-0.5 text-xs transition-colors"
            >
              {inlineText(section.heading.content)}
            </a>
          ))}
        </nav>
      ) : null}
      {sections.map((section, index) => (
        <section
          key={anchor(index)}
          id={anchor(index)}
          aria-labelledby={`${anchor(index)}-title`}
          className={cn(
            "flex scroll-mt-24 flex-col gap-3",
            (index > 0 || intro.length > 0) && "border-t pt-4",
            print && "break-inside-avoid-page",
          )}
        >
          <Heading id={`${anchor(index)}-title`} level={0}>
            <Inlines nodes={section.heading.content} />
          </Heading>
          <Blocks blocks={section.blocks} print={print} topLevel={section.heading.level} />
        </section>
      ))}
    </div>
  );
};

const HEADING_STYLES = [
  "font-display text-xl text-ink",
  "text-md font-semibold text-ink",
  "text-sm font-semibold text-ink-2",
] as const;

/** `level` — bo'lim ichidagi nisbiy daraja (0 — bo'lim sarlavhasi). Sahifada h1/h2 band. */
const Heading = ({ id, level, children }: { id?: string; level: number; children: ReactNode }) => {
  const relative = level;
  const className = HEADING_STYLES[Math.min(relative, HEADING_STYLES.length - 1)];
  if (relative === 0)
    return (
      <h3 id={id} className={className}>
        {children}
      </h3>
    );
  if (relative === 1)
    return (
      <h4 id={id} className={className}>
        {children}
      </h4>
    );
  return (
    <h5 id={id} className={className}>
      {children}
    </h5>
  );
};

const Blocks = ({
  blocks,
  print,
  topLevel = 0,
}: {
  blocks: readonly Block[];
  print: boolean;
  topLevel?: number;
}) => (
  <>
    {blocks.map((block, index) => (
      <BlockView key={index} block={block} print={print} topLevel={topLevel} />
    ))}
  </>
);

const BlockView = ({ block, print, topLevel }: { block: Block; print: boolean; topLevel: number }) => {
  switch (block.type) {
    case "heading":
      return (
        <Heading level={Math.max(1, block.level - topLevel)}>
          <Inlines nodes={block.content} />
        </Heading>
      );
    case "paragraph":
      return (
        <p className="whitespace-pre-line">
          <Inlines nodes={block.content} />
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          start={block.ordered && block.start !== 1 ? block.start : undefined}
          className={cn(
            "flex flex-col gap-1.5 ps-5",
            block.ordered
              ? "marker:text-ink-3 list-decimal marker:font-semibold"
              : "marker:text-accent list-disc",
          )}
        >
          {block.items.map((item, index) => (
            <li key={index} className="ps-1">
              <span className="whitespace-pre-line">
                <Inlines nodes={item.content} />
              </span>
              {item.children.length > 0 ? (
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <Blocks blocks={item.children} print={print} topLevel={topLevel} />
                </div>
              ) : null}
            </li>
          ))}
        </Tag>
      );
    }
    case "table":
      return <TableView block={block} print={print} />;
    case "quote":
      return (
        <blockquote className="border-accent bg-accent-soft/40 text-ink-2 flex flex-col gap-2 rounded-e-xl border-s-2 px-4 py-2.5">
          <Blocks blocks={block.children} print={print} topLevel={topLevel} />
        </blockquote>
      );
    case "code":
      return (
        <pre className="bg-surface-3 num overflow-x-auto rounded-xl px-3.5 py-2.5 text-xs whitespace-pre">
          {block.value}
        </pre>
      );
    case "rule":
      return <hr className="my-1" />;
  }
};

const TableView = ({ block, print }: { block: Block & { type: "table" }; print: boolean }) => {
  const numeric = block.header.map((_, column) =>
    isNumericColumn(block.rows.map((row) => inlineText(row[column] ?? []))),
  );
  const alignOf = (column: number) => {
    const align = block.align[column] ?? (numeric[column] ? "right" : "left");
    return align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  };

  return (
    <div
      // Telefonda keng jadval sahifani emas, o'zini aylantiradi; klaviatura bilan ham (tabIndex).
      tabIndex={print ? undefined : 0}
      className={cn(
        "rounded-xl border",
        print
          ? "break-inside-avoid"
          : "focus-visible:ring-accent/40 max-w-full overflow-x-auto focus-visible:ring-2",
      )}
    >
      <table className="w-full border-collapse text-sm">
        <thead className="bg-surface-2">
          <tr>
            {block.header.map((cell, column) => (
              <th
                key={column}
                scope="col"
                className={cn(
                  "text-2xs text-ink-2 border-b px-3 py-2 font-semibold tracking-wide whitespace-nowrap uppercase",
                  alignOf(column),
                )}
              >
                <Inlines nodes={cell} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, index) => (
            <tr key={index} className="even:bg-surface-2/50 border-b last:border-b-0">
              {row.map((cell, column) => (
                <td
                  key={column}
                  className={cn(
                    "px-3 py-2 align-top",
                    alignOf(column),
                    numeric[column] && "num whitespace-nowrap",
                    column === 0 && "font-medium",
                  )}
                >
                  {numeric[column] && cell.length === 1 && cell[0]?.type === "text" ? (
                    formatCell(cell[0].value)
                  ) : (
                    <Inlines nodes={cell} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Inlines = ({ nodes }: { nodes: readonly Inline[] }) => (
  <>
    {nodes.map((node, index) => (
      <Fragment key={index}>
        <InlineView node={node} />
      </Fragment>
    ))}
  </>
);

const InlineView = ({ node }: { node: Inline }) => {
  switch (node.type) {
    case "text":
      return node.value;
    case "strong":
      return (
        <strong className="text-ink font-semibold">
          <Inlines nodes={node.children} />
        </strong>
      );
    case "em":
      return (
        <em>
          <Inlines nodes={node.children} />
        </em>
      );
    case "code":
      return <code className="bg-surface-3 num rounded-sm px-1 py-0.5 text-xs">{node.value}</code>;
  }
};
