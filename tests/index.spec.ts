import 'mocha';
import { assert, expect } from 'chai';

import { heatIndex} from '../src/index';
import npmPackage from '../src/index';

describe('NPM Package', () => {
  it('should be an object', () => {
    assert.isObject(npmPackage);
  });

  it('should have a helloWorld property', () => {
    assert.property(npmPackage, 'heatIndex');
  });
});

describe('heatIndex', () => {
  it('should be a function', () => {
    assert.isFunction(heatIndex);
  });

  it('should calculate the heat index in SI units with default options', () => {
    expect(heatIndex(25, 50)).to.equal(25.9);
  });

  it('should calculate the heat index in IP units with specified options', () => {
    expect(heatIndex(77, 50, { units: 'IP' })).to.equal(78.6);
  });

  it('should round the heat index if round option is true', () => {
    expect(heatIndex(30, 80, )).to.equal(37.7);
  });

  it('should not round the heat index if round option is false', () => {
    expect(heatIndex(86, 80, { units: 'IP' })).to.equal(99.8);
  });

  it('should not round the heat index if round option is false', () => {
    expect(heatIndex(30, 60, { round: false })).to.equal(32.83204090000003);
  });
});
