import Users from '../../../../support/fragments/users/users';
import UsersCard from '../../../../support/fragments/users/usersCard';
import UserEdit from '../../../../support/fragments/users/userEdit';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Users', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();

      const userData1 = {
        username: `at_c1347147_user1_${randomPostfix}`,
        personal: {
          lastName: `AT_C1347147_LN1_${randomPostfix}`,
          firstName: `AT_C1347147_FN1_${randomPostfix}`,
          middleName: `AT_C1347147_MN1_${randomPostfix}`,
          preferredFirstName: '',
          email: 'at_c1347147@test.com',
        },
        userType: 'Staff',
      };

      const userData2 = {
        username: `at_c1347147_user2_${randomPostfix}`,
        personal: {
          lastName: `AT_C1347147_LN2_${randomPostfix}`,
          firstName: `AT_C1347147_FN2_${randomPostfix}`,
          middleName: `AT_C1347147_MN2_${randomPostfix}`,
          preferredFirstName: '',
          email: 'at_c1347147@test.com',
        },
        userType: 'Staff',
      };

      const capabSetsToAssignCentral = [
        CapabilitySets.uiConsortiaSettingsConsortiaAffiliationsView,
        CapabilitySets.uiUsersCreate,
      ];

      const capabSetsToAssignMember = [CapabilitySets.uiUsersCreate];

      const testUser = {};
      let userGroup;

      before('Create test user', () => {
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        cy.createUserGroupApi().then((group) => {
          userGroup = group;
          const groupLabel = `${group.group} (${group.desc})`;
          userData1.patronGroup = groupLabel;
          userData2.patronGroup = groupLabel;
        });
        cy.createTempUser([]).then((props) => {
          Object.assign(testUser, props);
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMember);
        });
        cy.then(() => {
          cy.resetTenant();
          cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignCentral);
        });
      });

      before('Login', () => {
        cy.setTenant(Affiliations.College);
        cy.login(testUser.username, testUser.password, {
          path: TopMenu.usersPath,
          waiter: Users.waitLoading,
        });
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
      });

      after('Delete users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testUser.userId);
        cy.getUsers({ limit: 1, query: `username=="${userData2.username}"` }).then(
          (usersResult) => {
            if (usersResult && usersResult.length > 0) {
              Users.deleteViaApi(usersResult[0].id);
            }
          },
        );
        cy.deleteUserGroupApi(userGroup.id, true);
      });

      it(
        'C1347147 ECS | Create a "Staff" user in Member tenant, confirming user creation in Keycloak (thunderjet)',
        { tags: ['criticalPathECS', 'eureka', 'thunderjet', 'C1347147'] },
        () => {
          // Steps 1-2: Actions > New, fill in user form
          Users.clickNewButton();
          Users.checkCreateUserPaneOpened();
          UserEdit.fillRequiredFields(
            userData1.personal.lastName,
            userData1.patronGroup,
            userData1.personal.email,
            userData1.userType,
            userData1.username,
          );
          UserEdit.saveAndCloseStayOnEdit();
          // Step 3: Save & close triggers Keycloak modal
          UserEdit.checkPromoteUserModal(userData1.personal.lastName);
          // Step 4: Cancel → Create User page remains open
          UserEdit.clickCancelInPromoteUserModal();
          // Step 5: Cancel form → form closed, user not created
          Users.cancel();
          Users.waitLoading();
          cy.getToken(testUser.username, testUser.password);
          cy.getUsers({ limit: 1, query: `username=="${userData1.username}"` }).then(
            (usersResult) => {
              expect(usersResult).to.have.length(0);

              // Steps 6-7: Actions > New, fill in different user data
              Users.clickNewButton();
              Users.checkCreateUserPaneOpened();
              UserEdit.fillRequiredFields(
                userData2.personal.lastName,
                userData2.patronGroup,
                userData2.personal.email,
                userData2.userType,
                userData2.username,
              );
              UserEdit.saveAndCloseStayOnEdit();
              // Step 8: Save & close triggers Keycloak modal
              UserEdit.checkPromoteUserModal(userData2.personal.lastName);
              // Step 9: Confirm → user created with 2 affiliations
              UserEdit.clickConfirmInPromoteUserModal();
              UsersCard.waitLoading();
              UsersCard.verifyUserLastFirstNameInCard(userData2.personal.lastName);
              UsersCard.verifyAffiliationsQuantity('2');
              UsersCard.expandAffiliationsAccordion();
              UsersCard.verifyAffiliationsDetails(
                tenantNames.college,
                2,
                tenantNames.college,
                tenantNames.central,
              );
            },
          );
        },
      );
    });
  });
});
