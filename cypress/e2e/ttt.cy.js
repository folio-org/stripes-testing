const cypressPermissions = require('../support/dictionary/permissions');

const prm = require('../support/dictionary/p');

const permissionCapabilityMappingData = [];

describe('test', () => {
  it.only(
    'test test',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      Object.entries(cypressPermissions).forEach(([key, value]) => {
        permissionCapabilityMappingData.push({
          name: key,
          displayName: value.gui,
          permissionName: value.internal,
          capabilityName: null,
          permission: null,
          capabilitySetName: null,
        });
      });

      //cy.log(prm.permissions.length);
      permissionCapabilityMappingData.forEach((permissionCapability) => {
        const pr = prm.permissions.find(permission => permission.displayName === permissionCapability.displayName);
        if (!pr) {
          cy.log(permissionCapability.displayName);
          //permissionCapability.permission = pr;
        }
        if (pr) {
          if (pr.permissionName !== permissionCapability.permissionName) {
            cy.log(':::' + pr.displayName + ' : ' + pr.permissionName + ' : ' + permissionCapability.permissionName);
          }
        }
      });
    }
  );

  it(
    'test test',
    { tags: ['extendedPath', 'firebird'] },
    () => {
      Object.entries(cypressPermissions).forEach(([key, value]) => {
        permissionCapabilityMappingData.push({
          name: key,
          displayName: value.gui,
          permissionName: value.internal,
          capabilityName: null,
          permission: null,
          capabilitySetName: null,
        });
      });

      cy.getAdminToken();
      cy.getCapabilitiesApi().then(capabilities => {
        permissionCapabilityMappingData.forEach((permissionCapabilityMapping) => {
          const cp = capabilities.find(capability => capability.permission === permissionCapabilityMapping.permissionName);
          if (cp) {
            permissionCapabilityMapping.capabilityName = cp.name;
            permissionCapabilityMapping.permission = cp.permission;
          }
          if (!cp) {
            cy.log('cp ' + permissionCapabilityMapping.permissionName);
          }
        });
      });
      cy.getCapabilitySetsApi().then(capabilitySets => {
        permissionCapabilityMappingData.forEach((permissionCapabilityMapping) => {
          const cps = capabilitySets.find(capability => capability.name === permissionCapabilityMapping.capabilityName);
          if (cps) {
            permissionCapabilityMapping.capabilitySetName = cps.name;
          }
          if (!cps) {
            cy.log('cs ' + permissionCapabilityMapping.capabilityName);
          }
        });
      })
        .then(() => {
          const newObj = Object.assign(...permissionCapabilityMappingData.map((pm) => ({
            [pm.name]: {
              internal: pm.permissionName,
              gui: pm.displayName,
              capabilityName: pm.capabilityName,
              capabilitySetName: pm.capabilitySetName
            }
          })));

          const json = JSON.stringify(newObj);
    //      console.log(json);
          const unquoted = json.replace(/"([^"]+)":/g, '$1:');
    //      console.log(unquoted);

    //      cy.log(unquoted);
        });
    }
  );
});
