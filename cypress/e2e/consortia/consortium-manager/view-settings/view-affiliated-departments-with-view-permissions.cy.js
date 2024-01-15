import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Departments from '../../../../support/fragments/settings/users/departments';
import ConsortiumManagerApp, { settingsItems, usersItems } from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import DepartmentsConsortiumManager from '../../../../support/fragments/consortium-manager/departmentsConsortiumManager';

const testData = {
  centralSharedDepartment: {
    payload: {
      code: getTestEntityValue('centralSharedDepartment_name'),
      name: getTestEntityValue('centralSharedDepartment_name'),
    }
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
  }
};
const testUsers = [];

describe('Consortium manager', () => {
  describe('View settings', () => {
    describe('View Departments', () => {
      before('create test data', () => {
        cy.getAdminToken();
        DepartmentsConsortiumManager.createViaApi(testData.centralSharedDepartment)
          .then((newDepartment) => {
            testData.centralSharedDepartment = newDepartment;
          });
        Departments.createViaApi(testData.centralLocalDepartment);

        cy.createTempUser([
          permissions.consortiaSettingsConsortiumManagerView.gui,
          permissions.createEditViewDepartments.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          for (let i = 0; i < 6; i++) {
            cy.resetTenant();
            if (i === 3 || i === 4) {
              cy.setTenant(Affiliations.College);
            } else if (i === 5) {
              cy.setTenant(Affiliations.University);
            }
            cy.createTempUser([]).then((usrProperties) => {
              testUsers.push(usrProperties);
            });
          }
        }).then(() => {
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            permissions.createEditViewDepartments.gui,
          ]);
          Departments.createViaApi(testData.collegeLocalDepartment);

          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            permissions.departmentsAll.gui,
          ]);
          Departments.createViaApi(testData.universityLocalDepartment);
          cy.resetTenant();
          [
            testUsers[0],
            testUsers[1],
            testUsers[2],
          ].forEach((element) => {
            cy.getUsers({ limit: 1, query: `"username"="${element.username}"` }).then((users) => {
              cy.updateUser({
                ...users[0],
                departments: [testData.centralSharedDepartment.id, testData.centralLocalDepartment.id],
              });
            });
          });
          cy.setTenant(Affiliations.College);
          [
            testUsers[3],
            testUsers[4],
          ]
            .forEach((element) => {
              cy.getUsers({ limit: 1, query: `"username"=$"${element.username}"` }).then((result) => {
                cy.updateUser({
                  ...result[0],
                  departments: [testData.centralSharedDepartment.id, testData.collegeLocalDepartment.id]
                });
              });
            });
          cy.setTenant(Affiliations.University);
          cy.getUsers({ limit: 1, query: `"username"="${testUsers[5].username}"` }).then((result) => {
            cy.updateUser({
              ...result[0],
              departments: [testData.centralSharedDepartment.id],
            });
          });

          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading
          });
        });
      });

      after('delete test data', () => {
        cy.setTenant(Affiliations.University);
        cy.getUniversityAdminToken();
        Users.deleteViaApi(testUsers[5].userId);
        Departments.deleteViaApi(testData.universityLocalDepartment.id);

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
      });

      it(
        'C404390 User with "Consortium manager: Can view existing settings" permission is able to view the list of departments of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPath', 'thunderjet'] },
        () => {
          ConsortiumManagerApp.selectAllMembers();
          ConsortiumManagerApp.verifyPageAfterSelectingMembers(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          ConsortiumManagerApp.chooseUsersItem(usersItems.departments);
          DepartmentsConsortiumManager.verifyDepartmentInTheList(testData.centralSharedDepartment.payload.name, testData.centralSharedDepartment.payload.code, '6', 'All');
          DepartmentsConsortiumManager.verifyDepartmentInTheList(testData.centralLocalDepartment.name, testData.centralLocalDepartment.code, '3', 'Central Office', 'edit');

          DepartmentsConsortiumManager.verifyDepartmentInTheList(testData.collegeLocalDepartment.name, testData.collegeLocalDepartment.code, '2', 'College', 'edit');
          DepartmentsConsortiumManager.verifyDepartmentInTheList(testData.universityLocalDepartment.name, testData.universityLocalDepartment.code, 'No value set-', 'University', 'edit', 'trash');

          ConsortiumManagerApp.clickSelectMembers();
          ConsortiumManagerApp.verifySelectMembersModal(3);
          ConsortiumManagerApp.selectMembers(tenantNames.central);
          DepartmentsConsortiumManager.verifyDepartmentInTheList(testData.centralSharedDepartment.payload.name, testData.centralSharedDepartment.payload.code, '3', 'All');
          DepartmentsConsortiumManager.verifyNoDepartmentInTheList(testData.centralLocalDepartment.name);

          DepartmentsConsortiumManager.verifyDepartmentInTheList(testData.collegeLocalDepartment.name, testData.collegeLocalDepartment.code, '2', 'College', 'edit');
          DepartmentsConsortiumManager.verifyDepartmentInTheList(testData.universityLocalDepartment.name, testData.universityLocalDepartment.code, 'No value set-', 'University', 'edit', 'trash');
        }
      );
    });
  });
});
