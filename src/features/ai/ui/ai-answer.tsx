"use client";

import { Check, Copy, FileDown, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useFormat } from "@/shared/hooks/use-format";
import { cn } from "@/shared/lib/cn";
import { downloadBytes } from "@/shared/lib/download";
import { buildXlsx, XLSX_MIME } from "@/shared/lib/xlsx";
import { Button } from "@/shared/ui/button";
import { PrintFrame } from "@/shared/ui/print-frame";

import { parseMarkdown, plainText, type Block } from "../model/markdown";
import { asksForReport, isStructured, reportFileName, reportSheets, reportTitle } from "../model/report";
import type { AiMessage } from "../model/ai.schema";
import { AiMarkdown } from "./ai-markdown";

const COPIED_MS = 2_000;

type AiAnswerProps = {
  /** Assistent javobi (matni — Markdown). */
  message: Pick<AiMessage, "id" | "text" | "toolsUsed" | "createdAt" | "model" | "attachments">;
  /** Shu javobga sabab bo'lgan savol — hisobot nomi va «hisobot so'radimi» uchun. */
  question: string | null;
};

/**
 * AI javobi: tartibli Markdown, manbalar, «nusxa olish» va hisobot fayllari. Savol hisobot
 * so'ragan bo'lsa (yoki javobda jadval/bo'limlar bo'lsa) oxirida Excel va PDF chiqadi; backend
 * tayyor fayl bersa (`attachments`) — u ham.
 */
export const AiAnswer = ({ message, question }: AiAnswerProps) => {
  const t = useTranslations("ai.chat");
  const blocks = useMemo(() => parseMarkdown(message.text), [message.text]);
  const report = asksForReport(question);
  const downloadable = report || isStructured(blocks);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <AiMarkdown blocks={blocks} contentsLabel={t("answer.contents")} />
      {message.toolsUsed.length > 0 ? (
        <div className="text-2xs text-ink-3 flex flex-wrap items-center gap-1.5">
          <span>{t("sources")}</span>
          <ul aria-label={t("sources")} className="flex flex-wrap gap-1">
            {message.toolsUsed.map((tool) => (
              <li key={tool} className="bg-surface-3 num rounded-sm px-1.5 py-0.5">
                {t.has(`tools.${tool}`) ? t(`tools.${tool}`) : tool}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <AnswerActions
        message={message}
        question={question}
        blocks={blocks}
        report={report}
        downloadable={downloadable}
      />
    </div>
  );
};

const AnswerActions = ({
  message,
  question,
  blocks,
  report,
  downloadable,
}: AiAnswerProps & { blocks: Block[]; report: boolean; downloadable: boolean }) => {
  const t = useTranslations("ai.chat.answer");
  const format = useFormat();
  const [copied, setCopied] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const title = reportTitle(blocks, question, t("fallbackTitle"));
  const at = message.createdAt ? new Date(message.createdAt) : new Date();
  const fileName = reportFileName(t("filePrefix"), Number.isNaN(at.getTime()) ? new Date() : at);
  const generatedAt = format.dateTime(at.toISOString());

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText(blocks));
      setCopied(true);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  const downloadExcel = () => {
    try {
      const sheets = reportSheets(blocks, {
        title,
        question,
        generatedAt,
        labels: {
          question: t("question"),
          generated: t("generated"),
          summarySheet: t("summarySheet"),
          tableSheet: t("tableSheet"),
        },
      });
      downloadBytes(buildXlsx(sheets), XLSX_MIME, `${fileName}.xlsx`);
    } catch {
      toast.error(t("excelFailed"));
    }
  };

  const readyFiles = message.attachments.filter((file) => file.status === "ready");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        report && downloadable && "bg-accent-soft/50 border-accent/20 rounded-2xl border px-3 py-2.5",
      )}
    >
      {report && downloadable ? (
        <p className="text-ink me-auto flex items-center gap-2 text-sm font-semibold">
          <FileDown aria-hidden className="text-accent size-4" />
          {t("reportReady")}
        </p>
      ) : null}
      {readyFiles.map((file) => (
        <Button key={file.id} size="sm" intent="primary" asChild>
          <a href={`/api/owner/ai/attachments/${file.id}/file/`} download>
            <FileDown aria-hidden />
            {file.title ?? t("serverFile", { format: file.format.toUpperCase() })}
          </a>
        </Button>
      ))}
      {downloadable ? (
        <>
          <Button size="sm" intent={report ? "primary" : "outline"} onClick={downloadExcel}>
            <FileSpreadsheet aria-hidden />
            {t("excel")}
          </Button>
          <Button
            size="sm"
            intent="outline"
            disabled={printing}
            aria-busy={printing}
            title={t("pdfHint")}
            onClick={() => setPrinting(true)}
          >
            {printing ? <Printer aria-hidden /> : <FileText aria-hidden />}
            {t("pdf")}
          </Button>
        </>
      ) : null}
      <Button size="sm" intent="ghost" onClick={() => void copy()} aria-live="polite">
        {copied ? <Check aria-hidden className="text-good" /> : <Copy aria-hidden />}
        {copied ? t("copied") : t("copy")}
      </Button>
      {printing ? (
        <PrintFrame title={fileName} onDone={() => setPrinting(false)}>
          <PrintedReport
            title={title}
            question={question}
            generatedAt={generatedAt}
            model={message.model}
            blocks={blocks}
          />
        </PrintFrame>
      ) : null}
    </div>
  );
};

/** PDF sahifasi: sarlavha, savol va vaqt, keyin javobning o'zi — ekrandagi bilan bir xil chizish. */
const PrintedReport = ({
  title,
  question,
  generatedAt,
  model,
  blocks,
}: {
  title: string;
  question: string | null;
  generatedAt: string;
  model: string | null;
  blocks: Block[];
}) => {
  const t = useTranslations("ai.chat.answer");
  return (
    <article className="bg-surface text-ink flex flex-col gap-5 p-2">
      <header className="flex flex-col gap-1.5 border-b pb-4">
        <p className="text-2xs text-ink-3 font-semibold tracking-wide uppercase">{t("printBrand")}</p>
        <h1 className="font-display text-2xl">{title}</h1>
        {question ? (
          <p className="text-ink-2 text-sm">
            {t("question")}: {question}
          </p>
        ) : null}
        <p className="text-ink-3 text-xs">
          {t("generated")}: {generatedAt}
          {model ? ` · ${model}` : ""}
        </p>
      </header>
      <AiMarkdown blocks={blocks} print />
      <footer className="text-ink-3 border-t pt-3 text-xs">{t("printFooter")}</footer>
    </article>
  );
};
