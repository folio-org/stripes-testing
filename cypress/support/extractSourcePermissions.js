const fs = require('fs');

// File path with source permissions
const sourcePermissionsFile = 'sourceperm.json';

// File path with extracted permissions from file above
const extractedPermissionsFile = 'extracted.json';
const filteringKey = 'permissionSets';

function findPermissionSets(json) {
  const results = {};

  function recurse(obj, path = '') {
    if (obj === null || typeof obj !== 'object') {
      return;
    }

    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(filteringKey)) {
      results[path] = obj[filteringKey];
    }

    for (const prop in obj) {
      // eslint-disable-next-line no-prototype-builtins
      if (obj.hasOwnProperty(prop) && typeof obj[prop] === 'object') {
        recurse(obj[prop], path ? `${path}.${prop}` : prop);
      }
    }
  }

  recurse(json);
  return results;
}

// Read JSON file
fs.readFile(sourcePermissionsFile, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    const json = JSON.parse(data);
    const result = findPermissionSets(json);

    // Save result to a new JSON file
    fs.writeFile(extractedPermissionsFile, JSON.stringify(result, null, 2), 'utf8', (error) => {
      if (error) {
        console.error('Error writing file:', err);
        return;
      }
      console.log('Result saved to result.json');
    });
  } catch (error) {
    console.error('Error parsing JSON:', err);
  }
});
