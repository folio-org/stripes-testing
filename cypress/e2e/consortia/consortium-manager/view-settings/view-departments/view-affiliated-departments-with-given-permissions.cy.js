import uuid from 'uuid';
import moment from 'moment';
import permissions from '../../../../../support/dictionary/permissions';
import Users from '../../../../../support/fragments/users/users';
import TopMenu from '../../../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Departments from '../../../../../support/fragments/settings/users/departments';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import DepartmentsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiaControlledVocabularyPaneset from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';

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
            cy.assignPermissionsToExistingUser(testData.user390.userId, [
              permissions.createEditViewDepartments.gui,
            ]);
            cy.createTempUser([permissions.departmentsAll.gui])
              .then((userProperties) => {
                // User for test C404400
                testData.user400 = userProperties;
              })
              .then(() => {
                cy.createTempUser([permissions.departmentsAll.gui])
                  .then((userProperties) => {
                    // User for test C407747
                    testData.user747 = userProperties;
                  })
                  .then(() => {
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
                      cy.getUsers({ limit: 1, query: `"username"="${element.username}"` }).then(
                        (users) => {
                          cy.updateUser({
                            ...users[0],
                            departments: [
                              testData.centralSharedDepartment.id,
                              testData.centralLocalDepartment.id,
                            ],
                          });
                        },
                      );
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
        cy.resetTenant();
        cy.getAdminToken();
        cy.setTenant(Affiliations.University);
        Users.deleteViaApi(testUsers[5].userId);
        Departments.deleteViaApi(testData.universityLocalDepartment.id);

        cy.setTenant(Affiliations.College);
        Users.deleteViaApi(testUsers[3].userId);
        Users.deleteViaApi(testUsers[4].userId);
        Departments.deleteViaApi(testData.collegeLocalDepartment.id);

        cy.resetTenant();
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
        { tags: ['criticalPathECS', 'thunderjet', 'C404390'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user390.username, testData.user390.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });
          cy.wait(4000);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          DepartmentsConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            `${moment().format('l')} by`,
            '6',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalDepartment.name,
              testData.centralLocalDepartment.code,
              `${moment().format('l')} by`,
              '3',
              tenantNames.central,
            ],
            [],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.collegeLocalDepartment.name,
            testData.collegeLocalDepartment.code,
            `${moment().format('l')} by`,
            '2',
            tenantNames.college,
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalDepartment.name,
              testData.universityLocalDepartment.code,
              `${moment().format('l')} by`,
              '-',
              tenantNames.university,
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
          SelectMembers.selectMembers(tenantNames.central);
          SelectMembers.saveAndClose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            `${moment().format('l')} by`,
            '3',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.centralLocalDepartment.name,
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalDepartment.name,
              testData.collegeLocalDepartment.code,
              `${moment().format('l')} by`,
              '2',
              tenantNames.college,
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalDepartment.name,
              testData.universityLocalDepartment.code,
              `${moment().format('l')} by`,
              '-',
              tenantNames.university,
            ],
            [],
          );
        },
      );

      it(
        'C404400 User with "Consortium manager: Can create, edit and remove settings" permission is able to view the list of departments of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C404400'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user400.username, testData.user400.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          DepartmentsConsortiumManager.choose();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            `${moment().format('l')} by`,
            '5',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalDepartment.name,
              testData.centralLocalDepartment.code,
              `${moment().format('l')} by`,
              '3',
              tenantNames.central,
            ],
            ['edit'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalDepartment.name,
              testData.collegeLocalDepartment.code,
              `${moment().format('l')} by`,
              '2',
              tenantNames.college,
            ],
            ['edit'],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalDepartment.name,
          );

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 2);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.verifyMembersSelected(1);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList([
            testData.centralSharedDepartment.payload.name,
            testData.centralSharedDepartment.payload.code,
            `${moment().format('l')} by`,
            '3',
            'All',
          ]);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalDepartment.name,
              testData.centralLocalDepartment.code,
              `${moment().format('l')} by`,
              '3',
              tenantNames.central,
            ],
            ['edit'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.collegeLocalDepartment.name,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalDepartment.name,
          );
        },
      );

      it(
        'C407747 User with "Consortium manager: Can share settings to all members" permission is able to view the list of departments of affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C407747'] },
        () => {
          cy.setTenant(Affiliations.College);
          cy.login(testData.user747.username, testData.user747.password);
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          cy.visit(TopMenu.consortiumManagerPath);
          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          DepartmentsConsortiumManager.choose();

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralSharedDepartment.payload.name,
              testData.centralSharedDepartment.payload.code,
              `${moment().format('l')} by`,
              '6',
              'All',
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalDepartment.name,
              testData.centralLocalDepartment.code,
              `${moment().format('l')} by`,
              '3',
              tenantNames.central,
            ],
            [],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.collegeLocalDepartment.name,
              testData.collegeLocalDepartment.code,
              `${moment().format('l')} by`,
              '2',
              tenantNames.college,
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.universityLocalDepartment.name,
              testData.universityLocalDepartment.code,
              `${moment().format('l')} by`,
              '-',
              tenantNames.university,
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.verifyStatusOfSelectMembersModal(3, 3, true);
          SelectMembers.selectMembers(tenantNames.college);
          SelectMembers.selectMembers(tenantNames.university);
          SelectMembers.saveAndClose();

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralSharedDepartment.payload.name,
              testData.centralSharedDepartment.payload.code,
              `${moment().format('l')} by`,
              '3',
              'All',
            ],
            [],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.centralLocalDepartment.name,
              testData.centralLocalDepartment.code,
              `${moment().format('l')} by`,
              '3',
              tenantNames.central,
            ],
            [],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.collegeLocalDepartment.name,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.universityLocalDepartment.name,
          );
        },
      );
    });
  });
});
