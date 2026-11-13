import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth";
import { mockFetch, noteFixture, passingNote } from "../test/fixtures";
import { ReviewNote } from "./ReviewNote";

afterEach(() => vi.unstubAllGlobals());

const renderReview = (note = noteFixture()) =>
  render(
    <AuthProvider>
      <ReviewNote initialNote={note} onNavigate={() => {}} onNoteChange={() => {}} />
    </AuthProvider>,
  );

describe("ReviewNote (shared review screen)", () => {
  it("shows status, the flagged blank, and the issue with its source; Approve is disabled", () => {
    renderReview();
    expect(screen.getByRole("status")).toHaveTextContent("Needs attention");
    expect(screen.getByText("[NOT PROVIDED]")).toBeInTheDocument();
    const issues = screen.getByRole("region", { name: "Issues" });
    expect(within(issues).getByText("Client response to the intervention is missing")).toBeInTheDocument();
    expect(within(issues).getByRole("link", { name: /14 NYCRR Part 599/ })).toHaveAttribute("href", "https://example.org/part599.pdf");
    expect(screen.getByRole("button", { name: /Approve and finalize/ })).toBeDisabled();
  });

  it("Re-assess sends editor text and follow-up answers in one /assess call", async () => {
    const fetchMock = mockFetch(() => ({ body: passingNote() }));
    const user = userEvent.setup();
    renderReview();

    await user.type(screen.getByRole("textbox", { name: /Answer to: How did the client respond/ }), "Used it unprompted.");
    await user.click(screen.getByRole("button", { name: /Re-assess/ }));

    expect(await screen.findByText("Meets standards")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/assess$/);
    const body = JSON.parse(String(init?.body));
    expect(body.followup_answers).toEqual({ "fq-1": "Used it unprompted." });
    expect(body.sections.map((s: { key: string }) => s.key)).toEqual(["subjective", "assessment"]);
    expect(screen.getByRole("button", { name: /Approve and finalize/ })).toBeEnabled();
  });

  it("shows the server's 409 when approval is blocked", async () => {
    mockFetch(() => ({ status: 409, body: { detail: "A Critical issue is still open. Fix it, then approve.", note: noteFixture() } }));
    const user = userEvent.setup();
    renderReview(passingNote());

    await user.click(screen.getByRole("button", { name: /Approve and finalize/ }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(within(dialog).getByRole("button", { name: /Approve and finalize/ }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("A Critical issue is still open");
  });

  it("Check-a-note follow-ups are display-only", () => {
    renderReview(noteFixture({ origin: "pasted", context: null }));
    expect(screen.queryByRole("textbox", { name: /Answer to/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add this to the note on the left." })).toBeInTheDocument();
  });
});
