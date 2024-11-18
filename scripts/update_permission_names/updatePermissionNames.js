/* eslint-disable no-console */
const axios = require('axios');
const fs = require('node:fs').promises;
const path = require('node:path');
const cypressConfig = require('../../cypress.config');

const envData = {
  apiBaseUrl: cypressConfig.env.OKAPI_HOST,
  tenant: cypressConfig.env.OKAPI_TENANT,
  username: cypressConfig.env.diku_login,
  password: cypressConfig.env.diku_password,
};

const appPermissions = [];
const changedPermissionNames = [];

async function getToken() {
  axios.defaults.baseURL = envData.apiBaseUrl;
  axios.defaults.headers.common['x-okapi-tenant'] = envData.tenant;
  const response = await axios({
    method: 'post',
    url: '/authn/login-with-expiry',
    data: {
      username: envData.username,
      password: envData.password,
    },
  });
  const setCookieHeader = response.headers['set-cookie'];
  axios.defaults.headers.common.Cookie = setCookieHeader;
}

async function getApplicationsPermissions() {
  await getToken();
  const response = await axios({
    url: `/entitlements/${envData.tenant}/applications`,
  });
  response.data.applicationDescriptors.forEach((applicationDescriptor) => {
    const anyModuleDescriptors = [
      ...applicationDescriptor.moduleDescriptors,
      ...applicationDescriptor.uiModuleDescriptors,
    ];
    anyModuleDescriptors.forEach((anyModuleDescriptor) => {
      if (
        Object.hasOwn(anyModuleDescriptor, 'permissionSets') &&
        anyModuleDescriptor.permissionSets.length
      ) {
        anyModuleDescriptor.permissionSets.forEach((permissionSet) => {
          if (
            !appPermissions.filter(
              (permission) => permission.permissionName === permissionSet.permissionName,
            ).length
          ) {
            appPermissions.push(permissionSet);
          }
        });
      }
    });
  });
}

async function checkCypressPermissionNames() {
  await fs.copyFile(
    path.join(__dirname, '../../cypress/support/dictionary/permissions.js'),
    path.join(__dirname, '/permissions.mjs'),
  );
  // eslint-disable-next-line import/no-unresolved, import/extensions
  const importedPermissions = await import('./permissions.mjs');
  const cypressPermissions = importedPermissions.default;
  Object.values(cypressPermissions).forEach((cypressPermission) => {
    const matchingAppPermission = appPermissions
      .filter((appPermission) => Object.hasOwn(appPermission, 'displayName'))
      .find(
        (appPermission) => appPermission.displayName.trim().toUpperCase() ===
          cypressPermission.gui.trim().toUpperCase(),
      );
    if (!matchingAppPermission) console.log(`Application permission not found: "${cypressPermission.gui}"`);
    else if (matchingAppPermission.permissionName !== cypressPermission.internal) {
      console.log(
        `permissionName changed: "${cypressPermission.internal}" -> "${matchingAppPermission.permissionName}"`,
      );
      changedPermissionNames.push({
        old: cypressPermission.internal,
        new: matchingAppPermission.permissionName,
      });
    }
  });
  if (!changedPermissionNames.length) console.log('No permissionName updates required.');
}

async function updateCypressPermissionsFile() {
  if (changedPermissionNames.length) {
    await fs.copyFile(
      path.join(__dirname, '/permissions.mjs'),
      path.join(
        __dirname,
        `/permissions_backups/permissions_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.js`,
      ),
    );
    const data = await fs.readFile(path.join(__dirname, '/permissions.mjs'), 'utf8');
    let result = data;
    changedPermissionNames.forEach((changedPermissionName) => {
      result = result.replace(
        new RegExp(`'${changedPermissionName.old}'`, 'g'),
        `'${changedPermissionName.new}'`,
      );
    });
    await fs.writeFile(
      path.join(__dirname, '../../cypress/support/dictionary/permissions.js'),
      result,
      'utf8',
    );
  }
  await fs.unlink(path.join(__dirname, '/permissions.mjs'));
}

(async () => {
  await getApplicationsPermissions();
  await checkCypressPermissionNames();
  await updateCypressPermissionsFile();
})();
