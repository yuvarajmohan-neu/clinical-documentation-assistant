import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "../auth";
import { App } from "../App";

describe("SignInScreen", () => {
  it("shows Jewish Board branding and a sign-in button when signed out", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    expect(screen.getByRole("heading", { name: "The Jewish Board" })).toBeInTheDocument();
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
