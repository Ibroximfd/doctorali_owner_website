"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PrintFrameProps = {
  /** Hujjat nomi — «PDF sifatida saqlash» da fayl nomi shu bo'ladi. */
  title: string;
  children: ReactNode;
  /** Chop etish oynasi yopildi (saqlandi yoki bekor qilindi). */
  onDone: () => void;
};

/** Uslublar yuklanishini kutish chegarasi — sekin tarmoqda chop etish osilib qolmasin. */
const STYLE_WAIT_MS = 2_000;
const PRINT_FALLBACK_MS = 60_000;
const BLANK_DOC = "<!doctype html><html><head><meta charset=\"utf-8\"></head><body></body></html>";

/**
 * Bir martalik chop etish (PDF): ko'rinmas `iframe` ga panel uslublari ko'chiriladi va
 * `children` portal bilan chiziladi — xuddi o'sha komponentlar va tokenlar. `iframe` da
 * `dark` sinfi yo'q: qog'oz doim yorug' mavzuda. Ochilgan sahifaga tegilmaydi.
 */
export const PrintFrame = ({ title, children, onDone }: PrintFrameProps) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    // `srcDoc` yuklangach (Firefox boshlang'ich about:blank ni keyin almashtiradi)
    if (!loaded || !doc) return;

    doc.title = title;
    doc.documentElement.lang = document.documentElement.lang;
    // next/font o'zgaruvchilari html sinfida; mavzu sinfi (`dark`) ko'chirilmaydi
    doc.documentElement.className = document.documentElement.className.replace(/\bdark\b/g, "").trim();
    doc.body.className = document.body.className;
    const loads: Promise<void>[] = [];
    for (const node of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
      const copy = doc.importNode(node, true);
      if (copy instanceof HTMLLinkElement)
        loads.push(
          new Promise((resolve) => {
            copy.addEventListener("load", () => resolve(), { once: true });
            copy.addEventListener("error", () => resolve(), { once: true });
          }),
        );
      doc.head.append(copy);
    }
    const page = doc.createElement("style");
    page.textContent = "@page { margin: 14mm 12mm; } html, body { background: var(--surface); }";
    doc.head.append(page);

    let cancelled = false;
    const ready = Promise.race([
      Promise.all(loads),
      new Promise((resolve) => setTimeout(resolve, STYLE_WAIT_MS)),
    ]);
    void ready.then(() => {
      if (!cancelled) setMount(doc.body);
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, title]);

  useEffect(() => {
    const view = frameRef.current?.contentWindow;
    if (!mount || !view) return;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done.current();
    };
    view.addEventListener("afterprint", finish, { once: true });
    // portal chizilib, shriftlar yuklansin — keyin chop etish oynasi
    const timer = setTimeout(() => {
      void view.document.fonts.ready.then(() => {
        view.focus();
        view.print();
        // zaxira: `afterprint` kelmagan brauzerda ham tugma bir daqiqadan keyin bo'shaydi
        setTimeout(finish, PRINT_FALLBACK_MS);
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [mount]);

  return (
    <>
      <iframe
        ref={frameRef}
        title={title}
        srcDoc={BLANK_DOC}
        onLoad={() => setLoaded(true)}
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none fixed start-0 top-0 size-0 border-0 opacity-0"
      />
      {mount ? createPortal(children, mount) : null}
    </>
  );
};
