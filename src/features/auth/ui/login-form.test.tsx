// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/shared/testing/render";
import { server, useMockApi } from "@/shared/testing/server";

import { LoginForm } from "./login-form";

const challenge = { challenge_id: "c-1", method: "sms", phone_masked: "+998 90 *** ** 67" };
const user = { id: 1, full_name: "Boshliq", role: "owner", sections: [], filials: [], mask_pii: false };

const fillCredentials = async () => {
  await userEvent.type(screen.getByLabelText("Login"), "devtest");
  await userEvent.type(screen.getByLabelText("Parol"), "namuna-parol");
  await userEvent.click(screen.getByRole("button", { name: "Davom etish" }));
};

describe("LoginForm", () => {
  useMockApi();
  const assign = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, origin: "http://localhost:3000", assign });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    assign.mockReset();
  });

  it("requires both fields before asking the server", async () => {
    await renderWithProviders(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "Davom etish" }));

    expect(await screen.findByText("Loginni kiriting")).toBeInTheDocument();
    expect(screen.getByText("Parolni kiriting")).toBeInTheDocument();
    expect(screen.getByLabelText("Login")).toHaveAttribute("aria-invalid", "true");
  });

  it("accepts a plain login and sends it as typed", async () => {
    let sent: unknown;
    server.use(
      http.post("*/api/auth/login", async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json(challenge);
      }),
    );
    await renderWithProviders(<LoginForm />);

    await userEvent.type(screen.getByLabelText("Login"), "devtest");
    await userEvent.type(screen.getByLabelText("Parol"), "namuna-parol");
    await userEvent.click(screen.getByRole("button", { name: "Davom etish" }));

    await vi.waitFor(() => expect(sent).toEqual({ username: "devtest", password: "namuna-parol" }));
  });

  it("clears a field's error as soon as it is filled in", async () => {
    await renderWithProviders(<LoginForm />);

    await userEvent.click(screen.getByLabelText("Parol"));
    await userEvent.tab();
    expect(await screen.findByText("Parolni kiriting")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Parol"), "namuna-parol");

    expect(screen.queryByText("Parolni kiriting")).not.toBeInTheDocument();
  });

  it("signs in with login and password alone when the backend skips the SMS step", async () => {
    server.use(http.post("*/api/auth/login", () => HttpResponse.json({ user })));
    await renderWithProviders(<LoginForm next="/sales?period=7d" />);

    await fillCredentials();

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/sales?period=7d"));
    expect(screen.queryByLabelText("6 xonali kod")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tekshirilmoqda…" })).toBeDisabled();
  });

  it("walks through both steps when the backend asks for a code, and returns to the requested page", async () => {
    server.use(
      http.post("*/api/auth/login", () => HttpResponse.json(challenge)),
      http.post("*/api/auth/verify", () => HttpResponse.json({ user })),
    );
    await renderWithProviders(<LoginForm next="/finance?period=7d" />);

    await fillCredentials();
    expect(await screen.findByText(/\+998 90 \*\*\* \*\* 67 raqamiga SMS yuborildi/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("6 xonali kod"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Kirish" }));

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/finance?period=7d"));
  });

  it("hands control back instead of navigating when the caller continues the flow", async () => {
    server.use(
      http.post("*/api/auth/login", () => HttpResponse.json(challenge)),
      http.post("*/api/auth/verify", () => HttpResponse.json({ user })),
    );
    const onSignedIn = vi.fn();
    await renderWithProviders(<LoginForm onSignedIn={onSignedIn} />);

    await fillCredentials();
    await userEvent.type(await screen.findByLabelText("6 xonali kod"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Kirish" }));

    await vi.waitFor(() => expect(onSignedIn).toHaveBeenCalledOnce());
    expect(assign).not.toHaveBeenCalled();
  });

  it("shows the lock message the server sends after too many attempts", async () => {
    server.use(
      http.post("*/api/auth/login", () =>
        HttpResponse.json({ code: "login_locked", detail: "login_locked" }, { status: 403 }),
      ),
    );
    await renderWithProviders(<LoginForm />);

    await fillCredentials();

    expect(
      await screen.findByText("Juda ko'p urinish. 15 daqiqadan so'ng qayta urinib ko'ring."),
    ).toBeInTheDocument();
  });

  it("never follows a return address that leaves the site", async () => {
    server.use(
      http.post("*/api/auth/login", () => HttpResponse.json(challenge)),
      http.post("*/api/auth/verify", () => HttpResponse.json({ user })),
    );
    await renderWithProviders(<LoginForm next="//evil.example/steal" />);

    await fillCredentials();
    await userEvent.type(await screen.findByLabelText("6 xonali kod"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Kirish" }));

    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
  });

  it("says the credentials are wrong without revealing which one", async () => {
    server.use(
      http.post("*/api/auth/login", () =>
        HttpResponse.json({ code: "invalid_credentials" }, { status: 401 }),
      ),
    );
    await renderWithProviders(<LoginForm />);

    await fillCredentials();

    expect(await screen.findByText("Login yoki parol noto'g'ri")).toBeInTheDocument();
  });

  it("explains the lock after too many attempts", async () => {
    server.use(
      http.post("*/api/auth/login", () => HttpResponse.json({ code: "login_locked" }, { status: 429 })),
    );
    await renderWithProviders(<LoginForm />);

    await fillCredentials();

    expect(await screen.findByText(/Juda ko'p urinish/)).toBeInTheDocument();
  });

  it("rejects a wrong code and keeps the owner on the code step", async () => {
    server.use(
      http.post("*/api/auth/login", () => HttpResponse.json(challenge)),
      http.post("*/api/auth/verify", () => HttpResponse.json({ code: "invalid_code" }, { status: 400 })),
    );
    await renderWithProviders(<LoginForm />);

    await fillCredentials();
    await userEvent.type(await screen.findByLabelText("6 xonali kod"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Kirish" }));

    expect(await screen.findByText("Kod noto'g'ri yoki muddati o'tgan")).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("validates the code format before sending it", async () => {
    server.use(http.post("*/api/auth/login", () => HttpResponse.json(challenge)));
    await renderWithProviders(<LoginForm />);

    await fillCredentials();
    await userEvent.type(await screen.findByLabelText("6 xonali kod"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Kirish" }));

    expect(await screen.findByText("6 ta raqam kiriting")).toBeInTheDocument();
  });
});
