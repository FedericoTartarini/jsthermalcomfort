# Parity data

The parity suite compares every migrated model with pinned pythermalcomfort on seeded inputs (ADR 0020). `generate.py` runs upstream and writes `tests/parity/data/<model>.json`. `tests/parity.test.ts` compares the library with those files, so running the tests needs no Python.

## The pinned environment

| What             | Pin                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------ |
| platform         | `x86_64` (`linux/amd64`)                                                                   |
| Python           | 3.12.15, image `python:3.12.15-slim-trixie` pinned by digest in `Dockerfile`               |
| pythermalcomfort | 4.8.0                                                                                      |
| numpy            | 2.5.4                                                                                      |
| scipy            | 1.18.1                                                                                     |
| numba            | 0.68.0                                                                                     |
| llvmlite         | 0.50.0                                                                                     |
| environment      | `NUMBA_CPU_NAME=generic`, `NPY_DISABLE_CPU_FEATURES="X86_V3 X86_V4 AVX512_ICL AVX512_SPR"` |

`requirements.txt` locks the versions with their hashes, and `Dockerfile` installs them with `--require-hashes`. The platform is pinned because scipy's arm64 build fuses multiply-adds and differs from its x86_64 build on 29 of 10,800 `brentq` roots, while the library's `brentq` port equals the x86_64 build bit for bit (ADR 0026). numba's `generic` CPU and numpy's disabled dispatch targets keep the host CPU's features out of the results.

Each file's header records `platform.machine()`, Python's and every locked package's version, the two environment variables, numpy's SIMD extensions (the `simd_extensions` entry of `np.show_runtime()`) and the seed. Before comparing anything, the harness checks that `machine` is `x86_64` and that the versions equal the pins in `Dockerfile` and `requirements.txt`. Data generated anywhere else then fail at that check instead of reading as library errors. `generate.py` refuses to run outside the pinned environment.

## Regenerating the data

The canonical data come from the **Parity data** workflow (`.github/workflows/parity-data.yml`), run by hand from the Actions tab on `ubuntu-24.04`. It builds `Dockerfile` and runs `generate.py`, and uploads the JSON as the `parity-data` artifact. Review the artifact, then commit its files to `tests/parity/data/`.

To iterate locally, run the same image with Docker. `--platform linux/amd64` is required, since Docker on Apple silicon otherwise picks the arm64 variant:

```sh
docker build --platform linux/amd64 -t jsthermalcomfort-parity scripts/parity
docker run --rm --platform linux/amd64 -v "$PWD:/work" jsthermalcomfort-parity \
  python -I scripts/parity/generate.py tests/parity/data [MODEL ...]
```

Local output counts only when it equals the CI artifact byte for byte (`shasum -a 256`). Nothing is generated on native macOS arm64.

GitHub shows the workflow's Run button only once the workflow file is on the default branch. The first `adaptive_ashrae.json` was therefore generated with the local Docker command above, and it must be confirmed byte for byte against the artifact of the first CI run.

### When upstream is upgraded

1. Set the new release in `requirements.in`, then recompile the lockfile for the pinned platform:

   ```sh
   cd scripts/parity
   uv pip compile requirements.in --python-version 3.12 \
     --python-platform x86_64-unknown-linux-gnu --generate-hashes --no-annotate \
     -o requirements.txt
   ```

2. If numpy's version changed, check its dispatch targets, since their names change between versions (numpy's docs give `"X86_V4"`). Inside the newly built image, print them and set `NPY_DISABLE_CPU_FEATURES` in `Dockerfile` to every name listed:

   ```sh
   docker run --rm --platform linux/amd64 jsthermalcomfort-parity python -c \
     "from numpy._core._multiarray_umath import __cpu_dispatch__; print(__cpu_dispatch__)"
   ```

   A regenerated header must show `"found": []`.

3. Update the Python pin and digest in `Dockerfile` if they change, and update the table above.
4. Run the workflow, review the artifact against the committed files, and commit both the pins and the data.

## What is generated and compared

- Each model's cases come from `numpy.random.default_rng([SEED, *name])`, so adding a model leaves every other model's cases unchanged. A model has 1,000 cases. Its ranges reach past the model's limits, so NaN positions are exercised, and half its numeric inputs are rounded to one decimal, so rounded outputs meet their ties.
- Numeric inputs are doubles only (Python `float`), since an input JavaScript cannot express is out of comparison (ADR 0027).
- Warnings are recorded under `warnings.simplefilter("always")`, with their category and message.
- Where upstream raises for an input's value, the model's draws reach both sides of the bound, and a case that raises records, as `raises`, the exception's class and message in place of its outputs and warnings (decision 318). `RAISES` in `generate.py` names the classes each model may raise, and the run prints each model's messages for review; any other raise stops the script.
- A case with `limit_inputs` false also records, as `gated_warnings`, the warnings of the same call with `limit_inputs` true. Upstream checks the ranges only under the gate, and the library returns its range rows whatever `limit_inputs` is (ADR 0024), so those are the rows the library's call must return. For a model in `GATED_INNER` (`pmv_e`), whose inner call takes an input the gate changes, they are instead the warnings each inner call gives with the gate on, run on the inputs it takes with the gate off.
- A case of a model in `OTYPES_PASS` (`pet_steady`), whose `np.vectorize` kernel numpy runs once more on a scalar call to find `otypes`, records as `otypes_warnings` how many of its warnings that run emitted. They come first, and the harness leaves them out, since the library runs the kernel once.
- A non-finite float is written `{"float": "nan"}` (or `"inf"`, `"-inf"`), since JSON has no NaN.
- The library must throw exactly where upstream raises, and return exactly where it returns. Neither the error's class nor its message is compared: the class follows ADR 0022 and the message is the mirrored tests' (decision 312).
- The harness compares upstream's outputs only. An output that a case rounds is compared exactly, and any other numeric output within `|library − upstream| ≤ 1e-12 + 1e-12·|upstream|`. A model's suite may override that tolerance and state its reason. Booleans, strings and NaN positions must agree. Warning keys compare as a multiset: a range warning by the name upstream gives the check, any other `UserWarning`, and scipy's `fsolve` `RuntimeWarning` (decision 281), by its message. For a case with `limit_inputs` false, the range keys come from its `gated_warnings`, and the other keys from its own warnings. Other warnings, such as numpy's `RuntimeWarning`, have no counterpart (ADR 0027).
- What a register row's `parity` column names is exempt, a throw the library adds where upstream returns included: rows in `docs/deviations/<model>.md` exempt items for that model, and rows in `_shared.md` for every model (ADR 0019).

## Adding a model

Add its generator to `MODELS` in `generate.py`, regenerate its file, and add its entry to `MODELS` in `tests/parity.test.ts`. The entry calls the model through its public entry and says which outputs a case rounds.
