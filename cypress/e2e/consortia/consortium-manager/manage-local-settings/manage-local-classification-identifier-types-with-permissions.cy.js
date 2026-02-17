import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ClassificationIdentifierTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances/classificationIdentifierTypesConsortiumManager';
import ConfirmCreate from '../../../../support/fragments/consortium-manager/modal/confirm-create';
import SelectMembers from '../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const testData = {
  newClassificationIdentifierType: {
    name: getTestEntityValue('C410892_new'),
  },
  editClassificationIdentifierType: {
    name: getTestEntityValue('C410892_edit'),
  },
  tempClassificationIdentifierType: {
    name: getTestEntityValue('C410892'),
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
          Permissions.crudClassificationIdentifierTypes.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.crudClassificationIdentifierTypes.gui,
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.crudClassificationIdentifierTypes.gui,
          ]);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        ClassificationIdentifierTypesConsortiumManager.deleteClassificationIdentifierTypeByNameAndTenant(
          testData.newClassificationIdentifierType.name,
          Affiliations.Consortia,
        );
        ClassificationIdentifierTypesConsortiumManager.deleteClassificationIdentifierTypeByNameAndTenant(
          testData.editClassificationIdentifierType.name,
          Affiliations.University,
        );
        ClassificationIdentifierTypesConsortiumManager.deleteClassificationIdentifierTypeByNameAndTenant(
          testData.newClassificationIdentifierType.name,
          Affiliations.College,
        );
        ClassificationIdentifierTypesConsortiumManager.deleteClassificationIdentifierTypeByNameAndTenant(
          testData.newClassificationIdentifierType.name,
          Affiliations.University,
        );
      });

      it(
        'C410892 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local classification identifier types of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410892'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });

          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          ClassificationIdentifierTypesConsortiumManager.choose();

          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.createViaUi(
            false,
            testData.newClassificationIdentifierType,
          );
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmCreate.waitLoadingConfirmCreate(testData.newClassificationIdentifierType.name);
          ConfirmCreate.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newClassificationIdentifierType.name,
            tenantNames.central,
            [testData.newClassificationIdentifierType.name, 'local', '', tenantNames.central],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newClassificationIdentifierType.name,
            tenantNames.college,
            [testData.newClassificationIdentifierType.name, 'local', '', tenantNames.college],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newClassificationIdentifierType.name,
            tenantNames.university,
            [testData.newClassificationIdentifierType.name, 'local', '', tenantNames.university],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newClassificationIdentifierType.name,
            tenantNames.university,
            actionIcons.edit,
          );

          ConsortiaControlledVocabularyPaneset.fillInTextField({
            name: testData.editClassificationIdentifierType.name,
          });
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiumManagerApp.checkMessage(
            `${testData.editClassificationIdentifierType.name} was successfully updated for ${tenantNames.university} library.`,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.editClassificationIdentifierType.name,
            tenantNames.university,
            [testData.editClassificationIdentifierType.name, 'local', '', tenantNames.university],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newClassificationIdentifierType.name,
            tenantNames.college,
            actionIcons.trash,
          );
          ConsortiaControlledVocabularyPaneset.confirmDelete();
          ConsortiumManagerApp.checkMessage(
            messages.deleted(
              'classification identifier type',
              testData.newClassificationIdentifierType.name,
            ),
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.newClassificationIdentifierType.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(
            false,
            testData.tempClassificationIdentifierType,
          );
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConfirmCreate.waitLoadingConfirmCreate(testData.tempClassificationIdentifierType.name);
          ConfirmCreate.clickKeepEditing();
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.tempClassificationIdentifierType.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(
            false,
            testData.newClassificationIdentifierType,
          );
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            name: messages.notUnique('Name'),
          });
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

          cy.visit(SettingsMenu.classificationTypes);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.newClassificationIdentifierType.name, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.classificationTypes);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.newClassificationIdentifierType.name,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.classificationTypes);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.editClassificationIdentifierType.name, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );
        },
      );
    });
  });
});
