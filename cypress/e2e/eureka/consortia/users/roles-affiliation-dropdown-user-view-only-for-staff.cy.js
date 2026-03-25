import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UsersSearchPane from '../../../../support/fragments/users/usersSearchPane';
import TopMenu from '../../../../support/fragments/topMenu';
import { USER_TYPES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';
import UserEdit from '../../../../support/fragments/users/userEdit';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const testData = {};
      const capabSetsToAssignCentral = [
        CapabilitySets.uiUsersRolesManage,
        CapabilitySets.uiUsersEdit,
        CapabilitySets.uiConsortiaSettingsConsortiaAffiliationsView,
      ];
      const capabSetsToAssignCollege = [
        CapabilitySets.uiUsersRolesManage,
        CapabilitySets.uiUsersEdit,
      ];
      const waitForCardToStabilize = () => cy.wait(1500);

      before('Create users', () => {
        cy.getAdminToken();
        cy.createTempUser([]).then((testUserProperties) => {
          testData.testUser = testUserProperties;
          cy.createTempUser([]).then((userCentralProperties) => {
            testData.userCentral = userCentralProperties;
            cy.assignAffiliationToUser(Affiliations.College, testData.testUser.userId);
            cy.assignAffiliationToUser(Affiliations.College, testData.userCentral.userId);
            cy.assignCapabilitiesToExistingUser(
              testData.testUser.userId,
              [],
              capabSetsToAssignCentral,
            );
            cy.setTenant(Affiliations.College);
            cy.createTempUser([]).then((userCollegeProperties) => {
              testData.userCollege = userCollegeProperties;
              cy.assignCapabilitiesToExistingUser(
                testData.testUser.userId,
                [],
                capabSetsToAssignCollege,
              );
            });
          });
        });
      });

      before('Login', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.login(testData.testUser.username, testData.testUser.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
      });

      after('Delete users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.testUser.userId);
        Users.deleteViaApi(testData.userCentral.userId);
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testData.userCollege.userId);
      });

      it(
        'C1051455 ECS | "User roles" display Affiliation dropdown only for Staff users (volaris)',
        { tags: ['extendedPathECS', 'eureka', 'volaris', 'C1051455'] },
        () => {
          function checkRoleAffiliations(
            mainTenant,
            allAffiliatedTenants,
            affiliatedTenantsAfterUpdate,
          ) {
            UsersCard.verifyUserRolesCounter('0');
            waitForCardToStabilize();
            UsersCard.clickUserRolesAccordion();
            UsersCard.checkSelectedRolesAffiliation(mainTenant);
            UsersCard.verifyRolesAffiliationOptions(allAffiliatedTenants);

            UserEdit.openEdit();
            UserEdit.verifyUserRolesCounter('0');
            UserEdit.clickUserRolesAccordion();
            UserEdit.checkSelectedRolesAffiliation(mainTenant);

            UserEdit.changeUserType(USER_TYPES.PATRON);
            UserEdit.verifyUserTypeChangeModal();
            UserEdit.cancelUserTypeChange();
            UserEdit.verifyUserTypeFieldValue(USER_TYPES.STAFF.toLocaleLowerCase());
            UserEdit.verifyUsernameRequired();

            UserEdit.changeUserType(USER_TYPES.PATRON);
            UserEdit.confirmUserTypeChange();
            UserEdit.verifyUserTypeFieldValue(USER_TYPES.PATRON.toLocaleLowerCase());
            UserEdit.verifyUsernameRequired(false);

            UserEdit.saveAndClose();
            UsersCard.waitLoading();
            UsersCard.verifyUserType(USER_TYPES.PATRON);

            UsersCard.verifyUserRolesCounter('0');
            waitForCardToStabilize();
            UsersCard.clickUserRolesAccordion();
            UsersCard.verifyUserRolesAccordionEmpty();
            UsersCard.checkRolesAffiliationDropdownShown(false);

            UserEdit.openEdit();
            UserEdit.verifyUserRolesCounter('0');
            UserEdit.clickUserRolesAccordion();
            UserEdit.verifyUserRolesAccordionEmpty();
            UserEdit.checkRolesAffiliationDropdownShown(false);

            UserEdit.changeUserType(USER_TYPES.STAFF);
            UserEdit.verifyUserTypeFieldValue(USER_TYPES.STAFF.toLocaleLowerCase());
            UserEdit.verifyUsernameRequired();

            UserEdit.saveAndClose();
            UsersCard.waitLoading();
            UsersCard.verifyUserType(USER_TYPES.STAFF);

            UsersCard.verifyUserRolesCounter('0');
            waitForCardToStabilize();
            UsersCard.clickUserRolesAccordion();
            UsersCard.verifyUserRolesAccordionEmpty();
            UsersCard.checkSelectedRolesAffiliation(mainTenant);
            UsersCard.verifyRolesAffiliationOptions(affiliatedTenantsAfterUpdate);

            UserEdit.openEdit();
            UserEdit.verifyUserRolesCounter('0');
            UserEdit.clickUserRolesAccordion();
            UserEdit.verifyUserRolesAccordionEmpty();
            UserEdit.checkSelectedRolesAffiliation(mainTenant);
          }

          UsersSearchPane.searchByUsername(testData.userCentral.username);
          UsersSearchPane.selectUserFromList(testData.userCentral.username);

          checkRoleAffiliations(
            tenantNames.central,
            [tenantNames.central, tenantNames.college],
            [tenantNames.central],
          );

          UserEdit.cancelEdit();
          UsersCard.waitLoading();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          Users.waitLoading();

          UsersSearchPane.searchByUsername(testData.userCollege.username);
          UsersSearchPane.selectUserFromList(testData.userCollege.username);

          checkRoleAffiliations(
            tenantNames.college,
            [tenantNames.central, tenantNames.college],
            [tenantNames.central, tenantNames.college],
          );
        },
      );
    });
  });
});
