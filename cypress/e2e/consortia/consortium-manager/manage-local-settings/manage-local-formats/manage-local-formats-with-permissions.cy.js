import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import FormatsConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/formatsConsortiumManager';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

const testData = {
  newFormat: {
    name: getTestEntityValue('C410725_new'),
    code: getTestEntityValue('C410725'),
  },
  editFormat: {
    name: getTestEntityValue('C410725_edit'),
    code: getTestEntityValue('C410725'),
  },
  tempFormat: {
    name: getTestEntityValue('C410725'),
    code: getTestEntityValue('C410725'),
  },
};

describe('Consortium manager', () => {
  describe('Manage local settings', () => {
    describe('Manage local Formats', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.resetTenant();
        cy.createTempUser([
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.crudFormats.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.crudFormats.gui]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [Permissions.crudFormats.gui]);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        FormatsConsortiumManager.deleteFormatByNameAndTenant(
          testData.newFormat.name,
          Affiliations.Consortia,
        );
        FormatsConsortiumManager.deleteFormatByNameAndTenant(
          testData.editFormat.name,
          Affiliations.University,
        );
        FormatsConsortiumManager.deleteFormatByNameAndTenant(
          testData.newFormat.name,
          Affiliations.College,
        );
        FormatsConsortiumManager.deleteFormatByNameAndTenant(
          testData.newFormat.name,
          Affiliations.University,
        );
      });

      it(
        'C410725 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local formats of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410725'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });

          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          FormatsConsortiumManager.choose();

          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newFormat);
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmCreate.waitLoadingConfirmCreate(testData.newFormat.name);
          ConfirmCreate.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newFormat.name,
            tenantNames.central,
            [testData.newFormat.name, testData.newFormat.code, 'local', '', tenantNames.central],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newFormat.name,
            tenantNames.college,
            [testData.newFormat.name, testData.newFormat.code, 'local', '', tenantNames.college],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newFormat.name,
            tenantNames.university,
            [testData.newFormat.name, testData.newFormat.code, 'local', '', tenantNames.university],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newFormat.name,
            tenantNames.university,
            actionIcons.edit,
          );

          ConsortiaControlledVocabularyPaneset.fillInTextField({
            name: testData.editFormat.name,
          });
          ConsortiaControlledVocabularyPaneset.fillInTextField({
            code: testData.editFormat.code,
          });
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiumManagerApp.checkMessage(
            `${testData.editFormat.name} was successfully updated for ${tenantNames.university} library.`,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.editFormat.name,
            tenantNames.university,
            [
              testData.editFormat.name,
              testData.editFormat.code,
              'local',
              '',
              tenantNames.university,
            ],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newFormat.name,
            tenantNames.college,
            actionIcons.trash,
          );
          ConsortiaControlledVocabularyPaneset.confirmDelete();
          ConsortiumManagerApp.checkMessage(messages.deleted('format', testData.newFormat.name));
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.newFormat.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.tempFormat);
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConfirmCreate.waitLoadingConfirmCreate(testData.tempFormat.name);
          ConfirmCreate.clickKeepEditing();
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.tempFormat.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newFormat);
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            name: messages.notUnique('Name'),
          });
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

          cy.visit(SettingsMenu.patronGroups);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.newFormat.name, testData.newFormat.code, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.formats);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(testData.newFormat.name);

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.formats);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.editFormat.name, testData.editFormat.code, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );
        },
      );
    });
  });
});
