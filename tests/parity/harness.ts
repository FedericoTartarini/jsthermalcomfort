import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ModelInfo,
  OutputField,
  OutputsInfo,
} from "../../src/_internal/modelInfo.ts";
import { read_registers } from "../deviations/register.ts";
import type { Parity, Row } from "../deviations/register.ts";

// Compares a model with the upstream outputs scripts/parity/generate.py
// commits under tests/parity/data/ (ADR 0020). Rounded outputs compare
// exactly, unrounded outputs within a tolerance, and NaN positions and warning
// keys must agree. What a register row's `parity` names is exempt (ADR 0019).

const DATA = "tests/parity/data";
const REQUIREMENTS = "scripts/parity/requirements.txt";
const DOCKERFILE = "scripts/parity/Dockerfile";

// The data are generated on x86_64 only: scipy's arm64 build differs from its
// x86_64 build, which the brentq port equals bit for bit (ADR 0026).
const MACHINE = "x86_64";

/** A value in the data; a non-finite float is tagged, as JSON has none. */
export type Encoded =
  number | boolean | string | null | { readonly float: "nan" | "inf" | "-inf" };

/** An output in the data: a value, or a time series of values (decision 269). */
export type EncodedOutput = Encoded | readonly Encoded[];

/** One warning upstream emitted under `simplefilter("always")`. */
export interface UpstreamWarning {
  readonly category: string;
  readonly message: string;
}

/** One seeded case: upstream's keyword arguments, outputs and warnings. */
export interface UpstreamCase {
  /** A time-series input is a list of numbers (decision 277). */
  readonly inputs: Readonly<
    Record<string, number | boolean | string | readonly number[]>
  >;
  readonly outputs: Readonly<Record<string, EncodedOutput>>;
  readonly warnings: readonly UpstreamWarning[];
  /**
   * For a case with `limit_inputs` false, the warnings of the same call with
   * `limit_inputs` true.
   */
  readonly gated_warnings?: readonly UpstreamWarning[];
  /**
   * For a model whose `np.vectorize` kernel numpy runs once more to find
   * `otypes`, how many of `warnings`, which come first, that run emitted.
   */
  readonly otypes_warnings?: number;
}

/**
 * One seeded case for which upstream raises: its keyword arguments, and the
 * exception's class and message, kept as reference and never compared
 * (decisions 312, 318).
 */
export interface RaisingCase {
  readonly inputs: UpstreamCase["inputs"];
  readonly raises: { readonly type: string; readonly message: string };
}

/** Whether upstream returns for the case. */
export function upstream_returns(
  expected: UpstreamCase | RaisingCase,
): expected is UpstreamCase {
  return !("raises" in expected);
}

/** Where and with what the data were generated. */
export interface Header {
  readonly machine: string;
  readonly python: string;
  readonly packages: Readonly<Record<string, string>>;
  readonly environment: Readonly<Record<string, string | null>>;
  readonly numpy_runtime: unknown;
  readonly seed: number;
}

/** One model's data file. */
export interface ParityData {
  readonly model: string;
  readonly header: Header;
  readonly cases: readonly (UpstreamCase | RaisingCase)[];
}

/** The pinned Python and package versions. */
export interface Pins {
  readonly python: string;
  readonly packages: Readonly<Record<string, string>>;
}

/** An unrounded output passes when |library − upstream| ≤ abs + rel·|upstream|. */
export interface Tolerance {
  readonly rel: number;
  readonly abs: number;
}

/**
 * The default tolerance. Its rel is about 4,500 times `Number.EPSILON`, room
 * for the ulp by which V8's `Math` and glibc's libm can differ (ADR 0009) to
 * grow through a model, and its abs covers outputs near zero. A model's suite
 * may override it, giving its reason.
 */
export const DEFAULT_TOLERANCE: Tolerance = { rel: 1e-12, abs: 1e-12 };

/** A library warning row, as far as the comparison reads it (ADR 0024). */
export type WarningRow =
  | { readonly kind: "range"; readonly key: string }
  | { readonly kind: "notice"; readonly message: string };

/** How one case is compared. */
export interface CompareOptions {
  /** The outputs this case rounds, compared exactly. */
  readonly rounded: readonly string[];
  readonly tolerance: Tolerance;
  /** Whether warning keys are compared. */
  readonly warnings: boolean;
  readonly exempt: Parity;
  /** The model's `INFO.outputs`, which select each output's mapping. */
  readonly outputs: OutputsInfo;
}

