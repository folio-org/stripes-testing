import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Departments from '../../../support/fragments/settings/users/departments';
import DepartmentsConsortiumManager from '../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import PatronGroupsConsortiumManager from '../../../support/fragments/consortium-manager/users/patronGroupsConsortiumManager';
import PatronGroups from '../../../support/fragments/settings/users/patronGroups';
import SettingsMenu from '../../../support/fragments/settingsMenu';

const testData = {
  centralSharedDepartment: {
    payload: {
      code: getTestEntityValue('centralSharedDepartment_name'),
      name: getTestEntityValue('centralSharedDepartment_name'),
    },
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
  centralSharedPatronGroup: {
    payload: {
      group: getTestEntityValue('centralSharedPatronGroup_name'),
    },
  },
  collegeLocalPatronGroup: {
    id: uuid(),
    name: getTestEntityValue('collegeLocalPatronGroup_name'),
    description: getTestEntityValue('collegeLocalPatronGroup_description'),
  },
  universityLocalPatronGroup: {
    id: uuid(),
    name: getTestEntityValue('universityLocalPatronGroup_name'),
    description: getTestEntityValue('universityLocalPatronGroup_description'),
  },
};

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
        PatronGroupsConsortiumManager.createViaApi(testData.centralSharedPatronGroup).then(
          (newPatronGroup) => {
            testData.centralSharedPatronGroup = newPatronGroup;
          },
        );
        cy.createTempUser([]).then((userProperties) => {
          // User for test C400669
          testData.user400669 = userProperties;

          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.College, testData.user400669.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user400669.userId, [
            permissions.uiUsersCreateEditRemovePatronGroups.gui,
            permissions.departmentsAll.gui,
          ]);
          Departments.createViaApi(testData.collegeLocalDepartment);
          PatronGroups.createViaApi(
            testData.collegeLocalPatronGroup.name,
            testData.collegeLocalPatronGroup.description,
          ).then((response) => {
            testData.collegeLocalPatronGroup.id = response;
          });
          cy.resetTenant();
          cy.getAdminToken();
          cy.assignAffiliationToUser(Affiliations.University, testData.user400669.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user400669.userId, [
            permissions.uiUsersCreateEditRemovePatronGroups.gui,
            permissions.departmentsAll.gui,
          ]);
          Departments.createViaApi(testData.universityLocalDepartment);
          PatronGroups.createViaApi(
            testData.universityLocalPatronGroup.name,
            testData.universityLocalPatronGroup.description,
          ).then((response) => {
            testData.universityLocalPatronGroup.id = response;
          });
          cy.resetTenant();
          cy.login(testData.user400669.username, testData.user400669.password);
        });
      });

      after('delete test data', () => {
        cy.resetTenant();
        cy.setTenant(Affiliations.Consortia);
        cy.getAdminToken();
        Departments.deleteViaApi(testData.centralSharedDepartment.id);
        DepartmentsConsortiumManager.deleteViaApi(testData.centralSharedDepartment);
        PatronGroupsConsortiumManager.deleteViaApi(testData.centralSharedPatronGroup);
        Users.deleteViaApi(testData.user400669.userId);
      });

      it(
        'C400669 User is NOT able to edit and delete from member tenant "Users" settings shared via "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C400669'] },
        () => {
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.patronGroups);
          cy.wait(4000);

          PatronGroups.verifyGroupInTheList({
            name: testData.centralSharedPatronGroup.payload.group,
          });

          PatronGroups.verifyGroupInTheList({
            name: testData.collegeLocalPatronGroup.name,
            description: testData.collegeLocalPatronGroup.description,
            actions: ['edit', 'trash'],
          });

          PatronGroups.verifyGroupAbsentInTheList({
            name: testData.universityLocalPatronGroup.name,
          });
          PatronGroups.clickTrashButtonForGroup(testData.collegeLocalPatronGroup.name);
          PatronGroups.clickModalDeleteButton();

          PatronGroups.verifyGroupAbsentInTheList({
            name: testData.collegeLocalPatronGroup.name,
          });
          cy.visit(SettingsMenu.departments);
          cy.wait(4000);

          Departments.verifyDepartmentsInTheList({
            name: testData.centralSharedDepartment.payload.name,
            code: testData.centralSharedDepartment.payload.code,
          });

          Departments.verifyDepartmentsInTheList({
            name: testData.collegeLocalDepartment.name,
            code: testData.collegeLocalDepartment.code,
            actions: ['edit', 'trash'],
          });

          Departments.clickTrashButtonForGroup(testData.collegeLocalDepartment.name);

          Departments.verifyGroupAbsentInTheList({
            name: testData.universityLocalDepartment.name,
          });

          Departments.verifyGroupAbsentInTheList({
            name: testData.collegeLocalDepartment.name,
          });
          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.patronGroups);
          cy.wait(4000);

          PatronGroups.verifyGroupInTheList({
            name: testData.centralSharedPatronGroup.payload.group,
          });

          PatronGroups.verifyGroupInTheList({
            name: testData.universityLocalPatronGroup.name,
            description: testData.universityLocalPatronGroup.description,
            actions: ['edit', 'trash'],
          });

          PatronGroups.clickTrashButtonForGroup(testData.universityLocalPatronGroup.name);
          PatronGroups.clickModalDeleteButton();

          PatronGroups.verifyGroupAbsentInTheList({
            name: testData.universityLocalPatronGroup.name,
          });

          PatronGroups.verifyGroupAbsentInTheList({
            name: testData.collegeLocalPatronGroup.name,
          });

          cy.visit(SettingsMenu.departments);
          cy.wait(4000);

          Departments.verifyDepartmentsInTheList({
            name: testData.centralSharedDepartment.payload.name,
            code: testData.centralSharedDepartment.payload.code,
          });

          Departments.verifyDepartmentsInTheList({
            name: testData.universityLocalDepartment.name,
            code: testData.universityLocalDepartment.code,
            actions: ['edit', 'trash'],
          });

          Departments.clickTrashButtonForGroup(testData.universityLocalDepartment.name);

          Departments.verifyGroupAbsentInTheList({
            name: testData.universityLocalDepartment.name,
          });

          Departments.verifyGroupAbsentInTheList({
            name: testData.collegeLocalDepartment.name,
          });
        },
      );
    });
  });
});
