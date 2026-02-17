import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import AuthorizationRoles from '../../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../../../support/constants';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';

describe('Eureka', () => {
  describe('Settings', () => {
    describe('Authorization roles', () => {
      const testData = {
        roleName: `AT_C965845_UserRole_${getRandomPostfix()}`,
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

      const capabSetsForTestUser = [CapabilitySets.uiAuthorizationRolesSettingsCreate];

      let capabilitiesCount;
      let capabilitySetsCount;

      before('Create test user', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        cy.createTempUser([]).then((createdUserProperties) => {
          testData.user = createdUserProperties;

          cy.getCapabilitiesApi(5000, true, { customTimeout: 60_000 }).then((capabs) => {
            capabilitiesCount = capabs.length;
          });
          cy.getCapabilitySetsApi().then((capabSets) => {
            capabilitySetsCount = capabSets.length;
          });

          cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsForTestUser);
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.settingsAuthorizationRoles,
            waiter: AuthorizationRoles.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
        });
      });

      after('Delete test user, data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);

        Users.deleteViaApi(testData.user.userId);
        cy.getUserRoleIdByNameApi(testData.roleName).then((roleId) => {
          cy.deleteAuthorizationRoleApi(roleId, true);
        });
      });

      it(
        'C965845 Eureka | User can create role with all capabs/sets on Member tenant (eureka)',
        { tags: ['criticalPathECS', 'eureka', 'C965845'] },
        () => {
          AuthorizationRoles.clickNewButton();
          AuthorizationRoles.fillRoleNameDescription(testData.roleName);
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
          cy.intercept('POST', '/roles*').as('rolesCall');
          cy.intercept('POST', '/roles/capabilities*').as('capabilitiesCall');
          cy.intercept('POST', '/roles/capability-sets*').as('capabilitySetsCall');
          AuthorizationRoles.clickSaveButton();
          cy.then(() => {
            cy.wait('@rolesCall', { timeout: 120_000 }).then((callRole) => {
              expect(callRole.response.statusCode).to.eq(201);
            });
            cy.wait('@capabilitiesCall', { timeout: 120_000 }).then((callCapabs) => {
              expect(callCapabs.response.statusCode).to.eq(201);
            });
            cy.wait('@capabilitySetsCall', { timeout: 120_000 }).then((callCapabSets) => {
              expect(callCapabSets.response.statusCode).to.eq(201);
              expect(callCapabSets.request.body.capabilitySetIds).to.have.lengthOf(
                capabilitySetsCount,
              );
            });
          }).then(() => {
            AuthorizationRoles.checkAfterSaveCreate(testData.roleName);
            AuthorizationRoles.verifyRoleViewPane(testData.roleName);
            AuthorizationRoles.checkCapabilitySetsAccordionCounter(`${capabilitySetsCount}`);
            AuthorizationRoles.checkCapabilitiesAccordionCounter(`${capabilitiesCount}`);
          });
        },
      );
    });
  });
});
