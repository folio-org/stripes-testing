import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import DepartmentsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Departments from '../../../../../support/fragments/settings/users/departments';
import SettingsUsers, {
  SETTINGS_TABS,
} from '../../../../../support/fragments/settings/users/settingsUsers';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import DateTools from '../../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Departments', () => {
        let user;
        let testData;
        const deleteModalSettingName = 'department';
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
        const capabSetsToAssignCentral = [
          CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
          CapabilitySets.uiUsersSettingsDepartmentsManage,
        ];
        const capabSetsToAssignMember1 = [CapabilitySets.uiUsersSettingsDepartmentsManage];
        const capabSetsToAssignMember2 = [
          CapabilitySets.uiUsersSettingsDepartmentsCreateEditViewEdit,
        ];
        const allTenants = [tenantNames.central, tenantNames.college, tenantNames.university];
        const allTenantNames = [...allTenants].sort().join(', ');

        before('Create test data', () => {
          const postfix = getRandomPostfix();
          testData = {
            department: {
              name: `AT_C407002_LocalDepartment_${postfix}`,
              code: `AT_C407002_LD1_${postfix}`,
            },
            editedDepartment: {
              name: `AT_C407002_EditedLocalDepartment_${postfix}`,
              code: `AT_C407002_LD1E_${postfix}`,
            },
            secondDepartment: {
              name: `AT_C407002_LocalDepartment2_${postfix}`,
              code: `AT_C407002_LD2_${postfix}`,
            },
          };

          cy.clearLocalStorage();
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([]).then((userProperties) => {
            user = userProperties;
            cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssignCentral);

            [
              [Affiliations.College, capabSetsToAssignMember1],
              [Affiliations.University, capabSetsToAssignMember2],
            ].forEach(([tenantId, capabSets]) => {
              cy.resetTenant();
              cy.assignAffiliationToUser(tenantId, user.userId);
              cy.setTenant(tenantId);
              cy.assignCapabilitiesToExistingUser(user.userId, [], capabSets);
            });

            cy.resetTenant();
            cy.login(user.username, user.password);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          if (user?.userId) Users.deleteViaApi(user.userId);
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenantId) => {
              cy.setTenant(tenantId);
              Departments.getViaApi({
                query: `name=="${testData.department.name}" or name=="${testData.editedDepartment.name}" or name=="${testData.secondDepartment.name}"`,
              }).then((departments) => {
                departments.forEach(({ id }) => Departments.deleteViaApi(id));
              });
            },
          );
        });

        it(
          'C407002 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local departments of selected affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C407002'] },
          () => {
            const localRow = ({ name, code }, tenantName) => [
              name,
              code,
              `${todayDate} by ${user.lastName}, ${user.firstName}`,
              '-',
              tenantName,
            ];
            const verifyNewRowInEditMode = () => {
              ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
              ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
                isEnabled: false,
                isChecked: false,
              });
              ConsortiumManagerApp.verifySelectMembersButton(false);
            };
            const verifyNoRowInEditMode = () => {
              ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
              ConsortiumManagerApp.verifySelectMembersButton();
            };

            // Step 1: Open Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            // Step 2: Click "Users" in "Settings" pane
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);

            // Step 3: Click "Departments"
            DepartmentsConsortiumManager.choose();
            DepartmentsConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 4: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            verifyNewRowInEditMode();

            // Step 5: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.department.name,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.department.name,
            });

            // Step 6: Fill in the code
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.department.code,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              code: testData.department.code,
            });

            // Step 7: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.department.name, allTenants);

            // Step 8: Confirm creation
            ConfirmCreate.clickConfirm();
            DepartmentsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.created(testData.department.name, allTenantNames),
            );
            verifyNoRowInEditMode();

            // Step 9: Verify the row in central tenant
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.department.name,
              tenantNames.central,
              localRow(testData.department, tenantNames.central),
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 10: Verify the row in member-1 tenant
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.department.name,
              tenantNames.college,
              localRow(testData.department, tenantNames.college),
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 11: Verify the row in member-2 tenant
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.department.name,
              tenantNames.university,
              localRow(testData.department, tenantNames.university),
              [actionIcons.edit],
            );

            // Step 12: Click "Edit" for the row in member-2 tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.department.name,
              tenantNames.university,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 13: Edit name and code
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedDepartment.name,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.editedDepartment.name,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedDepartment.code,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              code: testData.editedDepartment.code,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 14: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedDepartment.name, tenantNames.university),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedDepartment.name,
              tenantNames.university,
              localRow(testData.editedDepartment, tenantNames.university),
              [actionIcons.edit],
            );
            [tenantNames.central, tenantNames.college].forEach((tenantName) => {
              ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
                testData.department.name,
                tenantName,
                localRow(testData.department, tenantName),
                [actionIcons.edit, actionIcons.trash],
              );
            });
            verifyNoRowInEditMode();

            // Step 15: Click "Delete" for the row in member-1 tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.department.name,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              deleteModalSettingName,
              testData.department.name,
            );

            // Step 16: Click "Delete" in the modal
            DeleteCancelReason.clickDelete();
            DepartmentsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(deleteModalSettingName, testData.department.name),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedDepartment.name,
              tenantNames.university,
              localRow(testData.editedDepartment, tenantNames.university),
              [actionIcons.edit],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.department.name,
              tenantNames.central,
              localRow(testData.department, tenantNames.central),
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.department.name,
              tenantNames.college,
            );

            // Step 17: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            verifyNewRowInEditMode();

            // Step 18: Fill in name and code, click "Save", then "Keep editing"
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.secondDepartment.name,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.secondDepartment.name,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.secondDepartment.code,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              code: testData.secondDepartment.code,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.secondDepartment.name, allTenants);
            ConfirmCreate.clickKeepEditing();
            DepartmentsConsortiumManager.waitLoading();
            verifyNewRowInEditMode();

            // Step 19: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.secondDepartment.name,
            );
            verifyNoRowInEditMode();

            // Step 20: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            verifyNewRowInEditMode();

            // Step 21: Fill in not unique name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.department.name,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 22: Fill in not unique code
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.department.code,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 23: Click "Save" and verify validation errors
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              code: messages.notUnique('Code'),
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 24: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();

            ConsortiaControlledVocabularyPaneset.verifyRecordHasNoDuplicatesInTheList(
              testData.department.name,
            );
            verifyNoRowInEditMode();

            // Step 25: Verify the department in Settings => Users => Departments (central)
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsMenu.selectUsers();
            SettingsUsers.selectSettingsTab(SETTINGS_TABS.DEPARTMENTS);
            Departments.waitLoading();
            Departments.verifyDepartmentsInTheList({
              name: testData.department.name,
              code: testData.department.code,
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 26: Switch to member-1 tenant and verify the department is absent
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsUsers.selectSettingsTab(SETTINGS_TABS.DEPARTMENTS);
            Departments.waitLoading();
            Departments.verifyGroupAbsentInTheList({ name: testData.department.name });

            // Step 27: Switch to member-2 tenant and verify the edited department
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsUsers.selectSettingsTab(SETTINGS_TABS.DEPARTMENTS);
            Departments.waitLoading();
            Departments.verifyDepartmentsInTheList({
              name: testData.editedDepartment.name,
              code: testData.editedDepartment.code,
              actions: [actionIcons.edit],
            });
          },
        );
      });
    });
  });
});
