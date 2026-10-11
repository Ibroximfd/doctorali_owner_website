// @vitest-environment jsdom
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { Toaster, toast } from "sonner";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { parseJson } from "@/shared/lib/envelope";
import { mockGet } from "@/shared/testing/mock-api";
import { renderWithProviders } from "@/shared/testing/render";
import { server, useMockApi } from "@/shared/testing/server";

import { alertRulesResponseSchema } from "../model/alerts.schema";
import { AlertRulesCard } from "./alert-rules-card";

const NBSP = " ";

const UNASSIGNED = "Tasdiqlangan buyurtma kuryersiz";
const COD = "Kuryerda topshirilmagan naqd";
const SHIPPING = "Yo'lda kechikish";
const REVENUE_DROP = "Tushum pasayishi (o'rtachadan)";

const renderCard = () =>
  renderWithProviders(
    <>
      <AlertRulesCard />
      <Toaster />
    </>,
  );

/** Namuna serverida saqlangan qoida — saqlash haqiqatan yetib borganini shu bilan tekshiramiz. */
const savedRule = (code: string) => {
  const rule = parseJson(alertRulesResponseSchema, mockGet("alerts/rules/")).results.find(
    (item) => item.code === code,
  );
  if (!rule) throw new Error(`"${code}" qoidasi namunada yo'q`);
  return rule;
};

const savedRulesCount = (): number =>
  parseJson(alertRulesResponseSchema, mockGet("alerts/rules/")).results.length;

