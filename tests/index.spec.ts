import 'mocha';
import { assert, expect } from 'chai';

import { helloWorld, goodBye, heatIndex} from '../src/index';
import npmPackage from '../src/index';

describe('NPM Package', () => {
  it('should be an object', () => {
    assert.isObject(npmPackage);
  });

  it('should have a helloWorld property', () => {
    assert.property(npmPackage, 'helloWorld');
  });
});

describe('Hello World Function', () => {
  it('should be a function', () => {
    assert.isFunction(helloWorld);
  });

  it('should return the hello world message', () => {
    const expected = 'Hello World from my example modern npm package!';
    const actual = helloWorld();
    assert.equal(actual, expected);
  });
});

describe('Goodbye Function', () => {
  it('should be a function', () => {
    assert.isFunction(goodBye);
  });

  it('should return the goodbye message', () => {
    const expected = 'Goodbye from my example modern npm package!';
    const actual = goodBye();
    assert.equal(actual, expected);
  });
});

describe('heatIndex', () => {
  it('should calculate the heat index in SI units with default options', () => {
    expect(heatIndex(25, 50)).to.equal(25.9);
  });

  it('should calculate the heat index in IP units with specified options', () => {
    expect(heatIndex(77, 50, { round: false, units: 'IP' })).to.equal(78.60003664000006);
  });

  it('should round the heat index if round option is true', () => {
    expect(heatIndex(30, 60, { round: true })).to.equal(32.8);
  });

  it('should not round the heat index if round option is false', () => {
    expect(heatIndex(30, 60, { round: false })).to.equal(32.83204090000003);
  });
});
