import AuthorizationRoles from '../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';
import { APPLICATION_NAMES, CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../support/constants';

let user;
const testData = {
  roleName: `Auto Role C389473 ${getRandomPostfix()}`,
  capabSetIds: [],
};
const capabSetsToAssign = [
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Users Settings',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users Roles',
    action: CAPABILITY_ACTIONS.VIEW,
  },
];
const capabsToVerify = [
  {
    table: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Data-Export Settings',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    table: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Data-Export Settings',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Data-Export',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Data-Export',
    action: CAPABILITY_ACTIONS.EDIT,
  },
];

describe('Data Export', () => {
  before('Create test data', () => {
    cy.createTempUser([]).then((userProperties) => {
      user = userProperties;
      cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
        testData.roleId = role.id;

        capabSetsToAssign.forEach((capabilitySet) => {
          cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
            testData.capabSetIds.push(capabSetId);
          });
        });

        cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
        cy.addRolesToNewUserApi(user.userId, [testData.roleId]);
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
    cy.deleteAuthorizationRoleApi(testData.roleId);
  });

  it(
    'C389473 Verify "UI-Data-Export Settings - settings/view" capability set (firebird) (Taas)',
    { tags: ['firebird', 'extendedPath', 'C389473'] },
    () => {
      cy.login(user.username, user.password);
      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Authorization roles');

      AuthorizationRoles.waitContentLoading();
      AuthorizationRoles.searchRole(testData.roleName);
      AuthorizationRoles.clickOnRoleName(testData.roleName);
      AuthorizationRoles.openForEdit();
      AuthorizationRoles.clickSelectApplication();
      AuthorizationRoles.selectAllApplicationsInModal();
      AuthorizationRoles.clickSaveInModal();
      AuthorizationRoles.checkCapabilitySpinnersShown();
      AuthorizationRoles.checkCapabilitySpinnersAbsent();

      capabsToVerify.forEach((capab) => {
        AuthorizationRoles.verifyCapabilitySetCheckboxEnabled(capab);
      });
      capabsToVerify.forEach((capab) => {
        AuthorizationRoles.verifyCapabilityCheckboxUncheckedAndEnabled(capab);
      });
    },
  );
});
