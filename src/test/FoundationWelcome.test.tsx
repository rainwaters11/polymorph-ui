import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FoundationWelcome } from "@/components/foundation/FoundationWelcome";

describe("FoundationWelcome", () => {
  it("renders the project foundation message", () => {
    render(<FoundationWelcome />);

    expect(
      screen.getByRole("heading", { name: /foundation ready/i }),
    ).toBeInTheDocument();
  });
});
