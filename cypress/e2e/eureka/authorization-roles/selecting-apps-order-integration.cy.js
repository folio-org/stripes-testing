import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe.skip('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const applicationNames = ['app-gobi', 'app-ebsconet', 'app-mosaic'];
      const testData = {
        roleName: `AT_C736766_UserRole_${getRandomPostfix()}`,
        gobiCapabilitySets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Gobi Orders Mappings',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
        ],
        gobiCapabilities: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Gobi Orders Item',
            action: CAPABILITY_ACTIONS.CREATE,
          },
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Settings Gobi-Settings Enabled',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Gobi Validate Item Get',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        gobiModules: ['mod-gobi', 'ui-gobi-settings'],
        ebsconetModules: ['mod-ebsconet'],
        mosaicModules: ['mod-mosaic', 'ui-mosaic-settings'],
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesSettingsEdit,
      ];

      const gobiResourceNames = [];
      const ebsconetResourceNames = [];
      const mosaicResourceNames = [];

      before('Creating user, login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);

          // get resource names for modules for each application
          cy.getCapabilitiesApi().then((capabilities) => {
            cy.getCapabilitySetsApi().then((capabilitySets) => {
              [...capabilities, ...capabilitySets].forEach((capabOrSet) => {
                if (
                  testData.gobiModules.some((moduleName) => {
                    return (
                      capabOrSet.moduleId.includes(moduleName) &&
                      !gobiResourceNames.includes(capabOrSet.resource)
                    );
                  })
                ) gobiResourceNames.push(capabOrSet.resource);
                if (
                  testData.ebsconetModules.some((moduleName) => {
                    return (
                      capabOrSet.moduleId.includes(moduleName) &&
                      !ebsconetResourceNames.includes(capabOrSet.resource)
                    );
                  })
                ) ebsconetResourceNames.push(capabOrSet.resource);
                if (
                  testData.mosaicModules.some((moduleName) => {
                    return (
                      capabOrSet.moduleId.includes(moduleName) &&
                      !mosaicResourceNames.includes(capabOrSet.resource)
                    );
                  })
                ) mosaicResourceNames.push(capabOrSet.resource);
              });
            });
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });
            cy.reload();
            AuthorizationRoles.waitContentLoading();
          }, 20_000);
        });
      });

      after('Deleting user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      // Trillium+ only
      it(
        'C736766 Selecting applications for order integrations when create authorization role (thunderjet)',
        { tags: [] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifySelectApplicationModal();
          applicationNames.forEach((appName) => {
            AuthorizationRoles.checkApplicationShownInModal(appName);
          });
          AuthorizationRoles.selectApplicationInModal(applicationNames[0], true);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([applicationNames[0]]);
          gobiResourceNames.forEach((resourceName) => {
            AuthorizationRoles.verifyResourceOrAppPresent(resourceName, 1);
          });
          testData.gobiCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.selectCapabilitySetCheckbox(capabilitySet);
          });
          testData.gobiCapabilities.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
          AuthorizationRoles.verifyRoleViewPane(testData.roleName);

          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.gobiCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.gobiCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });

          AuthorizationRoles.openForEdit();
          testData.gobiCapabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          testData.gobiCapabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          AuthorizationRoles.verifyAppNamesInCapabilityTables([applicationNames[0]]);

          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(applicationNames[0], false);
          AuthorizationRoles.selectApplicationInModal(applicationNames[1]);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([applicationNames[1]]);
          ebsconetResourceNames.forEach((resourceName) => {
            AuthorizationRoles.verifyResourceOrAppPresent(resourceName, 1);
          });

          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectApplicationInModal(applicationNames[1], false);
          AuthorizationRoles.selectApplicationInModal(applicationNames[2]);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([applicationNames[2]]);
          mosaicResourceNames.forEach((resourceName) => {
            AuthorizationRoles.verifyResourceOrAppPresent(resourceName, 1);
          });
          AuthorizationRoles.closeRoleEditView();
          AuthorizationRoles.verifyRoleViewPane(testData.roleName);
        },
      );
    });
  });
});
