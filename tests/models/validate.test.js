import { expect, describe, it, jest } from "@jest/globals";
import { validateResult } from "./testUtils.js";

describe("validateResult (Testing the Test)", () => {
  it("should pass when model result matches expected result exactly", () => {
    const modelResult = { a: 25.5 };
    const expectedOutput = { a: 25.5 };
    const tolerances = { a: 0.0001 };
    
    // Should not throw
    expect(() => validateResult(modelResult, expectedOutput, tolerances)).not.toThrow();
  });

  it("should pass when model result is within absolute tolerance", () => {
    const modelResult = { a: 25.50005 };
    const expectedOutput = { a: 25.5 };
    const tolerances = { a: 0.0001 };
    
    expect(() => validateResult(modelResult, expectedOutput, tolerances)).not.toThrow();
  });

  it("should fail when model result is outside absolute tolerance", () => {
    const modelResult = { a: 25.6 };
    const expectedOutput = { a: 25.5 };
    const tolerances = { a: 0.0001 };
    
    expect(() => validateResult(modelResult, expectedOutput, tolerances)).toThrow();
  });

  it("should use default tolerance of 0.0001 if no tolerance is provided for a key", () => {
    const modelResult = { a: 25.50005 };
    const expectedOutput = { a: 25.5 };
    const tolerances = {}; // No tolerance for 'a'
    
    expect(() => validateResult(modelResult, expectedOutput, tolerances)).not.toThrow();
    
    const failingResult = { a: 25.5002 };
    expect(() => validateResult(failingResult, expectedOutput, tolerances)).toThrow();
  });

  it("should handle null expected outputs by treating them as NaN", () => {
    const modelResult = { a: NaN };
    const expectedOutput = { a: null };
    const tolerances = { a: 0.1 };
    
    expect(() => validateResult(modelResult, expectedOutput, tolerances)).not.toThrow();
  });

  it("should correctly handle array comparisons", () => {
    const modelResult = { a: [25.5, 26.6] };
    const expectedOutput = { a: [25.50001, 26.59999] };
    const tolerances = { a: 0.001 };
    
    expect(() => validateResult(modelResult, expectedOutput, tolerances)).not.toThrow();
    
    const failingArray = { a: [25.5, 27.0] };
    expect(() => validateResult(failingArray, expectedOutput, tolerances)).toThrow();
  });

  it("should handle non-numeric types (strings/booleans) using exact equality", () => {
    const modelResult = { status: "stable", active: true };
    const expectedOutput = { status: "stable", active: true };
    const tolerances = {};
    
    expect(() => validateResult(modelResult, expectedOutput, tolerances)).not.toThrow();
    
    const wrongStatus = { status: "unstable", active: true };
    expect(() => validateResult(wrongStatus, expectedOutput, tolerances)).toThrow();
  });
});
