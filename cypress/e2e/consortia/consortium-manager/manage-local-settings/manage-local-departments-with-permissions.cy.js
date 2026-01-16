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
    name: getTestEntityValue('407002_local_departments'),
    code: getTestEntityValue('407002_local_departments'),
  },
  editDepartment: {
    name: getTestEntityValue('407002_local_departments_edit'),
    code: getTestEntityValue('407002_local_departments_edit'),
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
        { tags: ['criticalPathECS', 'thunderjet', 'C407002'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });

          ConsortiumManagerApp.chooseSettingsItem(settingsItems.users);
          DepartmentsConsortiumManager.chooseWithEmptyList();
          SelectMembers.selectAllMembers();

          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newDepartment);
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmCreate.waitLoadingConfirmCreate(testData.newDepartment.name);
          ConfirmCreate.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newDepartment.name,
            tenantNames.central,
            [testData.newDepartment.name, testData.newDepartment.code, '', '', tenantNames.central],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newDepartment.name,
            tenantNames.college,
            [testData.newDepartment.name, testData.newDepartment.code, '', '', tenantNames.college],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newDepartment.name,
            tenantNames.university,
            [
              testData.newDepartment.name,
              testData.newDepartment.code,
              '',
              '',
              tenantNames.university,
            ],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newDepartment.name,
            tenantNames.central,
            actionIcons.edit,
          );

          ConsortiaControlledVocabularyPaneset.fillInTextField({
            name: testData.editDepartment.name,
            code: testData.editDepartment.code,
          });
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmShare.waitLoadingConfirmShareToAll(testData.editDepartment.name);
          ConfirmShare.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newDepartment.name,
            tenantNames.central,
            [
              testData.editDepartment.name,
              testData.editDepartment.code,
              '',
              '',
              tenantNames.central,
            ],
            ['edit', 'trash'],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.editDepartment.name,
            tenantNames.central,
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
          cy.wait(4000);
          DepartmentsConsortiumManager.waitLoading();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.newDepartment.name, testData.newDepartment.code, '', '', tenantNames.college],
            ['edit', 'trash'],
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.consortiaSettingsDepartmentsPath);
          cy.wait(4000);
          DepartmentsConsortiumManager.waitLoading();
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [
              testData.newDepartment.name,
              testData.newDepartment.code,
              '',
              '',
              tenantNames.university,
            ],
            ['edit', 'trash'],
          );
        },
      );
    });
  });
});
