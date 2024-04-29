/* eslint-disable no-unused-vars */
import UserEdit from '../../../support/fragments/users/userEdit';
import Users from '../../../support/fragments/users/users';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';

describe('Eureka', () => {
  describe('Users', () => {
    const testData = {
      role0Name: `Auto Role 0 C443314 ${getRandomPostfix()}`,
      roleAName: `Auto Role A C443314 ${getRandomPostfix()}`,
      roleBName: `Auto Role B C443314 ${getRandomPostfix()}`,
    };

    before('Create users, roles', () => {
      cy.getAdminToken();
      cy.createTempUser([]).then((createdUserProperties) => {
        testData.tempUser = createdUserProperties;
      });
      cy.createTempUser([]).then((createdUserAProperties) => {
        testData.userA = createdUserAProperties;
      });
      cy.createTempUser([]).then((createdUserBProperties) => {
        testData.userB = createdUserBProperties;
      });
      cy.createAuthorizationRoleApi(testData.role0Name).then((role0) => {
        testData.role0Id = role0.id;
        cy.createAuthorizationRoleApi(testData.role0Name).then((roleA) => {
          testData.roleAId = roleA.id;
          cy.createAuthorizationRoleApi(testData.role0Name).then((roleB) => {
            testData.roleBId = roleB.id;
            cy.getCapabilitiesApi(2).then((capabs) => {
              cy.getCapabilitySetsApi(2).then((capabSets) => {
                cy.addCapabilitiesToNewRoleApi(
                  testData.roleAId,
                  capabs.map((capab) => capab.id),
                );
                cy.addCapabilitiesToNewRoleApi(
                  testData.roleBId,
                  capabs.map((capab) => capab.id),
                );
                cy.addCapabilitySetsToNewRoleApi(
                  testData.roleAId,
                  capabSets.map((capab) => capab.id),
                );
              });
            });
          });
        });
      });
    });

    before('Assign roles, login', () => {
      cy.getAdminToken();
      // TO DO: rewrite when users will not have admin role assigned upon creation
      cy.deleteRolesForUserApi(testData.userA.userId);
      cy.updateRolesForUserApi(testData.userB.userId, [testData.role0Id]);
      cy.login(testData.tempUser.username, testData.tempUser.password, {
        path: TopMenu.settingsAuthorizationRoles,
        waiter: Users.waitLoading,
      });
      UsersSearchPane.searchByUsername(testData.userB.username);
    });

    after('Delete roles, users', () => {
      cy.getAdminToken();
      cy.deleteCapabilitiesFromRoleApi(testData.roleAId);
      cy.deleteCapabilitiesFromRoleApi(testData.roleBId);
      cy.deleteCapabilitySetsFromRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleAId);
      cy.deleteAuthorizationRoleApi(testData.roleBId);
      cy.deleteAuthorizationRoleApi(testData.role0Id);
      Users.deleteViaApi(testData.userA.userId);
      Users.deleteViaApi(testData.userB.userId);
      Users.deleteViaApi(testData.tempUser.userId);
    });

    it(
      'C464314 Assigned roles shown in user detailed view (eureka)',
      { tags: ['criticalPath', 'eureka', 'eurekaPhase1'] },
      () => {
        UsersSearchPane.selectUserFromList(testData.userB.username);

        // UserEdit.verifyUserPermissionsAccordion(false);
        // Users.saveCreatedUser();
        // Users.checkCreateUserPaneOpened(false);

        // Users.verifyLastNameOnUserDetailsPane(testData.lastName);
        // UsersCard.verifyUserPermissionsAccordion(false);

        // UserEdit.openEdit();
        // UserEdit.checkUserEditPaneOpened();
        // UserEdit.verifyUserPermissionsAccordion(false);
        // UserEdit.closeUsingIcon();
        // UserEdit.checkUserEditPaneOpened(false);

        // UsersSearchPane.searchByKeywords(testData.tempUser.username);
        // UsersSearchPane.openUser(testData.tempUser.userId);
        // Users.verifyLastNameOnUserDetailsPane(testData.tempUser.lastName);
        // UsersCard.verifyUserPermissionsAccordion(false);
        // UserEdit.openEdit();
        // UserEdit.checkUserEditPaneOpened();
        // UserEdit.verifyUserPermissionsAccordion(false);
      },
    );
  });
});
