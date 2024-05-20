const fs = require('fs');

// File path with current Cypress permissions(cypress>support>dictionary>permissions.js)
const cypressPermissionsToFilter = 'cypressperm.json';

// File path with extracted permissions from source file
const extractedPermissionsFile = 'extracted.json';
const result = [];
// Read JSON data from files
const jsonData1 = JSON.parse(fs.readFileSync(extractedPermissionsFile, 'utf8'));
const jsonData2 = JSON.parse(fs.readFileSync(cypressPermissionsToFilter, 'utf8'));

// Create an object to store the permissions from jsonData1
const permissions1 = {};

// Traverse jsonData1 and store the permissions in permissions1
for (const key in jsonData1) {
  // eslint-disable-next-line no-prototype-builtins
  if (jsonData1.hasOwnProperty(key)) {
    const modules = jsonData1[key];
    modules.forEach((module) => {
      const permissionName = module.permissionName;
      if (permissionName) {
        permissions1[permissionName] = module;
      }
    });
  }
}

// Create an object to store the permissions from jsonData2
const permissions2 = {};

// Traverse jsonData2 and store the permissions in permissions2
for (const key in jsonData2) {
  // eslint-disable-next-line no-prototype-builtins
  if (jsonData2.hasOwnProperty(key)) {
    const module = jsonData2[key];
    const permissionName = module.permissionName;
    if (permissionName) {
      permissions2[permissionName] = module;
    }
  }
}

// Iterate over the keys in permissions2 and search for them in permissions1
for (const key in permissions2) {
  // eslint-disable-next-line no-prototype-builtins
  if (permissions2.hasOwnProperty(key)) {
    const permissionName = permissions2[key].permissionName;
    const foundPermission = permissions1[permissionName];
    if (!foundPermission) {
      result.push(permissionName);
    }
  }
}

// Save result to a new JSON file
fs.writeFile('obsolete.txt', JSON.stringify(result, null, 2), 'utf8', (err) => {
  if (err) {
    console.error('Error writing file:', err);
    return;
  }
  console.log('Result saved to result.txt');
});
