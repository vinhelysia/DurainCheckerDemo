/* global describe, it */
import { expect } from "chai";
import { copyData } from "../src/data/copy.js";

describe("Translation Completeness Tests", function () {
  function getDeepKeys(obj, prefix = "") {
    let keys = [];
    for (const key in obj) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
        keys = keys.concat(getDeepKeys(obj[key], nextPrefix));
      } else {
        keys.push(nextPrefix);
      }
    }
    return keys;
  }

  it("Should have exact same keys in Vietnamese and English translations", function () {
    const viKeys = getDeepKeys(copyData.vi);
    const enKeys = getDeepKeys(copyData.en);

    expect(viKeys).to.have.members(enKeys, "English translations are missing some keys from Vietnamese");
    expect(enKeys).to.have.members(viKeys, "Vietnamese translations are missing some keys from English");
  });
});
