import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Capabilities from '../../../../support/dictionary/capabilities';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import AuthorizationRoles from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import UserEdit from '../../../../support/fragments/users/userEdit';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const postfix = getRandomPostfix();
      const testData = {
        roleAName: `AT_C1538673_UserRole_A_${postfix}`, // Central only
        roleBName: `AT_C1538673_UserRole_B_${postfix}`, // Member only
        roleCName: `AT_C1538673_UserRole_C_${postfix}`, // shared Central -> all members
        roleEName: `AT_C1538673_UserRole_E_${postfix}`, // Central only, unassigned
        roleFName: `AT_C1538673_UserRole_F_${postfix}`, // Member only, unassigned
      };
      const capabSetsToAssignCentral = [
        CapabilitySets.uiUsersEdit,
        CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
        CapabilitySets.uiAuthorizationRolesSettingsView,
        CapabilitySets.uiConsortiaSettingsConsortiaAffiliationsView,
      ];
      const capabSetsToAssignMember = [
        CapabilitySets.uiUsersEdit,
        CapabilitySets.uiAuthorizationRolesUsersSettingsManage,
        CapabilitySets.uiAuthorizationRolesSettingsView,
      ];

      before('Create roles, users, assign roles and capabilities', () => {
        cy.getAdminToken();

        // Preconditions: Role A (Central only), Role E (Central only, unassigned)
        cy.createAuthorizationRoleApi(testData.roleAName).then((role) => {
          testData.roleAId = role.id;
          cy.getCapabilityIdViaApi(Capabilities.settingsEnabled).then((capabId) => {
            cy.addCapabilitiesToNewRoleApi(role.id, [capabId]);
          });
        });
        cy.createAuthorizationRoleApi(testData.roleEName).then((role) => {
          testData.roleEId = role.id;
          cy.getCapabilityIdViaApi(Capabilities.uiUsersEdit).then((capabId) => {
            cy.addCapabilitiesToNewRoleApi(role.id, [capabId]);
          });
        });
        // Shared Role C: created in Central, capability added, then shared to all members
        cy.createAuthorizationRoleApi(testData.roleCName).then((role) => {
          testData.roleCId = role.id;
          cy.getCapabilityIdViaApi(Capabilities.uiUsersCreate).then((capabId) => {
            cy.addCapabilitiesToNewRoleApi(role.id, [capabId]).then(() => {
              cy.shareRoleWithCapabilitiesApi({ id: role.id, name: testData.roleCName });
            });
          });
        });

        cy.then(() => {
          // Preconditions: Role B (Member only), Role F (Member only, unassigned)
          cy.setTenant(Affiliations.College);
          cy.createAuthorizationRoleApi(testData.roleBName).then((role) => {
            testData.roleBId = role.id;
            cy.getCapabilityIdViaApi(Capabilities.uiUsersView).then((capabId) => {
              cy.addCapabilitiesToNewRoleApi(role.id, [capabId]);
            });
          });
          cy.createAuthorizationRoleApi(testData.roleFName).then((role) => {
            testData.roleFId = role.id;
            cy.getCapabilityIdViaApi(Capabilities.uiTagsManage).then((capabId) => {
              cy.addCapabilitiesToNewRoleApi(role.id, [capabId]);
            });
          });
          cy.resetTenant();

          // Preconditions: Test User - affiliations in Central and Member, roles per tenant
          cy.createTempUser([]).then((testUserProperties) => {
            testData.testUser = testUserProperties;
            cy.assignAffiliationToUser(Affiliations.College, testData.testUser.userId);
          });

          // Preconditions: User A - affiliations in Central and Member, capability sets per tenant
          cy.createTempUser([]).then((userAProperties) => {
            testData.userA = userAProperties;
            cy.assignAffiliationToUser(Affiliations.College, testData.userA.userId);
            cy.assignCapabilitiesToExistingUser(
              testData.userA.userId,
              [],
              capabSetsToAssignCentral,
            );
            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(testData.userA.userId, [], capabSetsToAssignMember);
            cy.resetTenant();
          });
        })
          .then(() => {
            cy.addRolesToNewUserApi(testData.testUser.userId, [testData.roleAId, testData.roleCId]);
            cy.setTenant(Affiliations.College);
            cy.getUserRoleIdByNameApi(testData.roleCName).then((memberRoleCId) => {
              cy.addRolesToNewUserApi(testData.testUser.userId, [testData.roleBId, memberRoleCId]);
            });
            cy.resetTenant();
          })
          .then(() => {
            cy.login(testData.userA.username, testData.userA.password, {
              path: TopMenu.usersPath,
              waiter: Users.waitLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);

            UsersSearchPane.searchByKeywords(testData.testUser.username);
            UsersSearchPane.clickOnUserRowContaining(testData.testUser.username);
            UsersCard.verifyUserCardOpened();
          });
      });

      after('Delete roles, users', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        Users.deleteViaApi(testData.testUser?.userId);
        Users.deleteViaApi(testData.userA?.userId);
        if (testData.roleCId) cy.deleteSharedRoleApi({ id: testData.roleCId, name: testData.roleCName }, true);
        cy.deleteAuthorizationRoleApi(testData.roleAId, true);
        cy.deleteAuthorizationRoleApi(testData.roleEId, true);
        cy.deleteAuthorizationRoleApi(testData.roleCId, true);
        cy.setTenant(Affiliations.College);
        cy.deleteAuthorizationRoleApi(testData.roleBId, true);
        cy.deleteAuthorizationRoleApi(testData.roleFId, true);
      });

      it(
        'C1538673 User can open Role details assigned to user in different tenants with appropriate capabilities assigned (eureka)',
        { tags: ['extendedPathECS', 'eureka', 'C1538673'] },
        () => {
          // Step 1: Test User's page, User roles accordion - Central is current tenant, Role A
          // and shared Role C shown as hyperlinks
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleIsLink(testData.roleAName);
          UsersCard.verifyUserRoleIsLink(testData.roleCName);

          // Step 2: Role A's link has target="_blank" (verified inside clickUserRoleLink), opens
          // to Role A's own detail pane
          UsersCard.clickUserRoleLink(testData.roleAName);
          AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleAName);

          // Step 3: back on Test User's page, selecting Member tenant in the accordion's own
          // Affiliation dropdown (view-only preview, active affiliation stays Central) shows
          // Role B and shared Role C as plain text
          AuthorizationRoles.goBackWithWait();
          UsersCard.verifyUserCardOpened();
          UsersCard.ensureUserRolesAccordionExpanded();
          UsersCard.selectRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleIsPlainText(testData.roleBName);
          UsersCard.verifyUserRoleIsPlainText(testData.roleCName);

          // Step 4: Actions > Edit - accordion's Affiliation dropdown resets to Central (the
          // real active affiliation), Role A and shared Role C shown as hyperlinks
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.checkSelectedRolesAffiliation(tenantNames.central);
          UserEdit.verifyUserRoleIsLinkInEditForm(testData.roleAName);
          UserEdit.verifyUserRoleIsLinkInEditForm(testData.roleCName);

          // Step 5: Role C's link opens to Role C's own detail pane
          UserEdit.clickUserRoleLinkInEditForm(testData.roleCName);
          AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleCName);

          // Step 6: back on the edit form, "Select user roles" modal - assigned (Role A) and
          // unassigned (Role E) roles both display as hyperlinks
          AuthorizationRoles.goBackWithWait();
          UserEdit.waitLoading();
          UserEdit.ensureUserRolesAccordionExpanded();
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.verifyAllRolesLinkStatusInModal({ isLink: true });
          UserEdit.searchRoleInModal(testData.roleAName);
          UserEdit.verifyRoleInModal(testData.roleAName, { isChecked: true });
          UserEdit.searchRoleInModal(testData.roleEName);
          UserEdit.verifyRoleInModal(testData.roleEName, { isChecked: false });

          // Step 7: clicking an unassigned role's (Role E) link opens its own detail pane; the
          // target="_blank" check inside clickRoleLinkInModal proves the modal/checkbox state is
          // left untouched by the click
          UserEdit.clickRoleLinkInModal(testData.roleEName);
          AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleEName);

          // Step 8: back on the edit form (the modal closes itself on the back-navigation),
          // selecting Member tenant in the accordion's own Affiliation dropdown shows Role B and
          // shared Role C as plain text
          AuthorizationRoles.goBackWithWait();
          UserEdit.waitLoading();
          UserEdit.ensureUserRolesAccordionExpanded();
          UserEdit.selectRolesAffiliation(tenantNames.college);
          UserEdit.verifyUserRoleIsPlainTextInEditForm(testData.roleBName);
          UserEdit.verifyUserRoleIsPlainTextInEditForm(testData.roleCName);

          // Step 9: "Select user roles" modal shows Member-tenant roles as plain text, not
          // clickable, while the accordion is only previewing Member (active affiliation still
          // Central)
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.verifyAllRolesLinkStatusInModal({ isLink: false });
          UserEdit.searchRoleInModal(testData.roleBName);
          UserEdit.verifyRoleInModal(testData.roleBName, { isChecked: true });
          UserEdit.searchRoleInModal(testData.roleFName);
          UserEdit.verifyRoleInModal(testData.roleFName, { isChecked: false });

          // Step 10: close modal and edit form without saving, switch active affiliation to
          // Member, reopen Test User's page - accordion now defaults to Member (the new active
          // affiliation), Role B and shared Role C shown as hyperlinks
          UserEdit.closeRolesModalWithoutSaving();
          UserEdit.cancelEdit();
          UsersCard.verifyUserCardOpened();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          Users.waitLoading();
          UsersSearchPane.searchByKeywords(testData.testUser.username);
          UsersSearchPane.clickOnUserRowContaining(testData.testUser.username);
          UsersCard.verifyUserCardOpened();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          UsersCard.clickUserRolesAccordion();
          UsersCard.checkSelectedRolesAffiliation(tenantNames.college);
          UsersCard.verifyUserRoleIsLink(testData.roleBName);
          UsersCard.verifyUserRoleIsLink(testData.roleCName);

          // Step 11: Role C's link opens to Role C's own detail pane
          UsersCard.clickUserRoleLink(testData.roleCName);
          AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleCName);

          // Step 12: back on Test User's page, selecting Central tenant in the accordion's own
          // Affiliation dropdown (view-only preview, active affiliation stays Member) shows
          // Role A and shared Role C as plain text
          AuthorizationRoles.goBackWithWait();
          UsersCard.verifyUserCardOpened();
          UsersCard.ensureUserRolesAccordionExpanded();
          UsersCard.selectRolesAffiliation(tenantNames.central);
          UsersCard.verifyUserRoleIsPlainText(testData.roleAName);
          UsersCard.verifyUserRoleIsPlainText(testData.roleCName);

          // Step 13: Actions > Edit - accordion's Affiliation dropdown resets to Member (the
          // real active affiliation), Role B and shared Role C shown as hyperlinks
          UserEdit.openEdit();
          UserEdit.clickUserRolesAccordion();
          UserEdit.checkSelectedRolesAffiliation(tenantNames.college);
          UserEdit.verifyUserRoleIsLinkInEditForm(testData.roleBName);
          UserEdit.verifyUserRoleIsLinkInEditForm(testData.roleCName);

          // Step 14: Role B's link opens to Role B's own detail pane
          UserEdit.clickUserRoleLinkInEditForm(testData.roleBName);
          AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleBName);

          // Step 15: back on the edit form, "Select user roles" modal - assigned (Role B) and
          // unassigned (Role F) roles both display as hyperlinks
          AuthorizationRoles.goBackWithWait();
          UserEdit.waitLoading();
          UserEdit.ensureUserRolesAccordionExpanded();
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.verifyAllRolesLinkStatusInModal({ isLink: true });
          UserEdit.searchRoleInModal(testData.roleBName);
          UserEdit.verifyRoleInModal(testData.roleBName, { isChecked: true });
          UserEdit.searchRoleInModal(testData.roleFName);
          UserEdit.verifyRoleInModal(testData.roleFName, { isChecked: false });

          // Step 16: clicking an unassigned role's (Role F) link opens its own detail pane; the
          // target="_blank" check inside clickRoleLinkInModal proves the modal/checkbox state is
          // left untouched by the click
          UserEdit.clickRoleLinkInModal(testData.roleFName);
          AuthorizationRoles.verifyRoleDetailPaneOpened(testData.roleFName);

          // Step 17: back on the edit form (the modal closes itself on the back-navigation),
          // selecting Central tenant in the accordion's own Affiliation dropdown shows Role A and
          // shared Role C as plain text
          AuthorizationRoles.goBackWithWait();
          UserEdit.waitLoading();
          UserEdit.ensureUserRolesAccordionExpanded();
          UserEdit.selectRolesAffiliation(tenantNames.central);
          UserEdit.verifyUserRoleIsPlainTextInEditForm(testData.roleAName);
          UserEdit.verifyUserRoleIsPlainTextInEditForm(testData.roleCName);

          // Step 18: "Select user roles" modal shows Central-tenant roles as plain text, not
          // clickable, while the accordion is only previewing Central (active affiliation still
          // Member)
          UserEdit.clickAddUserRolesButton();
          UserEdit.verifySelectRolesModal();
          UserEdit.verifyAllRolesLinkStatusInModal({ isLink: false });
          UserEdit.searchRoleInModal(testData.roleAName);
          UserEdit.verifyRoleInModal(testData.roleAName, { isChecked: true });
          UserEdit.searchRoleInModal(testData.roleEName);
          UserEdit.verifyRoleInModal(testData.roleEName, { isChecked: false });
        },
      );
    });
  });
});
