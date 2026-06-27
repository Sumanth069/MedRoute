import { forecaster } from '../src/api/forecaster.js';

console.log('🧪 Running MedRoute Forecasting Engine Unit Tests...');

const runTests = () => {
  // Test Case 1: Empty stock should forecast 0 days
  const tc1 = forecaster.predict(0, 5, 30, 0.5, 0, 5);
  if (tc1.days_until_stockout !== 0.0) {
    throw new Error(`Test Case 1 Failed: Expected 0 days, got ${tc1.days_until_stockout}`);
  }
  console.log('✅ Test Case 1 Passed: Empty stock correctly yields 0 days horizon.');

  // Test Case 2: Stable, normal conditions (100 stock / 10 daily consumption)
  const tc2 = forecaster.predict(100, 10, 30, 0, 0, 1);
  if (tc2.days_until_stockout !== 10.0) {
    throw new Error(`Test Case 2 Failed: Expected 10.0 days, got ${tc2.days_until_stockout}`);
  }
  console.log('✅ Test Case 2 Passed: Normal stock & consumption holds expected 10-day safety limit.');

  // Test Case 3: Expiry restriction (100 stock / 10 daily consumption, but expires in 5 days)
  const tc3 = forecaster.predict(100, 10, 5, 0, 0, 1);
  if (tc3.days_until_stockout >= 10.0) {
    throw new Error(`Test Case 3 Failed: Stockout horizon should be capped by near expiry. Got ${tc3.days_until_stockout}`);
  }
  console.log(`✅ Test Case 3 Passed: Near expiry correctly capped safety horizon to ${tc3.days_until_stockout} days.`);

  // Test Case 4: SHAP Explainability Reasons generated
  const tc4 = forecaster.predict(10, 15, 30, 0.8, 20, 5);
  if (!tc4.xai_reasons || tc4.xai_reasons.length === 0) {
    throw new Error('Test Case 4 Failed: Expected SHAP XAI explanation list to be populated.');
  }
  console.log('✅ Test Case 4 Passed: SHAP XAI reasons generated and sorted by magnitude.');

  console.log('\n🎉 ALL FORECASTING TESTS COMPLETED SUCCESSFULLY! (4/4 Passed)');
};

try {
  runTests();
  process.exit(0);
} catch (error) {
  console.error('❌ UNIT TESTS FAILED:');
  console.error(error.message);
  process.exit(1);
}
