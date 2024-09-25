/* eslint-disable no-console */
/* eslint-disable no-shadow */
/* eslint-disable no-prototype-builtins */
import * as fs from 'fs';

// File path with source permissions
const sourcePermissionsFile = 'sourceperm.json';

// File path with extracted permissions from file above
const extractedPermissionsFile = 'extracted.json';
let currentId = '';

function traverseAndExtract(obj) {
  const result = [];

  function traverse(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else if (obj && typeof obj === 'object') {
      if (obj.hasOwnProperty('permissionSets') && obj.permissionSets.length > 0) {
        currentId = obj.id;
      }
      if (obj.hasOwnProperty('permissionName') && obj.hasOwnProperty('displayName')) {
        const newObj = {
          permissionName: obj.permissionName,
          displayName: obj.displayName,
          id: currentId,
        };
        if (obj.hasOwnProperty('replaces')) {
          newObj.replaces = obj.replaces;
        }
        result.push(newObj);
      }
      Object.keys(obj).forEach((key) => {
        traverse(obj[key]);
      });
    }
  }

  traverse(obj);
  return result;
}

fs.readFile(sourcePermissionsFile, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    const json = JSON.parse(data);
    const result = traverseAndExtract(json);

    fs.writeFile(extractedPermissionsFile, JSON.stringify(result, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }
      console.log('Result saved to result.json');
    });
  } catch (err) {
    console.error('Error parsing JSON:', err);
  }
});