/** One model's suite. */
export interface ParityModel {
  /** Upstream's function name, which names the data file and the register. */
  readonly name: string;
  /** The model's `*_INFO`, whose outputs select the mappings. */
  readonly info: ModelInfo;
  /** Calls the model through its public entry with upstream's arguments. */
  readonly run: (
    inputs: UpstreamCase["inputs"],
  ) => Readonly<Record<string, unknown>>;
  /** The outputs a case rounds, compared exactly. */
  readonly rounded: (inputs: UpstreamCase["inputs"]) => readonly string[];
  readonly tolerance?: Tolerance;
  readonly warnings: boolean;
}

const NON_FINITE = { nan: NaN, inf: Infinity, "-inf": -Infinity } as const;

type Decoded = number | boolean | string | null;

/** Reads a value from the data, or each value of a time series. */
export function decode(value: Encoded): Decoded;
export function decode(value: EncodedOutput): Decoded | Decoded[];
export function decode(value: EncodedOutput): Decoded | Decoded[] {
  if (Array.isArray(value)) return value.map((item: Encoded) => decode(item));
  const scalar = value as Encoded;
  return scalar !== null && typeof scalar === "object"
    ? NON_FINITE[scalar.float]
    : scalar;
}

// _valid_range's message and the airspeed_control checks' messages both quote
// the name first (_internal/validation.py:53-56, _internal/ashrae55.py:48-92).
const RANGE_MESSAGE = /^(?:airspeed_control=False: )?'(.+?)' has /;

// scipy's fsolve warns its status 2 to 5 messages as a RuntimeWarning
// (scipy/optimize/_minpack_py.py:181-188), which the library returns as a
// notice row (decision 281).
const FSOLVE_MESSAGE =
  /^(?:The number of calls to function has reached maxfev = \d+\.|xtol=\d+\.\d+ is too small, no further improvement in the approximate\n solution is possible\.|The iteration is not making good progress, as measured by the \n improvement from the last (?:five Jacobian evaluations|ten iterations)\.)$/;

/**
 * Keys an upstream warning as the library keys its row: a range check by the
 * name upstream gives it, any other `UserWarning`, and scipy's `fsolve`
 * `RuntimeWarning`, by its message. A warning of another category, such as
 * numpy's `RuntimeWarning`, has no counterpart and gives `undefined` (ADR
 * 0027).
 */
export function upstream_warning_key({
  category,
  message,
}: UpstreamWarning): string | undefined {
  if (category === "RuntimeWarning" && FSOLVE_MESSAGE.test(message))
    return message;
  if (category !== "UserWarning") return undefined;
  return RANGE_MESSAGE.exec(message)?.[1] ?? message;
}

/**
 * The keys the library's rows must have for a case. The library returns its
 * range rows whatever `limit_inputs` is (ADR 0024), where upstream checks the
 * ranges only under the gate, so for a case with the gate off the range keys
 * come from the same call with the gate on, and any other key from the case.
 * The library runs a kernel once, so the warnings of numpy's `otypes` run
 * are left out.
 */
export function expected_warning_keys(expected: UpstreamCase): string[] {
  const keys = (warnings: readonly UpstreamWarning[], range: boolean) =>
    warnings.flatMap((warning) => {
      const key = upstream_warning_key(warning);
      return key === undefined || RANGE_MESSAGE.test(warning.message) !== range
        ? []
        : [key];
    });
  const warnings = expected.warnings.slice(expected.otypes_warnings ?? 0);
  const gated = expected.gated_warnings ?? warnings;
  return [...keys(gated, true), ...keys(warnings, false)];
}

/** Keys a library row: a range row by its key, a notice by its message. */
export function library_warning_key(row: WarningRow): string {
  return row.kind === "range" ? row.key : row.message;
}

