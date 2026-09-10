const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'components/admin/sidebar.tsx');
let content = fs.readFileSync(file, 'utf8');

// Ensure Dispatch's homepage correctly routes them away if they hit something invalid
