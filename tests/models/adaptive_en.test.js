import { expect, describe, it, beforeAll } from "@jest/globals";
import fetch from 'node-fetch'; // 引入 node-fetch 来支持 fetch
import { deep_close_to_array } from "../test_utilities.js"; // 引入测试实用工具
import { adaptive_en } from "../../src/models/adaptive_en"; // 引入待测试的模块
import { testDataUrls } from './comftest'; // 从 comftest.js 中导入所有的测试 URL

// 使用 comftest.js 中的 URL，获取适用于 adaptive_en 测试的数据
const testDataUrl = testDataUrls.adaptiveEn;

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

describe("adaptive_en", () => {
  it("should run tests and skip data that contains arrays", () => {
    if (!testData || !testData.data) {
      throw new Error("Test data is undefined or data not loaded");
    }

    // 遍历每个测试用例
    testData.data.forEach(({ inputs, outputs }) => {
      // 检查输入中是否有任何值是数组，如果是数组则跳过
      const values = Object.values(inputs);
      const hasArray = values.some(value => Array.isArray(value));

      if (hasArray) {
        console.log("Skipping test due to array data:", inputs);
        return; // 跳过这组数据的测试
      }

      const { tdb, tr, t_running_mean, v } = inputs;
      console.log("Testing with inputs:", { tdb, tr, t_running_mean, v });

      const result = adaptive_en(tdb, tr, t_running_mean, v);

      // 将 null 处理为 NaN
      if (outputs.tmp_cmf === null) {
        expect(result.tmp_cmf).toBeNaN();
      } else {
        expect(result.tmp_cmf).toBeCloseTo(outputs.tmp_cmf, tolerance);
      }

      // 检查各个 "acceptability" 类别
      expect(result.acceptability_cat_i).toBe(outputs.acceptability_cat_i);
      expect(result.acceptability_cat_ii).toBe(outputs.acceptability_cat_ii);
      expect(result.acceptability_cat_iii).toBe(outputs.acceptability_cat_iii);
    });
  });
});
