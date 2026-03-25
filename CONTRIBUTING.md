# Contributing to jsthermalcomfort

Thank you for your interest in contributing to `jsthermalcomfort`! This document provides guidelines for adding new models and updating the project.

## How to Add a New Thermal Comfort Model

To add a new model to the library, follow these steps:

### 1. Create the Model File

Create a new JavaScript file in `src/models/` (e.g., `my_new_model.js`).

### 2. Implement the Logic and Add JSDoc

Implement your model function and ensure it is documented correctly using JSDoc.

**Requirements for JSDoc:**

- Use `@public` to indicate it is part of the public API.
- Use `@memberof models` to ensure it is partitioned correctly in the documentation.
- Provide clear `@param` and `@returns` descriptions.

Example:

```javascript
/**
 * @public
 * @memberof models
 * @name my_new_model
 * @description Calculates a new thermal comfort index.
 *
 * @param {number} tdb Dry bulb air temperature [°C]
 * @param {number} rh Relative humidity [%]
 * @returns {number} The calculated index value.
 */
export function my_new_model(tdb, rh) {
  // your implementation here
}
```

### 3. Register the Model

Export your new function in `src/models/index.js`:

```javascript
import { my_new_model } from "./my_new_model.js";

export default {
  // ... existing models
  my_new_model,
};
```

### 4. Update Documentation Display Name

To ensure your model has a human-readable title in the documentation, add it to the `displayNameMap` in `docs_theme/index.js`:

```javascript
const displayNameMap = {
  // ... existing mappings
  my_new_model: "My New Premium Model (MNPM)",
};
```

---

## How to Update Documentation

The documentation is generated from JSDoc comments using a custom theme in `docs_theme/`.

### 1. Modify the Theme

- **Templates**: Edit `.ejs` files in `docs_theme/` to change the HTML structure.
- **Styles**: Edit `docs_theme/assets/style.css` for visual changes.
- **Logic**: Edit `docs_theme/index.js` to change how comments are partitioned or how pages are generated.

### 2. Build and Verify Locally

Run the following command to build the documentation to the `docs/` folder:

```bash
npm run docs
```

You can then open `docs/index.html` in your browser to verify the changes.

---

## Developer Workflow

- **Install Dependencies**: `npm ci`
- **Run Tests**: `npm test`
- **Format Code**: `npm run format` (Please run this before committing!)
- **Lint Check**: `npm run check:format`

Please ensure all tests pass and your code is correctly formatted before submitting a Pull Request.
