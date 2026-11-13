import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth";
import { App } from "../App";
import { mockFetch, programsFixture, sessionFixture } from "../test/fixtures";

afterEach(() => vi.unstubAllGlobals());

describe("SignInScreen", () => {
  it("shows Jewish Board branding and a sign-in button when signed out", () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    expect(screen.getByRole("img", { name: "The Jewish Board" })).toBeInTheDocument();
    expect(screen.getByText("Care for all New Yorkers")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("signs the demo clinician in and lands on Session setup", async () => {
    mockFetch((url) => ({ body: url.endsWith("/programs") ? programsFixture : [sessionFixture] }));
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Set up your session" })).toBeInTheDocument();
    expect(screen.getByText("Demo Clinician")).toBeInTheDocument();
    // Two program roles → the picker shows, with programs outside the role locked.
    expect(await screen.findByRole("radio", { name: /Article 31 Outpatient Clinic/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Adult ACT/ })).toBeDisabled();
    expect(await screen.findByText("Jamie Rivera (synthetic)")).toBeInTheDocument();
  });
});
