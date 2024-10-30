import { expect, describe, it, beforeAll } from '@jest/globals';
import fetch from 'node-fetch';
import { phs } from '../../src/models/phs';
import { testDataUrls } from './comftest'; // Import test URLs from comftest.js

const testDataUrl = testDataUrls.phs;

let testData;
let tolerance;

beforeAll(async () => {
  try {
    const response = await fetch(testDataUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch test data: ${response.statusText}`);
    }

    testData = await response.json();
    tolerance = testData.tolerance; // Retrieve tolerance from remote data
  } catch (error) {
    console.error('Unable to fetch or parse test data:', error);
    throw error;
  }
});

describe('phs', () => {
  it('should run tests and skip data that contains arrays or undefined fields', () => {
    if (!testData || !testData.data) {
      throw new Error('Test data is not properly loaded');
    }

    testData.data.forEach(({ inputs, outputs }) => {
      // Check for arrays or undefined values in inputs or outputs
      const hasArrayOrUndefined = 
        Object.values(inputs).some(value => Array.isArray(value) || value === undefined) ||
        Object.values(outputs).some(value => Array.isArray(value));

      if (hasArrayOrUndefined || outputs === undefined) {
        console.warn(`Skipping test due to missing or invalid inputs/outputs: inputs=${JSON.stringify(inputs)}`);
        return;
      }

      let result;
      try {
        result = phs(
          inputs.tdb,
          inputs.tr,
          inputs.v,
          inputs.rh,
          inputs.met,
          inputs.clo,
          inputs.posture,
          inputs.wme,
          inputs.kwargs
        );

        // Compare values with field-specific tolerance
        for (let [key, value] of Object.entries(outputs)) {
          if (tolerance[key] !== undefined) {
            expect(result[key]).toBeCloseTo(value, tolerance[key]);
          } else {
            expect(result[key]).toBeCloseTo(value, 1); // Default precision of 1
          }
        }
      } catch (error) {
        console.error('Test failed with inputs:', inputs);
        if (typeof result !== 'undefined') {
          console.error('Received result:', result);
          console.error('Expected result:', outputs);
        }
        throw error; // Re-throw to display specific error details
      }
    });
  });
});
