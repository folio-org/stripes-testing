import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
} from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConfirmCreate from '../../../../support/fragments/consortium-manager/modal/confirm-create';
import ConfirmShare from '../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import DepartmentsConsortiumManager from '../../../../support/fragments/consortium-manager/users/departmentsConsortiumManager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';
import DeleteCancelReason from '../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../support/fragments/settingsMenu';

const testData = {
  newDepartment: {
    name: getTestEntityValue('a_new'),
    code: getTestEntityValue('a_new'),
  },
  editDepartment: {
    name: getTestEntityValue('a_edit'),
    code: getTestEntityValue('a_edit'),
  },
};

describe('Consortium manager', () => {
  describe('Manage local settings', () => {
    describe('Manage local Departments', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.resetTenant();
        cy.createTempUser([
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.departmentsAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.departmentsAll.gui,
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.departmentsAll.gui,
          ]);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
      });

      it(
        'C407002 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local departments of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet'] },
        () => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });

          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          DepartmentsConsortiumManager.choose();
          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.changeSelectAllCheckbox('check');
          SelectMembers.saveAndClose();
          ConsortiumManagerApp.clickSelectMembers();
          SelectMembers.selectMembers(
            tenantNames.central,
            tenantNames.college,
            tenantNames.university,
          );
          SelectMembers.saveAndClose();
          SelectMembers.selectAllMembers();

          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newDepartment);
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmCreate.waitLoadingConfirmCreate(testData.newDepartment.name);
          ConfirmCreate.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.newDepartment.name, testData.newDepartment.code, tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.performAction(
            testData.newDepartment.name,
            actionIcons.edit,
          );
          ConsortiaControlledVocabularyPaneset.fillInTextField({
            name: testData.editDepartment.name,
            code: testData.editDepartment.code,
          });
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmShare.waitLoadingConfirmShareToAll(testData.editDepartment.name);
          ConfirmShare.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.editDepartment.name, testData.editDepartment.code, tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.performAction(
            testData.editDepartment.name,
            actionIcons.trash,
          );
          DeleteCancelReason.waitLoadingDeleteModal('department', testData.editDepartment.name);

          DeleteCancelReason.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.editDepartment.name,
          );

          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newDepartment);
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmCreate.waitLoadingConfirmCreate(testData.newDepartment.name);
          ConfirmCreate.clickKeepEditing();
          ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.consortiaSettingsDepartmentsPath);
          DepartmentsConsortiumManager.waitLoading();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.newDepartment.name, testData.newDepartment.code, tenantNames.college],
            ['edit', 'trash'],
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.consortiaSettingsDepartmentsPath);
          DepartmentsConsortiumManager.waitLoading();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.newDepartment.name, testData.newDepartment.code, tenantNames.university],
            ['edit', 'trash'],
          );
        },
      );
    });
  });
});
