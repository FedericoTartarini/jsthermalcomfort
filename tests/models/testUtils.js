import fetch from 'node-fetch'; // Import node-fetch to support data fetching

// Load test data and extract tolerance
export async function loadTestData(url, toleranceKey) {
  let testData;
  let tolerance;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    testData = await response.json();
    tolerance = testData.tolerance[toleranceKey];
  } catch (error) {
    console.error("Unable to fetch or parse test data:", error);
    throw error;
  }
  return { testData, tolerance };
}

// Check if the test should be skipped (if it contains array data)
export function shouldSkipTest(inputs) {
  const values = Object.values(inputs);
  return values.some(value => Array.isArray(value));
}
