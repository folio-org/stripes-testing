import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../../../support/constants';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { tenantNames } from '../../../../../support/dictionary/affiliations';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C965844_UserRole_${getRandomPostfix()}`,
        capabilityColumns: [
          {
            type: CAPABILITY_TYPES.DATA,
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            type: CAPABILITY_TYPES.DATA,
            action: CAPABILITY_ACTIONS.EDIT,
          },
          {
            type: CAPABILITY_TYPES.DATA,
            action: CAPABILITY_ACTIONS.CREATE,
          },
          {
            type: CAPABILITY_TYPES.DATA,
            action: CAPABILITY_ACTIONS.DELETE,
          },
          {
            type: CAPABILITY_TYPES.DATA,
            action: CAPABILITY_ACTIONS.MANAGE,
          },
          {
            type: CAPABILITY_TYPES.SETTINGS,
            action: CAPABILITY_ACTIONS.VIEW,
          },
          {
            type: CAPABILITY_TYPES.SETTINGS,
            action: CAPABILITY_ACTIONS.EDIT,
          },
          {
            type: CAPABILITY_TYPES.SETTINGS,
            action: CAPABILITY_ACTIONS.CREATE,
          },
          {
            type: CAPABILITY_TYPES.SETTINGS,
            action: CAPABILITY_ACTIONS.DELETE,
          },
          {
            type: CAPABILITY_TYPES.SETTINGS,
            action: CAPABILITY_ACTIONS.MANAGE,
          },
          {
            type: CAPABILITY_TYPES.PROCEDURAL,
            action: CAPABILITY_ACTIONS.EXECUTE,
          },
        ],
      };

      const capabSetsForTestUser = [CapabilitySets.uiAuthorizationRolesSettingsEdit];

      let capabilitiesCount;
      let capabilitySetsCount;

      before('Create test user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;

          cy.then(() => {
            cy.getCapabilitiesApi(5000, true, { customTimeout: 60_000 }).then((capabs) => {
              capabilitiesCount = capabs.length;
            });
            cy.getCapabilitySetsApi().then((capabSets) => {
              capabilitySetsCount = capabSets.length;
            });
            cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
              testData.roleId = role.id;
              cy.getCapabilitiesApi(2, true).then((capabs) => {
                cy.getCapabilitySetsApi(2).then((capabSets) => {
                  cy.addCapabilitiesToNewRoleApi(
                    testData.roleId,
                    capabs.map((capab) => capab.id),
                  );
                  cy.addCapabilitySetsToNewRoleApi(
                    testData.roleId,
                    capabSets.map((capabSet) => capabSet.id),
                  );
                });
              });
            });
          }).then(() => {
            cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsForTestUser);
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.settingsAuthorizationRoles,
              waiter: AuthorizationRoles.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });
      });

      after('Delete test user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        cy.deleteAuthorizationRoleApi(testData.roleId, true);
      });

      it(
        'C965844 Eureka | User can add all capabs/sets to the existing role on Central tenant (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C965844'] },
        () => {
          AuthorizationRoles.searchRole(testData.roleName);
          AuthorizationRoles.clickOnRoleName(testData.roleName);

          AuthorizationRoles.openForEdit();
          AuthorizationRoles.clickSelectApplication();
          AuthorizationRoles.selectAllApplicationsInModal();
          AuthorizationRoles.clickSaveInModal();
          AuthorizationRoles.checkCapabilitySpinnersAbsent();
          testData.capabilityColumns.forEach((capabilityColumn) => {
            AuthorizationRoles.selectCapabilitySetColumn(
              capabilityColumn.type,
              capabilityColumn.action,
            );
            cy.wait(10);
          });
          testData.capabilityColumns.forEach((capabilityColumn) => {
            AuthorizationRoles.selectCapabilityColumn(
              capabilityColumn.type,
              capabilityColumn.action,
            );
            cy.wait(10);
          });
          cy.intercept('PUT', `/roles/${testData.roleId}`).as('roleCall');
          cy.intercept('PUT', `/roles/${testData.roleId}/capability-sets`).as('capabilitySetsCall');
          cy.intercept('PUT', `/roles/${testData.roleId}/capabilities`).as('capabilitiesCall');
          AuthorizationRoles.clickSaveButton();
          cy.then(() => {
            cy.wait('@roleCall', { timeout: 120_000 }).then((callRole) => {
              expect(callRole.response.statusCode).to.eq(204);
            });
            cy.wait('@capabilitiesCall', { timeout: 120_000 }).then((callCapabs) => {
              expect(callCapabs.response.statusCode).to.eq(204);
            });
            cy.wait('@capabilitySetsCall', { timeout: 120_000 }).then((callCapabSets) => {
              expect(callCapabSets.response.statusCode).to.eq(204);
            });
          }).then(() => {
            AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
            AuthorizationRoles.verifyRoleViewPane(testData.roleName);
            AuthorizationRoles.checkCapabilitySetsAccordionCounter(`${capabilitySetsCount}`);
            AuthorizationRoles.checkCapabilitiesAccordionCounter(`${capabilitiesCount}`);
          });
        },
      );
    });
  });
});
