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
import AlternativeTitleTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances/alternativeTitleTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const testData = {
  newAlternativeTitleType: {
    name: getTestEntityValue('C410862_new'),
  },
  editAlternativeTitleType: {
    name: getTestEntityValue('C410862_edit'),
  },
  tempAlternativeTitleType: {
    name: getTestEntityValue('C410862'),
  },
};

describe('Consortium manager', () => {
  describe('Manage local settings', () => {
    describe('Manage local Alternative title types', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.resetTenant();
        cy.createTempUser([
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.crudAlternativeTitleTypes.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.crudAlternativeTitleTypes.gui,
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.crudAlternativeTitleTypes.gui,
          ]);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        AlternativeTitleTypesConsortiumManager.deleteAlternativeTitleTypeByNameAndTenant(
          testData.newAlternativeTitleType.name,
          Affiliations.Consortia,
        );
        AlternativeTitleTypesConsortiumManager.deleteAlternativeTitleTypeByNameAndTenant(
          testData.editAlternativeTitleType.name,
          Affiliations.University,
        );
        AlternativeTitleTypesConsortiumManager.deleteAlternativeTitleTypeByNameAndTenant(
          testData.newAlternativeTitleType.name,
          Affiliations.College,
        );
        AlternativeTitleTypesConsortiumManager.deleteAlternativeTitleTypeByNameAndTenant(
          testData.newAlternativeTitleType.name,
          Affiliations.University,
        );
      });

      it(
        'C410862 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local alternative title types of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410862'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });

          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          AlternativeTitleTypesConsortiumManager.choose();

          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newAlternativeTitleType);
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmCreate.waitLoadingConfirmCreate(testData.newAlternativeTitleType.name);
          ConfirmCreate.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newAlternativeTitleType.name,
            tenantNames.central,
            [testData.newAlternativeTitleType.name, 'local', '', tenantNames.central],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newAlternativeTitleType.name,
            tenantNames.college,
            [testData.newAlternativeTitleType.name, 'local', '', tenantNames.college],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newAlternativeTitleType.name,
            tenantNames.university,
            [testData.newAlternativeTitleType.name, 'local', '', tenantNames.university],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newAlternativeTitleType.name,
            tenantNames.university,
            actionIcons.edit,
          );

          ConsortiaControlledVocabularyPaneset.fillInTextField({
            name: testData.editAlternativeTitleType.name,
          });
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiumManagerApp.checkMessage(
            `${testData.editAlternativeTitleType.name} was successfully updated for ${tenantNames.university} library.`,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.editAlternativeTitleType.name,
            tenantNames.university,
            [testData.editAlternativeTitleType.name, 'local', '', tenantNames.university],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newAlternativeTitleType.name,
            tenantNames.college,
            actionIcons.trash,
          );
          ConsortiaControlledVocabularyPaneset.confirmDelete();
          ConsortiumManagerApp.checkMessage(
            messages.deleted('alternative title type', testData.newAlternativeTitleType.name),
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.newAlternativeTitleType.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(
            false,
            testData.tempAlternativeTitleType,
          );
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConfirmCreate.waitLoadingConfirmCreate(testData.tempAlternativeTitleType.name);
          ConfirmCreate.clickKeepEditing();
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.tempAlternativeTitleType.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newAlternativeTitleType);
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            name: messages.notUnique('Name'),
          });
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

          cy.visit(SettingsMenu.alternativeTitleTypes);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.newAlternativeTitleType.name, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.alternativeTitleTypes);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.newAlternativeTitleType.name,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.alternativeTitleTypes);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.editAlternativeTitleType.name, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );
        },
      );
    });
  });
});
