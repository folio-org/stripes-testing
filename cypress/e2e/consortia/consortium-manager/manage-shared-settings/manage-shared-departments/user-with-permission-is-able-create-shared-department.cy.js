import moment from 'moment';

import { calloutTypes } from '../../../../../../interactors';
import {
  APPLICATION_NAMES,
  CONSORTIA_SYSTEM_USER,
} from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
  SHARED_SETTING_LIBRARIES,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import DepartmentsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Departments from '../../../../../support/fragments/settings/users/departments';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

const testData = {
  preconditionDepartment: {
    name: getTestEntityValue('C409514_Precondition_Department'),
    code: getTestEntityValue('C409514_Precondition_SD'),
  },
  sharedDepartment: {
    name: getTestEntityValue('C409514_SharedDepartment'),
    code: getTestEntityValue('C409514_SD'),
  },
};

const checkPermissionsLackMessage = () => {
  // Uncomment and remove log after fixing the bug with permissions (see https://folio-org.atlassian.net/browse/EUREKA-536)
  // ConsortiumManagerApp.checkMessage(
  //   messages.noPermission(Affiliations.University),
  //   calloutTypes.error,
  // );
  cy.log('Check message about lack of permissions to manage shared departments after fix of the bug with permissions (see https://folio-org.atlassian.net/browse/EUREKA-536)');
};

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Departments', () => {
        let userAData;
        let userBData;
        let preconditionDepartment;

        before('Create users data', () => {
          cy.getAdminToken();

          // User A creation and setup
          cy.log('Preconditions 2 and 3.3:');
          cy.log('Create user A in member-2 (University) tenant');
          cy.setTenant(Affiliations.University);
          cy.createTempUser([Permissions.uiOrganizationsView.gui])
            .then((userProperties) => {
              userAData = userProperties;

              cy.log('Assign affiliation to user A in member-1 (College) tenant');
              cy.resetTenant(); // University -> Consortia
              cy.assignAffiliationToUser(Affiliations.College, userAData.userId);

              cy.log('Precondition 3.1: Set permissions to user A in central (Consortia) tenant');
              cy.setTenant(Affiliations.Consortia);
              cy.assignPermissionsToExistingUser(userAData.userId, [
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerView.gui,
                Permissions.createEditViewDepartments.gui,
              ]);

              cy.log('Precondition 3.2: Set permissions to user A in member-1 (College) tenant');
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(userAData.userId, [
                Permissions.departmentsAll.gui,
              ]);
            });

          // User B creation and setup
          cy.log('Precondition 4-5.1:');
          cy.log('Create user B in central (Consortia) tenant');
          cy.resetTenant();
          cy.createTempUser([Permissions.departmentsAll.gui])
            .then((userProperties) => {
              userBData = userProperties;

              cy.log('Assign affiliation to user B in member-1 (College) tenant and member-2 (University) tenant');
              cy.assignAffiliationToUser(Affiliations.College, userBData.userId);
              cy.assignAffiliationToUser(Affiliations.University, userBData.userId);

              cy.log('Precondition 5.2: Set permissions to user B in member-1 (College) tenant');
              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(userBData.userId, [Permissions.departmentsAll.gui]);

              cy.log('Precondition 5.3: Set permissions to user B in member-2 (University) tenant');
              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(userBData.userId, [Permissions.departmentsAll.gui]);
            })
            .then(() => {
              cy.log('Precondition 6: Create shared department in central tenant');
              cy.resetTenant();
              DepartmentsConsortiumManager
                .upsertSharedViaApi(testData.preconditionDepartment)
                .then((department) => {
                  preconditionDepartment = department;

                  cy.log('Precondition 7: Assign shared department to user B in central tenant');
                  cy.assignDepartmentsToExistingUser(userBData.userId, [preconditionDepartment.id]);
                });
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          Users.deleteViaApi(userAData.userId);
          Users.deleteViaApi(userBData.userId);

          // Clean up precondition shared department
          Departments.getViaApi({
            limit: 1,
            query: `name=="${testData.preconditionDepartment.name}"`,
          }).then((department) => {
            if (department && department.length > 0) {
              DepartmentsConsortiumManager.deleteViaApi({
                payload: {
                  name: testData.preconditionDepartment.name,
                  code: testData.preconditionDepartment.code,
                  id: department[0].id,
                  source: 'consortium',
                },
                settingId: department[0].id,
                url: '/departments',
              });
            }
          });

          // Clean up created test shared department
          Departments.getViaApi({
            limit: 1,
            query: `name=="${testData.sharedDepartment.name}"`,
          }).then((department) => {
            if (department && department.length > 0) {
              DepartmentsConsortiumManager.deleteViaApi({
                payload: {
                  name: testData.sharedDepartment.name,
                  code: testData.sharedDepartment.code,
                  id: department[0].id,
                  source: 'consortium',
                },
                settingId: department[0].id,
                url: '/departments',
              });
            }
          });
        });

        it(
          'C409514 User with all "Consortium manager" permissions (view, create, share) is able to create shared department via "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['edgeCases', 'thunderjet', 'C409514'] },
          () => {
            /* <---------- STEP 1: BEGIN ----------> */
            cy.log('STEP 1');
            // Login with User A who has all required permissions and switch to Central tenant
            cy.resetTenant();
            cy.login(userAData.username, userAData.password);
            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);

            // Navigate to Consortium manager app
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();

            // Select all members
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            /* <---------- STEP 1: END ----------> */

            /* <---------- STEP 2: BEGIN ----------> */
            cy.log('STEP 2');
            // Navigate to Users > Departments in consortium manager
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            /* <---------- STEP 2: END ----------> */

            /* <---------- STEP 3: BEGIN ----------> */
            cy.log('STEP 3');
            DepartmentsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            checkPermissionsLackMessage();
            /* <---------- STEP 3: END ----------> */

            /* <---------- STEP 4: BEGIN ----------> */
            cy.log('STEP 4');
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                preconditionDepartment.name,
                preconditionDepartment.code,
                moment(preconditionDepartment.metadata.createdDate).format('l'),
                1,
                SHARED_SETTING_LIBRARIES,
              ],
              [actionIcons.edit]
            );

            /* <---------- STEP 4: END ----------> */

            /* <---------- STEP 5-8: BEGIN ----------> */
            cy.log('STEP 5-8');
            // Create new shared department
            ConsortiaControlledVocabularyPaneset.createViaUi(true, testData.sharedDepartment);
            ConsortiaControlledVocabularyPaneset.clickSave();
            /* <---------- STEP 5-8: END ----------> */

            /* <---------- STEP 9: BEGIN ----------> */
            cy.log('STEP 9');
            // Confirm sharing to all members
            ConfirmShare.waitLoadingConfirmShareToAll(testData.sharedDepartment.name);
            /* <---------- STEP 9: END ----------> */

            /* <---------- STEP 10: BEGIN ----------> */
            cy.log('STEP 10');
            ConfirmShare.clickConfirm();

            // Verify successful creation
            ConsortiumManagerApp.checkMessage(
              messages.created(testData.sharedDepartment.name, SHARED_SETTING_LIBRARIES),
            );
            DepartmentsConsortiumManager.waitLoading();

            // Verify department appears in the list with correct data
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.sharedDepartment.name,
                testData.sharedDepartment.code,
                `${moment().format('l')} by ${CONSORTIA_SYSTEM_USER}`,
                '-',
                SHARED_SETTING_LIBRARIES,
              ],
              [actionIcons.edit, actionIcons.trash]
            );

            checkPermissionsLackMessage();
            /* <---------- STEP 10: END ----------> */

            /* <---------- STEP 11: BEGIN ----------> */
            cy.log('STEP 11');
            cy.logout();
            cy.login(userBData.username, userBData.password);
            /* <---------- STEP 11: END ----------> */

            /* <---------- STEP 12: BEGIN ----------> */
            cy.log('STEP 12');
            // Verify shared department appears in Central tenant Settings > Users > Departments
            cy.visit(SettingsMenu.departments);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.sharedDepartment.name,
                testData.sharedDepartment.code,
                moment().format('l'),
                '-',
              ],
            );
            /* <---------- STEP 12: END ----------> */

            /* <---------- STEP 13: BEGIN ----------> */
            cy.log('STEP 13');
            // Verify shared department appears in College (member-1) tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.departments);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.sharedDepartment.name,
                testData.sharedDepartment.code,
                moment().format('l'),
                '-',
              ],
            );
            /* <---------- STEP 13: END ----------> */

            /* <---------- STEP 14: BEGIN ----------> */
            cy.log('STEP 14');
            // Verify shared department appears in University (member-2) tenant
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.departments);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.sharedDepartment.name,
                testData.sharedDepartment.code,
                moment().format('l'),
                '-',
              ],
            );
            /* <---------- STEP 14: END ----------> */

            /* <---------- STEP 15: BEGIN ----------> */
            cy.log('STEP 15');
            cy.logout();
            cy.login(userAData.username, userAData.password);
            ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.central);
            /* <---------- STEP 15: END ----------> */

            /* <---------- STEP 16: BEGIN ----------> */
            cy.log('STEP 16');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            DepartmentsConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            checkPermissionsLackMessage();
            /* <---------- STEP 16: END ----------> */

            /* <---------- STEP 17: BEGIN ----------> */
            cy.log('STEP 17');
            ConsortiaControlledVocabularyPaneset.performAction(testData.sharedDepartment.name, actionIcons.edit);
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isChecked: true,
              isEnabled: false,
            });
            /* <---------- STEP 17: END ----------> */

            /* <---------- STEP 18: BEGIN ----------> */
            cy.log('STEP 18');
            ConsortiaControlledVocabularyPaneset.clearTextField('name');
            ConsortiaControlledVocabularyPaneset.verifySaveButtonIsActive();
            /* <---------- STEP 18: END ----------> */

            /* <---------- STEP 19: BEGIN ----------> */
            cy.log('STEP 19');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({ name: messages.pleaseFillIn });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(true);
            /* <---------- STEP 19: END ----------> */

            /* <---------- STEP 20: BEGIN ----------> */
            cy.log('STEP 20');
            testData.sharedDepartment.name = getTestEntityValue('C409514_SharedDepartment_Edited');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.sharedDepartment.name });
            /* <---------- STEP 20: END ----------> */

            /* <---------- STEP 21: BEGIN ----------> */
            cy.log('STEP 21');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.sharedDepartment.name);
            ConfirmShare.clickConfirm();

            // Verify successful update
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.sharedDepartment.name, SHARED_SETTING_LIBRARIES),
            );

            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.sharedDepartment.name,
                testData.sharedDepartment.code,
                `${moment().format('l')} by ${CONSORTIA_SYSTEM_USER}`,
                '-',
                SHARED_SETTING_LIBRARIES,
              ],
              [actionIcons.edit, actionIcons.trash]
            );

            checkPermissionsLackMessage();
            /* <---------- STEP 21: END ----------> */

            /* <---------- STEP 22: BEGIN ----------> */
            cy.log('STEP 22');
            // Delete created shared department
            ConsortiaControlledVocabularyPaneset.performAction(testData.sharedDepartment.name, actionIcons.trash);
            ConsortiaControlledVocabularyPaneset.verifyDeleteConfirmationMessage(DepartmentsConsortiumManager.entityName, testData.sharedDepartment.name);
            /* <---------- STEP 22: END ----------> */

            /* <---------- STEP 23: BEGIN ----------> */
            cy.log('STEP 23');
            ConsortiaControlledVocabularyPaneset.confirmDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(DepartmentsConsortiumManager.entityName, testData.sharedDepartment.name),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(testData.sharedDepartment.name);
            checkPermissionsLackMessage();
            /* <---------- STEP 23: END ----------> */

            /* <---------- STEP 24: BEGIN ----------> */
            cy.log('STEP 24');
            cy.logout();
            cy.login(userBData.username, userBData.password);
            /* <---------- STEP 24: END ----------> */

            /* <---------- STEP 25: BEGIN ----------> */
            cy.log('STEP 25');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            cy.visit(SettingsMenu.departments);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(testData.sharedDepartment.name);
            /* <---------- STEP 25: END ----------> */

            /* <---------- STEP 26: BEGIN ----------> */
            cy.log('STEP 26');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            cy.visit(SettingsMenu.departments);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(testData.sharedDepartment.name);
            /* <---------- STEP 26: END ----------> */

            /* <---------- STEP 27: BEGIN ----------> */
            cy.log('STEP 27');
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            cy.visit(SettingsMenu.departments);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(testData.sharedDepartment.name);
            /* <---------- STEP 27: END ----------> */
          },
        );
      });
    });
  });
});
