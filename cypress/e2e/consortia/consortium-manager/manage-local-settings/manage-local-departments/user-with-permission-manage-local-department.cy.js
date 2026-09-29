import moment from 'moment';
import {
  APPLICATION_NAMES,
  DEFAULT_WAIT_TIME,
  REQUEST_METHOD,
} from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import DepartmentsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Departments from '../../../../../support/fragments/settings/users/departments';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../../../support/utils';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import SettingsUsers, {
  SETTINGS_TABS,
} from '../../../../../support/fragments/settings/users/settingsUsers';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Departments', () => {
        const flow = new ExecutionFlowManager();
        const R = { USER: 'user' };
        const department = {
          name: getTestEntityValue('Local_department_407743'),
          code: getTestEntityValue('LD407743'),
        };
        const editedDepartment = {
          name: getTestEntityValue('Local_department_407743_edited'),
          code: getTestEntityValue('LD407743E'),
        };

        before('Create the test user and assign the required tenant permissions', () => {
          cy.resetTenant();
          cy.getAdminToken();

          flow
            .step(() => {
              return cy
                .createTempUser([
                  Permissions.consortiaSettingsConsortiumManagerShare.gui,
                  Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                  Permissions.createEditViewDepartments.gui,
                ])
                .then((user) => flow.set(R.USER, user, () => Users.deleteViaApi(user.userId)));
            })
            .step((f) => {
              const user = f.get(R.USER);

              cy.assignAffiliationToUser(Affiliations.College, user.userId, {
                waitMs: DEFAULT_WAIT_TIME,
              });
              cy.assignAffiliationToUser(Affiliations.University, user.userId, {
                waitMs: DEFAULT_WAIT_TIME,
              });

              cy.setTenant(Affiliations.College);
              cy.assignPermissionsToExistingUser(user.userId, [Permissions.departmentsAll.gui]);

              cy.setTenant(Affiliations.University);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.createEditViewDepartments.gui,
              ]);
            })
            .step((f) => {
              cy.resetTenant();

              return cy.login(f.get(R.USER).username, f.get(R.USER).password, { path: '' });
            });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();

          Departments.getViaApi({ query: `name=="${editedDepartment.name}"` }).then((records) => {
            records.forEach((record) => {
              cy.sendPublishCoordinatorPublication({
                url: `/departments/${record.id}`,
                method: REQUEST_METHOD.DELETE,
                tenants: [Affiliations.Consortia, Affiliations.College, Affiliations.University],
              });
            });
          });
          flow.cleanup();
        });

        it(
          'C407743 User with consortium manager share permission manages local departments in affiliated tenants',
          { tags: ['extendedPathECS', 'thunderjet', 'C407743'] },
          () => {
            cy.log('Step 1. Open Consortium manager, select all members, and save the selection');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyMembersSelected(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            cy.log('Step 2. Open Users settings');
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);

            cy.log('Step 3. Open Departments settings');
            DepartmentsConsortiumManager.chooseWithEmptyList();
            DepartmentsConsortiumManager.waitLoading();

            cy.log('Step 4. Create a new local department row');
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            cy.log('Step 5. Fill in the department name');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: department.name });

            cy.log('Step 6. Fill in the department code');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: department.code });

            cy.log('Step 7. Leave the Share checkbox unchecked');
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({ isChecked: false });

            cy.log('Step 8. Save the local department');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(department.name);

            cy.log('Step 9. Confirm saving the department for the selected members');
            ConfirmCreate.clickConfirm();

            const membersString = [tenantNames.college, tenantNames.central, tenantNames.university]
              .sort((a, b) => a.localeCompare(b))
              .join(', ');
            ConsortiumManagerApp.checkMessage(messages.created(department.name, membersString));
            DepartmentsConsortiumManager.waitLoading();

            const createdRecord = [
              department.name,
              department.code,
              moment().format('l'),
              '-',
              tenantNames.central,
            ];
            const memberRecord = [
              department.name,
              department.code,
              moment().format('l'),
              '-',
              tenantNames.college,
            ];
            const universityRecord = [
              department.name,
              department.code,
              moment().format('l'),
              '-',
              tenantNames.university,
            ];

            cy.log('Step 10. Verify the central tenant department row');
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              department.name,
              tenantNames.central,
              createdRecord,
              [actionIcons.edit],
            );

            cy.log('Step 11. Verify the member-1 tenant department row');
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              department.name,
              tenantNames.college,
              memberRecord,
              [actionIcons.edit, actionIcons.trash],
            );

            cy.log('Step 12. Verify the member-2 tenant department row');
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              department.name,
              tenantNames.university,
              universityRecord,
              [actionIcons.edit],
            );

            cy.log('Step 13. Open the central tenant department for editing');
            ConsortiaControlledVocabularyPaneset.performActionFor(
              department.name,
              tenantNames.central,
              actionIcons.edit,
            );

            cy.log('Step 14. Change the department name and code');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: editedDepartment.name });
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: editedDepartment.code });

            cy.log('Step 15. Cancel editing the central tenant department');
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              department.name,
              tenantNames.central,
              createdRecord,
              [actionIcons.edit],
            );

            cy.log('Step 16. Edit and save the central tenant department');
            ConsortiaControlledVocabularyPaneset.performActionFor(
              department.name,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: editedDepartment.name });
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: editedDepartment.code });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(editedDepartment.name, tenantNames.central),
            );

            cy.log('Step 17. Open the member-1 department delete confirmation');
            ConsortiaControlledVocabularyPaneset.performActionFor(
              department.name,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('department', department.name);

            cy.log('Step 18. Delete the member-1 department');
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(messages.deleted('department', department.name));
            DepartmentsConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              department.name,
              tenantNames.college,
            );

            cy.log('Step 19. Verify the edited department in the central tenant Settings app');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsMenu.selectUsers();
            SettingsUsers.selectSettingsTab(SETTINGS_TABS.DEPARTMENTS);
            Departments.waitLoading();
            Departments.verifyDepartmentsInTheList({
              name: editedDepartment.name,
              code: editedDepartment.code,
              actions: [actionIcons.edit],
            });

            cy.log('Step 20. Switch to member-1 and verify the deleted department is absent');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsUsers.selectSettingsTab(SETTINGS_TABS.DEPARTMENTS);
            Departments.waitLoading();
            Departments.verifyGroupAbsentInTheList({ name: department.name });

            cy.log('Step 21. Switch to member-2 and verify its department remains');
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsUsers.selectSettingsTab(SETTINGS_TABS.DEPARTMENTS);
            Departments.waitLoading();
            Departments.verifyDepartmentsInTheList({
              name: department.name,
              code: department.code,
              actions: [actionIcons.edit],
            });
          },
        );
      });
    });
  });
});
