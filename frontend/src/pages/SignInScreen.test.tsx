import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth";
import { App } from "../App";

describe("SignInScreen", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_AUTH_PROVIDER", "dev");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows Jewish Board branding and a sign-in button when signed out", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    expect(screen.getAllByRole("heading", { name: "The Jewish Board" })).toHaveLength(2);
    expect(screen.getByText("Care for all New Yorkers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("signs the demo clinician in after clicking Sign in", async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText(/Signed in as Demo Clinician/)).toBeInTheDocument();
    });
    expect(screen.getByText(/article31/)).toBeInTheDocument();
  });
});
