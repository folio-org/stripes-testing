import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Departments from '../../../../support/fragments/settings/users/departments';
import ConsortiumManagerApp, {
  settingsItems,
  usersItems,
} from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import DepartmentsConsortiumManager from '../../../../support/fragments/consortium-manager/departmentsConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';

const testData = {
  centralSharedDepartment: {
    payload: {
      code: getTestEntityValue('centralSharedDepartment_name'),
      name: getTestEntityValue('centralSharedDepartment_name'),
    },
  },
  centralLocalDepartment: {
    code: getTestEntityValue('centralLocalDepartment_code'),
    id: uuid(),
    name: getTestEntityValue('centralLocalDepartment_name'),
  },
  collegeLocalDepartment: {
    code: getTestEntityValue('collegeLocalDepartment_code'),
    id: uuid(),
    name: getTestEntityValue('collegeLocalDepartment_name'),
  },
  universityLocalDepartment: {
    code: getTestEntityValue('universityLocalDepartment_code'),
    id: uuid(),
    name: getTestEntityValue('universityLocalDepartment_name'),
  },
};
const testUsers = [];

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Departments', () => {
      before('create test data', () => {
        cy.getAdminToken();
        DepartmentsConsortiumManager.createViaApi(testData.centralSharedDepartment).then(
          (newDepartment) => {
            testData.centralSharedDepartment = newDepartment;
          },
        );
        Departments.createViaApi(testData.centralLocalDepartment);
        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.createEditViewDepartments.gui,
        ])
          .then((userProperties) => {
            // User for test C404390
            testData.user390 = userProperties;

            for (let i = 0; i < 6; i++) {
              cy.resetTenant();
              if (i === 3 || i === 4) {
                cy.setTenant(Affiliations.College);
              } else if (i === 5) {
                cy.setTenant(Affiliations.University);
              }
              cy.createTempUser([]).then((testUserProperties) => {
                testUsers.push(testUserProperties);
              });
            }
          })
          .then(() => {
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.College, testData.user390.userId);
            cy.setTenant(Affiliations.College);
            // cy.getAdminToken();
            cy.assignPermissionsToExistingUser(testData.user390.userId, [
              permissions.createEditViewDepartments.gui,
            ]);
            cy.createTempUser([
              permissions.departmentsAll.gui,
            ]).then((userProperties) => {
              // User for test C404400
              testData.user400 = userProperties;
            }).then(() => {
              cy.createTempUser([
                permissions.departmentsAll.gui,
              ]).then((userProperties) => {
                // User for test C407747
                testData.user747 = userProperties;
              }).then(() => {

                Departments.createViaApi(testData.collegeLocalDepartment);

                cy.resetTenant();
                cy.getAdminToken();
                cy.assignPermissionsToExistingUser(testData.user400.userId, [
                  permissions.consortiaSettingsConsortiumManagerEdit.gui,
                  permissions.createEditViewDepartments.gui,
                ]);
                cy.assignPermissionsToExistingUser(testData.user747.userId, [
                  permissions.consortiaSettingsConsortiumManagerShare.gui,
                  permissions.departmentsAll.gui,
                ]);

                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, testData.user390.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user400.userId);
                cy.assignAffiliationToUser(Affiliations.University, testData.user747.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(testData.user390.userId, [
                  permissions.departmentsAll.gui,
                ]);
                cy.assignPermissionsToExistingUser(testData.user400.userId, [
                  permissions.createEditViewDepartments.gui,
                ]);
                cy.assignPermissionsToExistingUser(testData.user747.userId, [
                  permissions.createEditViewDepartments.gui,
                ]);
                Departments.createViaApi(testData.universityLocalDepartment);
                cy.resetTenant();
                [testUsers[0], testUsers[1], testUsers[2]].forEach((element) => {
                  cy.getUsers({ limit: 1, query: `"username"="${element.username}"` }).then((users) => {
                    cy.updateUser({
                      ...users[0],
                      departments: [
                        testData.centralSharedDepartment.id,
                        testData.centralLocalDepartment.id,
                      ],
                    });
                  });
                });
                cy.setTenant(Affiliations.College);
                [testUsers[3], testUsers[4]].forEach((element) => {
                  cy.getUsers({ limit: 1, query: `"username"=$"${element.username}"` }).then(
                    (result) => {
                      cy.updateUser({
                        ...result[0],
                        departments: [
                          testData.centralSharedDepartment.id,
                          testData.collegeLocalDepartment.id,
                        ],
                      });
                    },
                  );
                });
                cy.setTenant(Affiliations.University);
                cy.getUsers({ limit: 1, query: `"username"="${testUsers[5].username}"` }).then(
                  (result) => {
                    cy.updateUser({
                      ...result[0],
                      departments: [testData.centralSharedDepartment.id],
                    });
                  },
                );
              });
            });
          });
      });

      after('delete test data', () => {
        cy.setTenant(Affiliations.University);
        cy.getUniversityAdminToken();
        Users.deleteViaApi(testUsers[5].userId);
        Departments.deleteViaApi(testData.universityLocalDepartment.id);

        cy.resetTenant();
        cy.getAdminToken();

        cy.setTenant(Affiliations.College);
        cy.getCollegeAdminToken();
        Users.deleteViaApi(testUsers[3].userId);
        Users.deleteViaApi(testUsers[4].userId);
        Departments.deleteViaApi(testData.collegeLocalDepartment.id);

        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        Users.deleteViaApi(testUsers[0].userId);
        Users.deleteViaApi(testUsers[1].userId);
        Users.deleteViaApi(testUsers[2].userId);
        Departments.deleteViaApi(testData.centralLocalDepartment.id);
        DepartmentsConsortiumManager.deleteViaApi(testData.centralSharedDepartment);

        Users.deleteViaApi(testData.user390.userId);
        Users.deleteViaApi(testData.user400.userId);
        Users.deleteViaApi(testData.user747.userId);
      });

      it(
        'C404390 User with "Consortium manager: Can view existing settings" permission is able to view the list of departments of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPath', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user390.username, testData.user390.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });
          ConsortiumManagerApp.selectAllMembers();
          ConsortiumManagerApp.verifyPageAfterSelectingMembers(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          ConsortiumManagerApp.chooseUsersItem(usersItems.departments);
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            '6',
            'All',
          );
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralLocalDepartment.name,
            testData.centralLocalDepartment.code,
            '3',
            'Central Office',
            'edit',
          );

          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.collegeLocalDepartment.name,
            testData.collegeLocalDepartment.code,
            '2',
            'College',
            'edit',
          );
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.universityLocalDepartment.name,
            testData.universityLocalDepartment.code,
            'No value set-',
            'University',
            'edit',
            'trash',
          );

          ConsortiumManagerApp.clickSelectMembers();
          ConsortiumManagerApp.verifySelectMembersModal(3, 3, true);
          ConsortiumManagerApp.selectMembers(tenantNames.central);
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            '3',
            'All',
          );
          DepartmentsConsortiumManager.verifyNoDepartmentInTheList(
            testData.centralLocalDepartment.name,
          );

          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.collegeLocalDepartment.name,
            testData.collegeLocalDepartment.code,
            '2',
            'College',
            'edit',
          );
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.universityLocalDepartment.name,
            testData.universityLocalDepartment.code,
            'No value set-',
            'University',
            'edit',
            'trash',
          );
        },
      );

      it(
        'C404400 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of departments of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPath', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user400.username, testData.user400.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          ConsortiumManagerApp.selectAllMembers();
          ConsortiumManagerApp.verifyPageAfterSelectingMembers(3);
          ConsortiumManagerApp.clickSelectMembers();
          ConsortiumManagerApp.verifySelectMembersModal(3, 3, true);
          ConsortiumManagerApp.selectMembers(tenantNames.university);
          ConsortiumManagerApp.verifyPageAfterSelectingMembers(2);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          ConsortiumManagerApp.chooseUsersItem(usersItems.departments);
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            '5',
            'All',
          );
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralLocalDepartment.name,
            testData.centralLocalDepartment.code,
            '3',
            'Central Office',
            'edit',
          );

          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.collegeLocalDepartment.name,
            testData.collegeLocalDepartment.code,
            '2',
            'College',
            'edit',
          );
          DepartmentsConsortiumManager.verifyNoDepartmentInTheList(
            testData.universityLocalDepartment.name,
          );

          ConsortiumManagerApp.clickSelectMembers();
          ConsortiumManagerApp.verifySelectMembersModal(3, 2);
          ConsortiumManagerApp.selectMembers(tenantNames.college);
          ConsortiumManagerApp.verifyPageAfterSelectingMembers(1);
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            '3',
            'All',
          );
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralLocalDepartment.name,
            testData.centralLocalDepartment.code,
            '3',
            'Central Office',
            'edit',
          );

          DepartmentsConsortiumManager.verifyNoDepartmentInTheList(
            testData.collegeLocalDepartment.name,
          );
          DepartmentsConsortiumManager.verifyNoDepartmentInTheList(
            testData.universityLocalDepartment.name,
          );
        },
      );

      it(
        'C407747 User with "Consortium manager: Can share settings to all members" permission is able to view the list of departments of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPath', 'thunderjet'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user747.username, testData.user747.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          ConsortiumManagerApp.selectAllMembers();
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          ConsortiumManagerApp.chooseUsersItem(usersItems.departments);

          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            '6',
            'All',
            'edit'
          );
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralLocalDepartment.name,
            testData.centralLocalDepartment.code,
            '3',
            'Central Office',
            'edit',
          );

          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.collegeLocalDepartment.name,
            testData.collegeLocalDepartment.code,
            '2',
            'College',
            'edit',
          );
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.universityLocalDepartment.name,
            testData.universityLocalDepartment.code,
            'No value set-',
            'University',
            'edit',
          );

          ConsortiumManagerApp.clickSelectMembers();
          ConsortiumManagerApp.verifySelectMembersModal(3, 3, true);
          ConsortiumManagerApp.selectMembers(tenantNames.college, tenantNames.university);

          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            '3',
            'All',
            'edit'
          );
          DepartmentsConsortiumManager.verifyDepartmentInTheList(
            testData.centralLocalDepartment.name,
            testData.centralLocalDepartment.code,
            '3',
            'Central Office',
            'edit',
          );

          DepartmentsConsortiumManager.verifyNoDepartmentInTheList(
            testData.collegeLocalDepartment.name,
          );
          DepartmentsConsortiumManager.verifyNoDepartmentInTheList(
            testData.universityLocalDepartment.name,
          );
        },
      );
    });
  });
});
