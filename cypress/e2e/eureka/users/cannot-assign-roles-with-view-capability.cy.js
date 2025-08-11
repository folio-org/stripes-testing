import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UserEdit from '../../../support/fragments/users/userEdit';
import getRandomPostfix from '../../../support/utils/stringTools';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import { APPLICATION_NAMES } from '../../../support/constants';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import CapabilitySets from '../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      roleName: `AT_C627241_UserRole_${getRandomPostfix()}`,
    };

    const capabSetsToAssign = [CapabilitySets.uiUsersRolesView, CapabilitySets.uiUsersEdit];

    before('Create users, role', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((createdTestUserProperties) => {
        testData.tempUser = createdTestUserProperties;
        cy.assignCapabilitiesToExistingUser(testData.tempUser.userId, [], capabSetsToAssign);
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(testData.tempUser.userId, []);
      });
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.userForRole = createdUserProperties;
      });
      cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
        testData.roleId = role.id;
        cy.getCapabilitiesApi(2).then((capabs) => {
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
    });

    before('Assign role, login', () => {
      cy.getAdminToken();
      if (Cypress.env('runAsAdmin')) {
        cy.updateRolesForUserApi(testData.userForRole.userId, [testData.roleId]);
      } else {
        cy.addRolesToNewUserApi(testData.userForRole.userId, [testData.roleId]);
      }
      cy.login(testData.tempUser.username, testData.tempUser.password);
    });

    after('Delete role, users', () => {
      cy.getAdminToken();
      cy.deleteAuthorizationRoleApi(testData.roleId);
      Users.deleteViaApi(testData.userForRole.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      "C627241 [UIU-3301] Verify that user with ui-users.roles. - View can't assign/unassign roles while editing user (eureka)",
      { tags: ['criticalPath', 'eureka', 'C627241'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.USERS);
        Users.waitLoading();
        UsersSearchPane.searchByUsername(testData.userForRole.username);
        UsersSearchPane.selectUserFromList(testData.userForRole.username);
        UsersCard.verifyUserRolesCounter('1');
        UserEdit.openEdit();
        UserEdit.checkUserEditPaneOpened();
        UserEdit.verifyUserRolesCounter('1');
        UserEdit.clickUserRolesAccordion(true, false);
        UserEdit.verifyUserRoleNames([testData.roleName], false);
      },
    );
  });
});
