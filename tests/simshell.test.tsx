import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimShell } from "@/components/visualizations/SimShell";
import { schedulingEngine } from "@/modules/scheduling/engine";

describe("SimShell", () => {
  it("renders the live explanation and playback controls", () => {
    render(
      <SimShell
        engine={schedulingEngine}
        title="Test lab"
        note="test note"
      >
        {() => <div>viz</div>}
      </SimShell>,
    );
    expect(screen.getByText("Test lab")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play simulation" })).toBeInTheDocument();
    expect(screen.getByLabelText("Simulation speed")).toBeInTheDocument();
    expect(screen.getByText(/Press play to watch/i)).toBeInTheDocument();
    expect(screen.getByText(/test note/)).toBeInTheDocument();
  });

  it("steps forward through scheduling decisions and updates the explanation", () => {
    render(
      <SimShell engine={schedulingEngine} title="Test lab">
        {() => <div>viz</div>}
      </SimShell>,
    );
    const step = screen.getByRole("button", { name: "Step forward" });
    fireEvent.click(step);
    expect(screen.getByText(/P1 runs to completion/)).toBeInTheDocument();
    // step-back becomes available after stepping
    expect(screen.getByRole("button", { name: "Step backward" })).toBeEnabled();
  });

  it("resets to the default scenario", () => {
    render(
      <SimShell engine={schedulingEngine} title="Test lab">
        {() => <div>viz</div>}
      </SimShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Step forward" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset simulation" }));
    expect(screen.getByText(/Press play to watch/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step backward" })).toBeDisabled();
  });

  it("exposes toolbar and children render props with state", () => {
    render(
      <SimShell
        engine={schedulingEngine}
        title="Test lab"
        toolbar={(sim) => (
          <button type="button" onClick={() => sim.dispatch({ type: "load-preset", payload: "convoy" })}>
            load convoy
          </button>
        )}
      >
        {(sim) => <div data-testid="first-burst">{sim.state.inputs[0].burst}</div>}
      </SimShell>,
    );
    expect(screen.getByTestId("first-burst")).toHaveTextContent("7");
    fireEvent.click(screen.getByText("load convoy"));
    expect(screen.getByTestId("first-burst")).toHaveTextContent("20");
  });
});
