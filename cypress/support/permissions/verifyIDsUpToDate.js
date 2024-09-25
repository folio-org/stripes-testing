/* eslint-disable no-console */
/* eslint-disable no-prototype-builtins */
import * as fs from 'fs';
// eslint-disable-next-line import/no-unresolved, import/extensions
import permissions from './updatedPermissions.js';

// File path with extracted permissions from source file
const extractedPermissionsFile = 'extracted.json';

// Read JSON data from files
const jsonData1 = JSON.parse(fs.readFileSync(extractedPermissionsFile, 'utf8'));

const actualIDsCollection = new Set();
const currentIDsCollection = new Set();

for (const key in jsonData1) {
  if (jsonData1.hasOwnProperty(key)) {
    const actualPermissionObject = jsonData1[key];
    const moduleId = actualPermissionObject.id;
    actualIDsCollection.add(moduleId);
  }
}

for (const key in permissions) {
  if (permissions.hasOwnProperty(key)) {
    const permissionObject = permissions[key];
    const moduleId = permissionObject.id;
    currentIDsCollection.add(moduleId);
  }
}

const missingValues = [...currentIDsCollection].filter((value) => !actualIDsCollection.has(value));

if (missingValues) console.error('IDs to be checked', missingValues);
