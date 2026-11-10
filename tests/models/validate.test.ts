import { expect, describe, it } from "vitest";
import { validateResult } from "./testUtils.ts";

describe("validateResult (Testing the Test)", () => {
  it("should pass when model result matches expected result exactly", () => {
    const model_result = { a: 25.5 };
    const expected_output = { a: 25.5 };
    const tolerances = { a: 0.0001 };

    // Should not throw
    expect(() => {
      validateResult(model_result, expected_output, tolerances, {});
    }).not.toThrow();
  });

  it("should pass when model result is within absolute tolerance", () => {
    const model_result = { a: 25.50005 };
    const expected_output = { a: 25.5 };
    const tolerances = { a: 0.0001 };

    expect(() => {
      validateResult(model_result, expected_output, tolerances, {});
    }).not.toThrow();
  });

  it("should fail when model result is outside absolute tolerance", () => {
    const model_result = { a: 25.6 };
    const expected_output = { a: 25.5 };
    const tolerances = { a: 0.0001 };

    expect(() => {
      validateResult(model_result, expected_output, tolerances, {});
    }).toThrow();
  });

  it("should use default tolerance of 1e-6 if no tolerance is provided for a key", () => {
    const model_result = { a: 25.5000005 };
    const expected_output = { a: 25.5 };
    const tolerances = {}; // No tolerance for 'a'

    expect(() => {
      validateResult(model_result, expected_output, tolerances, {});
    }).not.toThrow();

    const failing_result = { a: 25.500002 };
    expect(() => {
      validateResult(failing_result, expected_output, tolerances, {});
    }).toThrow();
  });

  it("should correctly handle array comparisons", () => {
    const model_result = { a: [25.5, 26.6] };
    const expected_output = { a: [25.50001, 26.59999] };
    const tolerances = { a: 0.001 };

    expect(() => {
      validateResult(model_result, expected_output, tolerances, {});
    }).not.toThrow();

    const failing_array = { a: [25.5, 27.0] };
    expect(() => {
      validateResult(failing_array, expected_output, tolerances, {});
    }).toThrow();
  });

  it("should handle non-numeric types (strings/booleans) using exact equality", () => {
    const model_result = { status: "stable", active: true };
    const expected_output = { status: "stable", active: true };
    const tolerances = {};

    expect(() => {
      validateResult(model_result, expected_output, tolerances, {});
    }).not.toThrow();

    const wrong_status = { status: "unstable", active: true };
    expect(() => {
      validateResult(wrong_status, expected_output, tolerances, {});
    }).toThrow();
  });
});
