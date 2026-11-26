# The one environment the parity data are generated in, by the CI job
# (.github/workflows/parity-data.yml) and by local runs alike. Build and run it
# with --platform linux/amd64: the data are x86_64 only (README.md).

# Python 3.12.15 on Debian trixie, the multi-arch index pinned by digest.
FROM python:3.12.15-slim-trixie@sha256:a0f57064cbdcd6285fa45f51237ab0b35ea8ebaed06a1f5973e89e19dfb86704

# numba 0.68.0's docs: "Override CPU and CPU features detection. By setting
# NUMBA_CPU_NAME=generic, a generic CPU model is picked for the CPU
# architecture and the feature list (NUMBA_CPU_FEATURES) defaults to empty."
ENV NUMBA_CPU_NAME=generic
# numpy's runtime SIMD dispatch: every target numpy 2.5.4 dispatches to on
# x86_64 (its __cpu_dispatch__), leaving only the X86_V2 baseline on any host.
# The names change between numpy versions; README.md says how to check them.
ENV NPY_DISABLE_CPU_FEATURES="X86_V3 X86_V4 AVX512_ICL AVX512_SPR"
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1

COPY requirements.txt /tmp/requirements.txt
RUN pip install --require-hashes --only-binary :all: -r /tmp/requirements.txt

WORKDIR /work
