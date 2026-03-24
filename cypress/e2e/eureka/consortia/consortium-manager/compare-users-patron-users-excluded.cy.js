import Users from '../../../../support/fragments/users/users';
import ConsortiumManagerApp from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import { APPLICATION_NAMES, USER_TYPES } from '../../../../support/constants';
import AuthorizationRoles, {
  SETTINGS_SUBSECTION_AUTH_ROLES,
} from '../../../../support/fragments/settings/authorization-roles/authorizationRoles';
import CompareRoles from '../../../../support/fragments/consortium-manager/authorization-roles/compareRoles';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('Eureka', () => {
  describe('Consortium manager (Eureka)', () => {
    const includedUserTypes = [
      USER_TYPES.STAFF.toLowerCase(),
      USER_TYPES.SYSTEM.toLowerCase(),
      USER_TYPES.SHADOW.toLowerCase(),
    ];
    const capabSetsToAssignCentral = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.uiAuthorizationRolesUsersSettingsView,
      CapabilitySets.uiConsortiaSettingsConsortiumManagerView,
    ];
    const capabSetsToAssignMembers = [
      CapabilitySets.uiAuthorizationRolesSettingsAdmin,
      CapabilitySets.uiAuthorizationRolesUsersSettingsView,
    ];
    let testUser;
    let userCentralStaff;
    let userCentralPatron;
    let userCollegeStaff;
    let userCollegePatron;
    let userUniversityStaff;
    let userUniversityPatron;

    before('Create user, data', () => {
      cy.then(() => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.createTempUser([])
          .then((userProperties) => {
            testUser = userProperties;
            cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignCentral);
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.College, testUser.userId);
            cy.assignAffiliationToUser(Affiliations.University, testUser.userId);

            cy.setTenant(Affiliations.College);
            cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMembers);
            cy.setTenant(Affiliations.University);
            cy.assignCapabilitiesToExistingUser(testUser.userId, [], capabSetsToAssignMembers);
          });
      })
        .then(() => {
          cy.resetTenant();
          cy.createTempUser([]).then((userProperties) => {
            userCentralStaff = userProperties;
          });
          cy.createTempUser([], undefined, USER_TYPES.PATRON.toLowerCase()).then(
            (userProperties) => {
              userCentralPatron = userProperties;
            },
          );
        })
        .then(() => {
          cy.setTenant(Affiliations.College);
          cy.createTempUser([]).then((userProperties) => {
            userCollegeStaff = userProperties;
          });
          cy.createTempUser([], undefined, USER_TYPES.PATRON.toLowerCase()).then(
            (userProperties) => {
              userCollegePatron = userProperties;
            },
          );
        })
        .then(() => {
          cy.setTenant(Affiliations.University);
          cy.createTempUser([]).then((userProperties) => {
            userUniversityStaff = userProperties;
          });
          cy.createTempUser([], undefined, USER_TYPES.PATRON.toLowerCase()).then(
            (userProperties) => {
              userUniversityPatron = userProperties;
            },
          );
        })
        .then(() => {
          cy.resetTenant();
          cy.login(testUser.username, testUser.password);
        });
    });

    after('Delete user, data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testUser.userId);
      Users.deleteViaApi(userCentralStaff.userId);
      Users.deleteViaApi(userCentralPatron.userId);

      cy.setTenant(Affiliations.College);
      Users.deleteViaApi(userCollegeStaff.userId);
      Users.deleteViaApi(userCollegePatron.userId);

      cy.setTenant(Affiliations.University);
      Users.deleteViaApi(userUniversityStaff.userId);
      Users.deleteViaApi(userUniversityPatron.userId);
    });

    it(
      'C1009047 ECS | Patron users are excluded when comparing the authorization roles (consortia) (thunderjet)',
      { tags: ['extendedPathECS', 'thunderjet', 'eureka', 'C1009047'] },
      () => {
        cy.then(() => {
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
          ConsortiumManagerApp.waitLoading();
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyMembersSelected(3);

          ConsortiumManagerApp.openListInSettings(SETTINGS_SUBSECTION_AUTH_ROLES);
          SelectMembers.selectMember(tenantNames.central);
          AuthorizationRoles.waitContentLoading();
          CompareRoles.clickCompareUsers();
        })
          .then(() => {
            cy.intercept('GET', '/users?limit=4000*').as('getUsersRequest1');
            CompareRoles.selectMember(tenantNames.central, 0);
            cy.wait('@getUsersRequest1').then(({ response }) => {
              const userTypes = response.body.users.map((user) => user.type);
              expect(
                userTypes.every((type) => includedUserTypes.includes(type)),
                'Only allowed user types are present in response',
              ).to.eq(true);

              CompareRoles.checkUserPresent(userCentralStaff.username);
              CompareRoles.checkUserPresent(userCentralPatron.username, false);
            });
          })
          .then(() => {
            cy.intercept('GET', '/users?limit=4000*').as('getUsersRequest2');
            CompareRoles.selectMember(tenantNames.college, 0);
            cy.wait('@getUsersRequest2').then(({ response }) => {
              const userTypes = response.body.users.map((user) => user.type);
              expect(
                userTypes.every((type) => includedUserTypes.includes(type)),
                'Only allowed user types are present in response',
              ).to.eq(true);

              CompareRoles.checkUserPresent(userCollegeStaff.username);
              CompareRoles.checkUserPresent(userCollegePatron.username, false);
            });
          })
          .then(() => {
            cy.intercept('GET', '/users?limit=4000*').as('getUsersRequest3');
            CompareRoles.selectMember(tenantNames.university, 0);
            cy.wait('@getUsersRequest3').then(({ response }) => {
              const userTypes = response.body.users.map((user) => user.type);
              expect(
                userTypes.every((type) => includedUserTypes.includes(type)),
                'Only allowed user types are present in response',
              ).to.eq(true);

              CompareRoles.checkUserPresent(userUniversityStaff.username);
              CompareRoles.checkUserPresent(userUniversityPatron.username, false);
            });
          });
      },
    );
  });
});
