import Capabilities from '../../../support/dictionary/capabilities';
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import UserEdit from '../../../support/fragments/users/userEdit';
import UsersCard from '../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Users', () => {
    const postfix = getRandomPostfix();
    const testData = {
      roleAlphaName: `AT_C1538665_UserRole_Alpha_${postfix}`,
      roleBetaName: `AT_C1538665_UserRole_Beta_${postfix}`,
      roleGammaName: `AT_C1538665_UserRole_Gamma_${postfix}`,
    };
    const capabSetsToAssign = [CapabilitySets.uiUsersRolesManage, CapabilitySets.uiUsersEdit];

    before('Create roles, users, assign roles, login', () => {
      cy.getAdminToken();

      // Preconditions #3: two roles exist, each with at least one different capability assigned
      cy.createAuthorizationRoleApi(testData.roleAlphaName).then((role) => {
        testData.roleAlphaId = role.id;
        cy.getCapabilityIdViaApi(Capabilities.settingsEnabled).then((capabId) => {
          cy.addCapabilitiesToNewRoleApi(role.id, [capabId]);
        });
      });
      cy.createAuthorizationRoleApi(testData.roleBetaName).then((role) => {
        testData.roleBetaId = role.id;
        cy.getCapabilityIdViaApi(Capabilities.uiUsersView).then((capabId) => {
          cy.addCapabilitiesToNewRoleApi(role.id, [capabId]);
        });
      });
      // A third, unassigned role - needed for step 7 (an unassigned role's link in the modal)
      cy.createAuthorizationRoleApi(testData.roleGammaName).then((role) => {
        testData.roleGammaId = role.id;
        cy.getCapabilityIdViaApi(Capabilities.uiUsersCreate).then((capabId) => {
          cy.addCapabilitiesToNewRoleApi(role.id, [capabId]);
        });
      });

      cy.then(() => {
        // Preconditions #4: a Test User with Role Alpha and Role Beta assigned
        cy.createTempUser([]).then((testUserProperties) => {
          testData.testUser = testUserProperties;
          cy.updateRolesForUserApi(testData.testUser.userId, [
            testData.roleAlphaId,
            testData.roleBetaId,
          ]);
        });

        // Preconditions #1-2: User A with specific capability sets
        cy.createTempUser([]).then((userAProperties) => {
          testData.userA = userAProperties;
          cy.assignCapabilitiesToExistingUser(testData.userA.userId, [], capabSetsToAssign);
        });
      }).then(() => {
        cy.login(testData.userA.username, testData.userA.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });

        // Preconditions #5: User A is on Test User's details page (view mode)
        UsersSearchPane.searchByKeywords(testData.testUser.username);
        UsersSearchPane.clickOnUserRowContaining(testData.testUser.username);
        UsersCard.verifyUserCardOpened();
      });
    });

    after('Delete roles, users', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.testUser?.userId);
      Users.deleteViaApi(testData.userA?.userId);
      cy.deleteAuthorizationRoleApi(testData.roleAlphaId);
      cy.deleteAuthorizationRoleApi(testData.roleBetaId);
      cy.deleteAuthorizationRoleApi(testData.roleGammaId);
    });

    it(
      'C1538665 View Authorization role detail page from User roles accordion and modal (eureka)',
      { tags: ['extendedPath', 'eureka', 'C1538665'] },
      () => {
        // Step 1: "User roles" accordion shows both roles, each rendered as a hyperlink
        UsersCard.clickUserRolesAccordion();
        UsersCard.verifyUserRoleNames([testData.roleAlphaName, testData.roleBetaName]);
        UsersCard.verifyUserRoleIsLink(testData.roleAlphaName);
        UsersCard.verifyUserRoleIsLink(testData.roleBetaName);

        // Step 2: Role Alpha's link has target="_blank" (verified inside clickUserRoleLink,
        // which by web-standard definition guarantees clicking it leaves the original tab on
        // Test User's details page, unchanged), then opens to Role Alpha's own detail pane
        UsersCard.clickUserRoleLink(testData.roleAlphaName);
        AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleAlphaName);
        AuthorizationRoles.goBackWithWait();
        UsersCard.verifyUserCardOpened();
        UsersCard.ensureUserRolesAccordionExpanded();

        // Step 3: Role Beta's link opens to Role Beta's own detail pane
        UsersCard.clickUserRoleLink(testData.roleBetaName);
        AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleBetaName);
        AuthorizationRoles.goBackWithWait();
        UsersCard.verifyUserCardOpened();
        UsersCard.ensureUserRolesAccordionExpanded();

        // Step 4: Actions > Edit, expand "User roles" accordion on the edit form - both roles
        // shown as hyperlinks, each with its "x" remove icon
        UserEdit.openEdit();
        UserEdit.clickUserRolesAccordion();
        UserEdit.verifyUserRoleNames([testData.roleAlphaName, testData.roleBetaName]);
        UserEdit.verifyUserRoleIsLinkInEditForm(testData.roleAlphaName);
        UserEdit.verifyUserRoleIsLinkInEditForm(testData.roleBetaName);

        // Step 5: Role Alpha's link has target="_blank" (verified inside
        // clickUserRoleLinkInEditForm, which guarantees clicking it doesn't unassign the role
        // or trigger an unsaved-changes prompt - the edit form stays open and unchanged), then
        // opens to Role Alpha's own detail pane
        UserEdit.clickUserRoleLinkInEditForm(testData.roleAlphaName);
        AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleAlphaName);
        AuthorizationRoles.goBackWithWait();
        UserEdit.waitLoading();
        UserEdit.ensureUserRolesAccordionExpanded();

        // Step 6: "Select user roles" modal - every row (assigned and unassigned) shows a
        // checkbox and the role name as a link
        UserEdit.clickAddUserRolesButton();
        UserEdit.verifySelectRolesModal();

        UserEdit.searchRoleInModal(testData.roleAlphaName);
        UserEdit.verifyRoleInModal(testData.roleAlphaName, { isChecked: true });
        UserEdit.verifyRoleIsLinkInModal(testData.roleAlphaName);

        UserEdit.searchRoleInModal(testData.roleGammaName);
        UserEdit.verifyRoleInModal(testData.roleGammaName, { isChecked: false });
        UserEdit.verifyRoleIsLinkInModal(testData.roleGammaName);

        // Step 7: Role Gamma's link has target="_blank" (verified inside clickRoleLinkInModal,
        // which guarantees clicking it doesn't select/assign the unassigned role - the modal
        // stays open, the checkbox remains unchecked), then opens to Role Gamma's own detail
        // pane
        UserEdit.clickRoleLinkInModal(testData.roleGammaName);
        AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleGammaName);
      },
    );
  });
});
