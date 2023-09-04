import { describe, it } from "@jest/globals";
import { wc } from "../../src/models/wc.js";
import {deep_close_to_obj} from "../test_utilities.js"

describe('test_wc', () => { 
    it.each([
        {
            tdb:0, v:0.1, expected: {"wci": 518.6}
        },
        {
            tdb:0, v:1.5, expected: {"wci": 813.5}
        },
        {
            tdb:-5, v:5.5, expected: {"wci": 1255.2}
        },
        {
            tdb:-10, v:11, expected: {"wci": 1631.1}
        },
        {
            tdb:-5, v:11, expected: {"wci": 1441.4}
        },
    ]) (
        "return {\"wci\": $expected} if tdb = $tdb, v = $v",
        ({tdb, v, expected}) => {
            const result = wc(tdb, v);
            deep_close_to_obj(result, expected, 0.2)
        }
    )
 })