import moment from 'moment';
import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import DepartmentsConsortiumManager from '../../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Departments from '../../../../../support/fragments/settings/users/departments';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Departments', () => {
        let userData;
        const sharedDepartment = {
          name: getTestEntityValue('Shared_department_1'),
          code: getTestEntityValue('SD1'),
        };
        const sharedDepartment2 = {
          name: getTestEntityValue('Shared_department_2'),
          code: getTestEntityValue('SD2'),
        };

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.createEditViewDepartments.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.departmentsAll.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.departmentsAll.gui,
                ]);
              });
            })
            .then(() => {
              cy.resetTenant();
              cy.login(userData.username, userData.password);
            });
        });

        after('Delete users data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
        });

        it(
          'C406999 User with "Consortium manager: Can share settings to all members" permission is able to add/delete department shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C406999'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
            DepartmentsConsortiumManager.chooseWithEmptyList();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedDepartment);
            ConsortiaControlledVocabularyPaneset.clickSave();
            const createdDepartment = [
              ...Object.values(sharedDepartment),
              moment().format('l'),
              '-',
              'All',
            ];

            ConfirmShare.waitLoadingConfirmShareToAll(sharedDepartment.name);
            ConfirmShare.clickConfirm();
            DepartmentsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(sharedDepartment.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdDepartment, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedDepartment2);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(sharedDepartment2.name);
            ConfirmShare.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, sharedDepartment);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              code: messages.notUnique('Code'),
            });

            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdDepartment, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              sharedDepartment.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('department', sharedDepartment.name);

            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdDepartment, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              sharedDepartment.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('department', sharedDepartment.name);
            DeleteCancelReason.clickDelete();
            ConsortiumManagerApp.checkMessage(
              messages.deleted('department', sharedDepartment.name),
            );
            DepartmentsConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(sharedDepartment.name);

            cy.visit(SettingsMenu.departments);
            cy.wait(5000);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(sharedDepartment.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.departments);
            cy.wait(5000);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(sharedDepartment.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.departments);
            cy.wait(5000);
            Departments.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(sharedDepartment.name);
          },
        );
      });
    });
  });
});
