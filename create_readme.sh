#!/usr/bin/env bash
printf "# Overview\n\n" > README.md
cat ./docs_theme/overview.md >> README.md
printf "\n\n# Installation\n\n" >> README.md
cat ./docs_theme/installation.md >> README.md
printf "\n\n# Examples and Tutorials\n\n" >> README.md
cat ./docs_theme/examples.md >> README.md
printf "\n\n# Contributing\n\n" >> README.md
cat ./docs_theme/contributing.md >> README.md
npx prettier README.md --write
