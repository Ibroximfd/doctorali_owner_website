"use client";

import { useEffect } from "react";

type GlobalErrorProps = { error: Error & { digest?: string }; reset: () => void };

/**
 * Ildiz layoutning o'zi yiqilganda ko'rinadi — provayderlar va tarjima yo'q,
 * shuning uchun matn ikki tilda, uslub minimal.
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
            padding: 24,
          }}
        >
          <div>
            <h1 style={{ fontSize: 20, margin: 0 }}>Nimadir xato ketdi · Что-то пошло не так</h1>
            <p style={{ color: "#727c75", margin: "8px 0 16px" }}>Sahifani qayta yuklab ko&apos;ring.</p>
            <button
              type="button"
              onClick={reset}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 8,
                border: "1px solid #cbd2cc",
                background: "#fff",
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
