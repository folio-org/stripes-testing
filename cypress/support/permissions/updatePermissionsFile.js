/* eslint-disable no-console */
/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable guard-for-in */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-undef */
import * as fs from 'fs';
// eslint-disable-next-line import/extensions
import permissions from '../dictionary/permissions.js';

// File path with extracted permissions from source file
const extractedPermissionsFile = 'extracted.json';
const result = {};
// Read JSON data from files
const jsonData1 = JSON.parse(fs.readFileSync(extractedPermissionsFile, 'utf8'));

// Cypress permissions
for (const key in permissions) {
  let cypressDisplayName;
  if (permissions.hasOwnProperty(key)) {
    const permissionObject = permissions[key];
    cypressDisplayName = permissionObject.gui;
  }
  //
  for (const key2 in jsonData1) {
    if (jsonData1.hasOwnProperty(key2)) {
      const actualPermissionObject = jsonData1[key2];
      const actualDisplayName = actualPermissionObject.displayName;
      const moduleId = actualPermissionObject.id;
      if (cypressDisplayName.toLowerCase() === actualDisplayName.toLowerCase()) {
        const updatedValues = {
          internal: actualPermissionObject.permissionName,
          gui: cypressDisplayName,
          id: moduleId,
        };
        result[key] = updatedValues;
        break;
      }
    }
  }
}

function objToString(obj, ndeep) {
  if (obj == null) {
    return String(obj);
  }
  switch (typeof obj) {
    case 'string':
      return '"' + obj + '"';
    case 'function':
      return obj.name || obj.toString();
    case 'object':
      var indent = Array(ndeep || 1).join('\t');
      var isArray = Array.isArray(obj);
      return (
        '{['[+isArray] +
        Object.keys(obj)
          .map((key) => {
            return '\n\t' + indent + key + ': ' + objToString(obj[key], (ndeep || 1) + 1);
          })
          .join(',') +
        '\n' +
        indent +
        '}]'[+isArray]
      );
    default:
      return obj.toString();
  }
}

fs.writeFile('updatedPermissions.js', `export default ${objToString(result, 3)}`, (err) => {
  if (err) console.log('Error when writing file: ' + err);
});
