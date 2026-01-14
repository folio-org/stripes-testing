import { getTestEntityValue } from '../../../../support/utils/stringTools';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ConfirmCreate from '../../../../support/fragments/consortium-manager/modal/confirm-create';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import NatureOfContentConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances/natureOfContentConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

const testData = {
  newNatureOfContent: {
    name: getTestEntityValue('C411294_new'),
  },
  editNatureOfContent: {
    name: getTestEntityValue('C411294_edit'),
  },
  tempNatureOfContent: {
    name: getTestEntityValue('C411294'),
  },
};

describe('Consortium manager', () => {
  describe('Manage local settings', () => {
    describe('Manage local Nature of content', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.resetTenant();
        cy.createTempUser([
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.crudNatureOfContent.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.crudNatureOfContent.gui,
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.crudNatureOfContent.gui,
          ]);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        NatureOfContentConsortiumManager.deleteNatureOfContentByNameAndTenant(
          testData.newNatureOfContent.name,
          Affiliations.Consortia,
        );
        NatureOfContentConsortiumManager.deleteNatureOfContentByNameAndTenant(
          testData.editNatureOfContent.name,
          Affiliations.University,
        );
        NatureOfContentConsortiumManager.deleteNatureOfContentByNameAndTenant(
          testData.newNatureOfContent.name,
          Affiliations.College,
        );
        NatureOfContentConsortiumManager.deleteNatureOfContentByNameAndTenant(
          testData.newNatureOfContent.name,
          Affiliations.University,
        );
      });

      it(
        'C411294 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local nature of content of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C411294'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });

          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          NatureOfContentConsortiumManager.choose();

          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newNatureOfContent);
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmCreate.waitLoadingConfirmCreate(testData.newNatureOfContent.name);
          ConfirmCreate.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newNatureOfContent.name,
            tenantNames.central,
            [testData.newNatureOfContent.name, 'local', '', tenantNames.central],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newNatureOfContent.name,
            tenantNames.college,
            [testData.newNatureOfContent.name, 'local', '', tenantNames.college],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newNatureOfContent.name,
            tenantNames.university,
            [testData.newNatureOfContent.name, 'local', '', tenantNames.university],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newNatureOfContent.name,
            tenantNames.university,
            actionIcons.edit,
          );

          ConsortiaControlledVocabularyPaneset.fillInTextField({
            name: testData.editNatureOfContent.name,
          });
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiumManagerApp.checkMessage(
            `${testData.editNatureOfContent.name} was successfully updated for ${tenantNames.university} library.`,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.editNatureOfContent.name,
            tenantNames.university,
            [testData.editNatureOfContent.name, 'local', '', tenantNames.university],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newNatureOfContent.name,
            tenantNames.college,
            actionIcons.trash,
          );
          ConsortiaControlledVocabularyPaneset.confirmDelete();
          ConsortiumManagerApp.checkMessage(
            messages.deleted('nature of content term', testData.newNatureOfContent.name),
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.newNatureOfContent.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.tempNatureOfContent);
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConfirmCreate.waitLoadingConfirmCreate(testData.tempNatureOfContent.name);
          ConfirmCreate.clickKeepEditing();
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.tempNatureOfContent.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newNatureOfContent);
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            name: messages.notUnique('Name'),
          });
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

          cy.visit(SettingsMenu.natureOfContent);
          cy.wait(5000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.newNatureOfContent.name, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.natureOfContent);
          cy.wait(5000);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.newNatureOfContent.name,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.natureOfContent);
          cy.wait(5000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.editNatureOfContent.name, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );
        },
      );
    });
  });
});
