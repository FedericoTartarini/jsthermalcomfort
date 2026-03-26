# jsthermalcomfort

The `jsthermalcomfort` JavaScript library is a comprehensive toolkit for calculating thermal comfort indices, heat/cold stress metrics, and thermophysiological responses based on international standards and peer-reviewed research. Designed for researchers, engineers, and building-science professionals, it simplifies complex calculations while promoting accuracy and standards compliance in web-based applications.

## Cite jsthermalcomfort

If you use `jsthermalcomfort` in your research, please cite the original `pythermalcomfort` paper (which this library implements) as follows:

> Tartarini, F., Schiavon, S., 2020. pythermalcomfort: A Python package for thermal comfort research. SoftwareX 12, 100578. [https://doi.org/10.1016/j.softx.2020.100578](https://doi.org/10.1016/j.softx.2020.100578)

## Key Features

- **Comprehensive:** Includes a wide range of thermal comfort models (PMV/PPD, Adaptive, SET, etc.) and utilities.
- **Standard-compliant:** Implements equations from major international standards (ASHRAE 55, ISO 7730, ISO 7933).
- **Fast:** Optimized for performance, allowing for large-scale simulations in the browser or Node.js.
- **Easy to use:** Simple API with clear documentation and examples.
- **Cross-platform:** Works in any modern web browser and Node.js environments.

## Why Use jsthermalcomfort?

Thermal comfort analysis often requires complex calculations based on multiple parameters. `jsthermalcomfort` provides a reliable and easy-to-use platform for these calculations, ensuring that researchers and practitioners can focus on their results rather than the underlying math. It is based on the well-tested `pythermalcomfort` library, ensuring high accuracy and reliability for building science applications.

## Installation

```bash
npm install jsthermalcomfort
```

## Requirements

- Node.js (for server-side usage) or a modern web browser.
- No external dependencies are required for core functionality.

## Quick Start

To get started with `jsthermalcomfort`, you can install it via npm and run a simple calculation:

```javascript
import { pmv_ppd } from 'jsthermalcomfort';

// Calculate PMV and PPD
const results = pmv_ppd(25, 25, 0.1, 50, 1.2, 0.5);
console.log(`PMV: ${results.pmv}, PPD: ${results.ppd}%`);
```

## Support jsthermalcomfort

You can support the development of `jsthermalcomfort` by:

- **Starring** the project on GitHub.
- **Reporting** bugs and suggesting features via GitHub Issues.
- **Contributing** code via Pull Requests.
- **Sharing** the project with your colleagues and community.

## Contribute

We welcome contributions to `jsthermalcomfort`! You can help by:

- Improving documentation and adding examples.
- Fixing bugs or implementing new thermal comfort models.
- Refactoring code for better performance and maintainability.

Please check the [Contributing Guide](contributing.html) for more details.

## Quick checklist

Before submitting a pull request, please ensure:

- You have provided a clear summary of the changes and motivation.
- You have added/updated tests for the new behavior.
- All existing tests pass.
- Documentation (docstrings and guides) is updated.
- You have added yourself to the `authors.html` page (optional).

## Common commands

- `npm install`: Install dependencies.
- `npm test`: Run the test suite.
- `npm run docs`: Generate documentation using JSDocs.
- `npm run lint`: Check for code quality and formatting issues.

## Where to get help

- Open an issue on [GitHub Issues](https://github.com/FedericoTartarini/jsthermalcomfort/issues) for bug reports and feature requests.
- Participate in the [Discussions section](https://github.com/FedericoTartarini/jsthermalcomfort/discussions) for general questions and feedback.

## License

The `jsthermalcomfort` library is released under the **MIT License**.