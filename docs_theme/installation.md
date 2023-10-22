```bash
npm install jsthermalcomfort
```
  

if you want to use jsthermalcomfort package without installing it on your local machine, you can import with:

[`https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/`](https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/)

Example:
```javascript
import { models, utilities, pschymetrics } from "https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/index.js"
```
  
  
You can also import it in the website directly, and caution that you need to mark the script as module:
```html
<script type="module">
  import { models, utilities, pschymetrics } from "https://cdn.jsdelivr.net/gh/FedericoTartarini/jsthermalcomfort/lib/esm/index.js"
</script>
```
