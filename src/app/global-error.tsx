"use client";

import { useEffect } from "react";

type GlobalErrorProps = { error: Error & { digest?: string }; reset: () => void };

/**
 * Ildiz layoutning o'zi yiqilganda ko'rinadi — provayderlar va tarjima yo'q,
 * shuning uchun matn ikki tilda, uslub minimal va inline (globals.css tokenlari bu yerda yuklanmaydi —
 * ranglar «observatoriya» palitrasidan qo'lda ko'chirilgan).
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="uz">
      <body>
        <main
          style={{
            display: "grid",
            minHeight: "100dvh",
            placeItems: "center",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            background: "#050d09",
            color: "#e8f1ec",
            padding: 24,
          }}
        >
          <div>
            <h1 style={{ fontSize: 24, fontFamily: "Georgia, serif", fontWeight: 400, margin: 0 }}>
              Nimadir xato ketdi · Что-то пошло не так
            </h1>
            <p style={{ color: "#9db3a7", margin: "8px 0 16px" }}>Sahifani qayta yuklab ko&apos;ring.</p>
            <button
              type="button"
              onClick={reset}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 12,
                border: 0,
                background: "#3fd69a",
                color: "#04110b",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Qayta urinish
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
