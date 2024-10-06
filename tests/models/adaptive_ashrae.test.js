import { expect, describe, it, beforeAll } from "@jest/globals";
import fetch from 'node-fetch'; // 引入 node-fetch 来支持 fetch
import { adaptive_ashrae } from "../../src/models/adaptive_ashrae"; // 引入待测试的模块
import { testDataUrls } from './comftest'; // 从 comftest.js 中导入所有的测试 URL

// 使用 comftest.js 中的 URL，获取适用于 adaptive_ashrae 测试的数据
const testDataUrl = testDataUrls.adaptiveAshrae;

// 用于存储从远程获取的数据
let testData;
let tolerance;

// 在测试运行前获取数据
beforeAll(async () => {
  try {
    const response = await fetch(testDataUrl); // 动态获取测试数据 URL
    testData = await response.json();
    tolerance = testData.tolerance.tmp_cmf; // 获取容差
  } catch (error) {
    console.error("Failed to fetch or parse test data:", error);
    throw error; // 如果有错误，抛出以便测试中止
  }
});

describe("adaptive_ashrae", () => {
  it("should run tests and skip data that contains arrays or undefined fields", () => {
    if (!testData || !testData.data) {
      throw new Error("Test data is undefined or data not loaded");
    }

    // 遍历每个测试用例
    testData.data.forEach(({ inputs, outputs }) => {
      // 检查输入中是否有任何值是数组，如果是数组则跳过
      const values = Object.values(inputs);
      const hasArray = values.some(value => Array.isArray(value));

      if (hasArray || outputs === undefined) {
        return; // 跳过这组数据的测试
      }

      const { tdb, tr, t_running_mean, v } = inputs;

      const result = adaptive_ashrae(tdb, tr, t_running_mean, v);

      // 处理 tmp_cmf 为 NaN 的情况
      if (isNaN(result.tmp_cmf) || outputs.tmp_cmf === null) {
        expect(result.tmp_cmf).toBeNaN();
      } else if (outputs.tmp_cmf !== undefined) {
        // 如果输出不是 NaN，则比较数值
        expect(result.tmp_cmf).toBeCloseTo(outputs.tmp_cmf, tolerance);
      }

      // 只在 outputs 中定义了相应字段时，才进行检查
      if (outputs.acceptability_80 !== undefined) {
        expect(result.acceptability_80).toBe(outputs.acceptability_80);
      }

      if (outputs.acceptability_90 !== undefined) {
        expect(result.acceptability_90).toBe(outputs.acceptability_90);
      }
    });
  });
});