function show(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

/**
 * R item "flag" (ADR 0028): upstream's `_as_flag` 1.0, 0.0 and NaN as `true`,
 * `false` and `null`; `undefined` for any other value, outside its domain.
 */
export function flag_mapping(value: Decoded): boolean | null | undefined {
  if (value === 1) return true;
  if (Object.is(value, 0)) return false;
  return typeof value === "number" && Number.isNaN(value) ? null : undefined;
}

/**
 * R item "nullable output" (ADR 0028): upstream's NaN as `null`, any other value
 * as it is; `undefined` for `null`, upstream's None, outside its domain, since
 * it could not be told from a NaN.
 */
export function nullable_mapping(value: Decoded): Decoded | undefined {
  if (value === null) return undefined;
  return typeof value === "number" && Number.isNaN(value) ? null : value;
}

/**
 * Reads one upstream value in the library's representation, through the
 * mapping its `INFO.outputs` entry selects: a `flag`'s, else a `nullable`
 * output's, else none. A value outside the mapping's domain fails.
 */
function to_library(
  name: string,
  value: Decoded,
  field: OutputField | undefined,
): { readonly value: Decoded } | { readonly failure: string } {
  const [mapped, mapping, domain] =
    field?.kind === "flag"
      ? [flag_mapping(value), "flag", "1.0, 0.0 or NaN"]
      : field?.nullable === true
        ? [nullable_mapping(value), "nullable", "any value but None"]
        : [value, "", ""];
  return mapped === undefined
    ? {
        failure: `output ${name}: upstream ${show(value)} is outside the ${mapping} mapping's domain, ${domain}`,
      }
    : { value: mapped };
}

function compare_output(
  name: string,
  upstream: Decoded,
  actual: unknown,
  exact: boolean,
  { rel, abs }: Tolerance,
  field: OutputField | undefined,
): string | undefined {
  // Upstream's NaN, its "no value", needs the output declared nullable
  // (decision 327); so does the library's null, the same "no value" (decision
  // 310), except in a field held at its dataclass's None.
  if (field?.nullable !== true) {
    const not_declared = `but INFO.outputs does not declare ${name.replace(/\[\d+\]$/, "")} nullable`;
    if (typeof upstream === "number" && Number.isNaN(upstream)) {
      return `output ${name}: upstream NaN, ${not_declared}`;
    }
    if (actual === null && field?.none !== true) {
      return `output ${name}: library null, ${not_declared}`;
    }
  }
  const mapped = to_library(name, upstream, field);
  if ("failure" in mapped) return mapped.failure;
  const expected = mapped.value;
  const as = Object.is(expected, upstream) ? "" : ` as ${show(expected)}`;
  const failure = `output ${name}: library ${show(actual)}, upstream ${show(upstream)}${as}`;
  // A boolean, a string or null compares exactly, and never equals a number,
  // so a NaN is never taken for a boolean.
  if (typeof expected !== "number" || typeof actual !== "number") {
    return actual === expected ? undefined : failure;
  }
  // Upstream's NaN has failed or become null above, so a NaN here is the
  // library's.
  if (Number.isNaN(actual)) return failure;
  if (actual === expected) return undefined;
  if (exact || !Number.isFinite(expected)) return failure;
  return Math.abs(actual - expected) <= abs + rel * Math.abs(expected)
    ? undefined
    : `${failure}, beyond rel ${rel} + abs ${abs}`;
}

/**
 * Compares a time series element by element, as `compare_output` compares one
 * value, and reports its length or its first differing element.
 */
function compare_series(
  name: string,
  expected: readonly Decoded[],
  actual: unknown,
  exact: boolean,
  tolerance: Tolerance,
  field: OutputField | undefined,
): string | undefined {
  if (!Array.isArray(actual) || actual.length !== expected.length) {
    const length = Array.isArray(actual)
      ? `length ${String(actual.length)}`
      : show(actual);
    return `output ${name}: library ${length}, upstream length ${String(expected.length)}`;
  }
  for (const [i, value] of expected.entries()) {
    const failure = compare_output(
      `${name}[${String(i)}]`,
      value,
      actual[i],
      exact,
      tolerance,
      field,
    );
    if (failure !== undefined) return failure;
  }
  return undefined;
}

function compared_keys(keys: readonly string[], exempt: Parity): string[] {
  return keys.filter((key) => !exempt.warnings.includes(key)).sort();
}

/**
 * Compares one case. Only upstream's outputs are compared, so an output the
 * library adds is ignored (ADR 0023). Warning keys compare as a multiset: each
 * upstream warning has one row, whatever the order, and a case with the gate
 * off is compared with the gate's range warnings (`expected_warning_keys`).
 */
export function compare_case(
  expected: UpstreamCase,
  actual: Readonly<Record<string, unknown>>,
  { rounded, tolerance, warnings, exempt, outputs }: CompareOptions,
): string[] {
  const failures: string[] = [];
  for (const [name, value] of Object.entries(expected.outputs)) {
    if (exempt.outputs.includes(name)) continue;
    if (!(name in actual)) {
      failures.push(`output ${name}: missing from the library's result`);
      continue;
    }
    const decoded = decode(value);
    const failure = Array.isArray(decoded)
      ? compare_series(
          name,
          decoded,
          actual[name],
          rounded.includes(name),
          tolerance,
          outputs[name],
        )
      : compare_output(
          name,
          decoded,
          actual[name],
          rounded.includes(name),
          tolerance,
          outputs[name],
        );
    if (failure !== undefined) failures.push(failure);
  }
  if (warnings) {
    const upstream_keys = compared_keys(
      expected_warning_keys(expected),
      exempt,
    );
    const library_keys = compared_keys(
      (actual.warnings as readonly WarningRow[]).map(library_warning_key),
      exempt,
    );
    if (JSON.stringify(library_keys) !== JSON.stringify(upstream_keys)) {
      failures.push(
        `warnings: library ${JSON.stringify(library_keys)}, upstream ${JSON.stringify(upstream_keys)}`,
      );
    }
  }
  return failures;
}

/**
 * Checks one case: the library throws exactly where upstream raises (decision
 * 318), and where both return, the case compares (`compare_case`).
 */
export function case_failures(
  expected: UpstreamCase | RaisingCase,
  run: () => Readonly<Record<string, unknown>>,
  options: CompareOptions,
): string[] {
  let actual: Readonly<Record<string, unknown>>;
  try {
    actual = run();
  } catch (error) {
    if (!upstream_returns(expected)) return [];
    const exempt =
      error instanceof Error && options.exempt.throws.includes(error.message);
    return exempt ? [] : [`library threw ${String(error)}, upstream returned`];
  }
  if (!upstream_returns(expected)) {
    const { type, message } = expected.raises;
    return [`library returned, upstream raised ${type}: ${message}`];
  }
  return compare_case(expected, actual, options);
}

/** What the model's register and the shared register exempt. */
export function exemptions(rows: readonly Row[], model: string): Parity {
  const files = [`docs/deviations/${model}.md`, "docs/deviations/_shared.md"];
  const applying = rows.filter((row) => files.includes(row.file));
  return {
    outputs: applying.flatMap((row) => row.parity.outputs),
    warnings: applying.flatMap((row) => row.parity.warnings),
    throws: applying.flatMap((row) => row.parity.throws),
  };
}

/**
 * Reads the pins: the Python version from the Dockerfile's base image, and
 * every locked package from the lockfile.
 */
export function read_pins(root: string): Pins {
  const dockerfile = readFileSync(join(root, DOCKERFILE), "utf8");
  const python = /^FROM python:(\d+\.\d+\.\d+)-/m.exec(dockerfile)?.[1];
  if (python === undefined) {
    throw new Error(`${DOCKERFILE} has no FROM python:<x.y.z>- line`);
  }
  const requirements = readFileSync(join(root, REQUIREMENTS), "utf8");
  const packages = Object.fromEntries(
    [...requirements.matchAll(/^([A-Za-z0-9._-]+)==(\S+)/gm)].map(
      ([, name = "", version = ""]) => [name.toLowerCase(), version],
    ),
  );
  return { python, packages };
}

/**
 * Checks that the data were generated on x86_64 with the pinned versions, so
 * data regenerated elsewhere fail here instead of reading as library errors.
 */
export function check_header(header: Header, pins: Pins): string[] {
  const failures: string[] = [];
  if (header.machine !== MACHINE) {
    failures.push(`header: machine "${header.machine}", expected "${MACHINE}"`);
  }
  if (header.python !== pins.python) {
    failures.push(
      `header: python "${header.python}", expected the pinned "${pins.python}"`,
    );
  }
  for (const [name, version] of Object.entries(pins.packages)) {
    const found = header.packages[name];
    if (found === version) continue;
    failures.push(
      found === undefined
        ? `header: ${name} missing, expected the pinned "${version}"`
        : `header: ${name} "${found}", expected the pinned "${version}"`,
    );
  }
  for (const [name, version] of Object.entries(header.packages)) {
    if (!(name in pins.packages)) {
      failures.push(`header: ${name} "${version}" is not pinned`);
    }
  }
  return failures;
}

/** Reads a model's data file. */
export function read_data(root: string, model: string): ParityData {
  return JSON.parse(
    readFileSync(join(root, DATA, `${model}.json`), "utf8"),
  ) as ParityData;
}

/**
 * Runs one model's suite: checks the header first, then compares every case,
 * prefixing each failure with the case's index and inputs.
 */
export function parity_failures(root: string, model: ParityModel): string[] {
  const data = read_data(root, model.name);
  if (data.model !== model.name) {
    return [`${DATA}/${model.name}.json holds the model "${data.model}"`];
  }
  const header_failures = check_header(data.header, read_pins(root));
  if (header_failures.length > 0) return header_failures;
  const exempt = exemptions(read_registers(root).rows, model.name);
  const tolerance = model.tolerance ?? DEFAULT_TOLERANCE;
  return data.cases.flatMap((expected, i) => {
    const at = `case ${i} ${JSON.stringify(expected.inputs)}`;
    return case_failures(expected, () => model.run(expected.inputs), {
      rounded: model.rounded(expected.inputs),
      tolerance,
      warnings: model.warnings,
      exempt,
      outputs: model.info.outputs,
    }).map((failure) => `${at}: ${failure}`);
  });
}
