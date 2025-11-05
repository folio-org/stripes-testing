import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C656293_UserRole_${getRandomPostfix()}`,
        applicationName: 'app-acquisitions',
        capabilitySets: [
          {
            table: CAPABILITY_TYPES.DATA,
            resource: 'Acquisitions-Units Memberships',
            action: CAPABILITY_ACTIONS.MANAGE,
          },
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'UI-Invoice Invoice Pay',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        capabilities: [
          {
            table: CAPABILITY_TYPES.SETTINGS,
            resource: 'Module Finance Enabled',
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            table: CAPABILITY_TYPES.PROCEDURAL,
            resource: 'Invoice Item Cancel',
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
        acquisitionsModuleNames: [
          'mod-organizations',
          'ui-organizations',
          'mod-organizations-storage',
          'mod-orders',
          'mod-orders-storage',
          'ui-orders',
          'mod-invoice',
          'mod-invoice-storage',
          'ui-invoice',
          'ui-receiving',
          'mod-finance',
          'mod-finance-storage',
          'ui-finance',
          'organizations plugins',
          'invoice plugins',
          'orders plugins',
          'receiving plugins',
          'edge-orders',
          'ui-acq-components',
        ],
        absentCapabilitySetTables: [CAPABILITY_TYPES.SETTINGS],
      };

      const capabSetsToAssign = [
        CapabilitySets.uiAuthorizationRolesSettingsCreate,
        CapabilitySets.uiAuthorizationRolesSettingsEdit,
      ];

      const resourceNames = [];

      before('Creating user, login', () => {
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;
          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
          if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.user.userId, []);

          // get resource names for ACQ modules
          cy.getCapabilitiesApi().then((capabilities) => {
            cy.getCapabilitySetsApi().then((capabilitySets) => {
              [...capabilities, ...capabilitySets].forEach((capabOrSet) => {
                if (
                  testData.acquisitionsModuleNames.some((moduleName) => {
                    return (
                      capabOrSet.moduleId.includes(moduleName) &&
                      !resourceNames.includes(capabOrSet.resource)
                    );
                  })
                ) resourceNames.push(capabOrSet.resource);
              });
            });
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Deleting user, role', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId);
        });
      });

      it(
        'C656293 Selecting capabilities in "app-acquisitions" app (thunderjet)',
        { tags: ['criticalPath', 'thunderjet', 'eureka', 'C656293'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.verifySelectApplicationModal();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName);
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.applicationName]);
          resourceNames.forEach((resourceName) => {
            AuthorizationRoles.verifyResourceOrAppPresent(resourceName, 1);
          });
          testData.capabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.selectCapabilitySetCheckbox(capabilitySet);
          });
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.selectCapabilityCheckbox(capability);
          });
          AuthorizationRoles.clickSaveButton();
          AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
          AuthorizationRoles.verifyRoleViewPane(testData.roleName);

          AuthorizationRoles.clickOnCapabilitySetsAccordion();
          testData.capabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          AuthorizationRoles.clickOnCapabilitiesAccordion();
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          testData.absentCapabilitySetTables.forEach((table) => {
            AuthorizationRoles.verifyCapabilitySetTableAbsent(table);
          });

          AuthorizationRoles.openForEdit();
          testData.capabilitySets.forEach((capabilitySet) => {
            AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabilitySet);
          });
          testData.capabilities.forEach((capability) => {
            AuthorizationRoles.verifyCapabilityCheckboxChecked(capability);
          });
          AuthorizationRoles.verifyAppNamesInCapabilityTables([testData.applicationName]);
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectAllApplicationsInModal();
          AuthorizationRoles.selectApplicationInModal(testData.applicationName, false);
          AuthorizationRoles.clickSaveInModal({ confirmUnselect: true });
          AuthorizationRoles.verifyResourceOrAppPresent(testData.applicationName, 0, false);
          AuthorizationRoles.closeRoleEditView();
          AuthorizationRoles.verifyRoleViewPane(testData.roleName);
        },
      );
    });
  });
});