describe("AlertRulesCard", () => {
  useMockApi();

  /** Yuborilgan saqlash so'rovlari (yo'l bo'yicha) — "saqlanmadi" holatlarini tekshirish uchun. */
  const patches: string[] = [];
  const recordPatch = ({ request }: { request: Request }) => {
    if (request.method === "PATCH") patches.push(new URL(request.url).pathname);
  };

  beforeAll(() => server.events.on("request:start", recordPatch));
  afterAll(() => server.events.removeListener("request:start", recordPatch));
  beforeEach(() => {
    patches.length = 0;
  });
  // sonner bildirishnomalarni global saqlaydi — keyingi testga o'tmasin
  afterEach(() => {
    toast.dismiss();
  });

  it("shows one row per rule: label, threshold with its unit and the enabled switch", async () => {
    await renderCard();

    const unassigned = await screen.findByLabelText(UNASSIGNED);
    expect(unassigned).toHaveValue("3");
    expect(unassigned).toHaveAccessibleDescription("soat");
    expect(screen.getByLabelText(COD)).toHaveValue(`5${NBSP}000${NBSP}000`);
    expect(screen.getByLabelText(COD)).toHaveAccessibleDescription("so'm");
    expect(screen.getByLabelText("Kunlik atkaz ulushi")).toHaveAccessibleDescription("%");

    expect(screen.getAllByRole("switch")).toHaveLength(savedRulesCount());
    expect(screen.getByRole("switch", { name: `${UNASSIGNED} — yoqish` })).toBeChecked();
    expect(screen.getByRole("switch", { name: `${REVENUE_DROP} — yoqish` })).not.toBeChecked();
  });

  it("saves a changed threshold when the field loses focus and confirms it", async () => {
    const user = userEvent.setup();
    await renderCard();
    const field = await screen.findByLabelText(SHIPPING);

    await user.clear(field);
    await user.type(field, "36");
    await user.tab();

    expect(await screen.findByText("Saqlandi")).toBeInTheDocument();
    expect(patches).toEqual(["/api/owner/alerts/rules/orders.shipping_late/"]);
    expect(savedRule("orders.shipping_late").params.threshold).toBe(36);
    await waitFor(() => expect(screen.getByLabelText(SHIPPING)).toHaveValue("36"));
  });

  it("accepts grouped thousands, saves on Enter and shows the value formatted again", async () => {
    const user = userEvent.setup();
    await renderCard();
    const field = await screen.findByLabelText(COD);

    await user.clear(field);
    await user.type(field, "7 500 000{Enter}");

    await waitFor(() => expect(savedRule("cod.unsettled").params.threshold).toBe(7_500_000));
    await waitFor(() => expect(screen.getByLabelText(COD)).toHaveValue(`7${NBSP}500${NBSP}000`));
  });

  it("sends nothing when the value did not change", async () => {
    const user = userEvent.setup();
    await renderCard();
    const field = await screen.findByLabelText(UNASSIGNED);
    const current = savedRule("orders.unassigned_courier").params.threshold;

    await user.click(field);
    await user.tab();
    await user.clear(field);
    await user.type(field, String(current));
    await user.tab();

    expect(field).toHaveValue(String(current));
    expect(patches).toEqual([]);
    expect(screen.queryByText("Saqlandi")).not.toBeInTheDocument();
  });

  it.each(["-5", "abc", ""])("rejects %j on the field and sends nothing", async (text) => {
    const user = userEvent.setup();
    await renderCard();
    const field = await screen.findByLabelText(UNASSIGNED);
    const before = savedRule("orders.unassigned_courier").params.threshold;

    await user.clear(field);
    if (text !== "") await user.type(field, text);
    await user.tab();

    expect(await screen.findByRole("alert")).toHaveTextContent("Manfiy bo'lmagan son kiriting");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/Manfiy bo'lmagan son kiriting/);
    expect(patches).toEqual([]);
    expect(savedRule("orders.unassigned_courier").params.threshold).toBe(before);

    // xato yozishni davom ettirganda yo'qoladi
    await user.type(field, "4");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("turns a rule on with the switch right away", async () => {
    const user = userEvent.setup();
    await renderCard();
    const toggle = await screen.findByRole("switch", { name: `${REVENUE_DROP} — yoqish` });
    const wasEnabled = savedRule("revenue.drop").enabled;

    await user.click(toggle);

    expect(await screen.findByText("Saqlandi")).toBeInTheDocument();
    expect(savedRule("revenue.drop").enabled).toBe(!wasEnabled);
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: `${REVENUE_DROP} — yoqish` })).toHaveAttribute(
        "aria-checked",
        String(!wasEnabled),
      ),
    );
  });

  it("keeps what was typed and says so when saving fails", async () => {
    server.use(
      http.patch("*/api/owner/alerts/rules/:code/", () =>
        HttpResponse.json({ code: "server_error", detail: "server_error" }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    await renderCard();
    const field = await screen.findByLabelText("Kutilmoqda turgan buyurtma");

    await user.clear(field);
    await user.type(field, "12");
    await user.tab();

    expect(await screen.findByText("Saqlab bo'lmadi. Qayta urinib ko'ring.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Kutilmoqda turgan buyurtma")).toBeEnabled());
    expect(screen.getByLabelText("Kutilmoqda turgan buyurtma")).toHaveValue("12");
    expect(savedRule("orders.pending_stale").params.threshold).toBe(24);
  });

  it("offers a retry when the rules fail to load and recovers", async () => {
    // Ikki marta yiqiladi (so'rov + klientning bitta avtomatik takrori), keyin odatdagi javobga o'tadi.
    let failuresLeft = 2;
    server.use(
      http.get("*/api/owner/alerts/rules/", () => {
        if (failuresLeft === 0) return undefined;
        failuresLeft -= 1;
        return HttpResponse.json({ code: "server_error", detail: "server_error" }, { status: 500 });
      }),
    );
    const user = userEvent.setup();
    await renderCard();

    await user.click(await screen.findByRole("button", { name: "Qayta urinish" }));

    expect(await screen.findByLabelText(UNASSIGNED)).toBeInTheDocument();
  });

  it("shows the empty state when no rules are configured", async () => {
    server.use(http.get("*/api/owner/alerts/rules/", () => HttpResponse.json({ results: [] })));
    await renderCard();

    expect(await screen.findByText("Bu davrda ma'lumot yo'q")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Signal chegaralari" })).toBeInTheDocument();
  });
});
