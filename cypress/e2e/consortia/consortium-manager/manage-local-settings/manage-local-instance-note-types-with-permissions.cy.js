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
import InstanceNoteTypesConsortiumManager from '../../../../support/fragments/consortium-manager/inventory/instances/instanceNoteTypesConsortiumManager';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../support/utils/stringTools';

const testData = {
  newInstanceNoteType: {
    name: getTestEntityValue('C410916_new'),
  },
  editInstanceNoteType: {
    name: getTestEntityValue('C410916_edit'),
  },
  tempInstanceNoteType: {
    name: getTestEntityValue('C410916'),
  },
};

describe('Consortium manager', () => {
  describe('Manage local settings', () => {
    describe('Manage local Instance note types', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.resetTenant();
        cy.createTempUser([
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.crudInstanceNoteTypes.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.crudInstanceNoteTypes.gui,
          ]);
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, testData.user.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.crudInstanceNoteTypes.gui,
          ]);
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InstanceNoteTypesConsortiumManager.deleteInstanceNoteTypeByNameAndTenant(
          testData.newInstanceNoteType.name,
          Affiliations.Consortia,
        );
        InstanceNoteTypesConsortiumManager.deleteInstanceNoteTypeByNameAndTenant(
          testData.editInstanceNoteType.name,
          Affiliations.University,
        );
        InstanceNoteTypesConsortiumManager.deleteInstanceNoteTypeByNameAndTenant(
          testData.newInstanceNoteType.name,
          Affiliations.College,
        );
        InstanceNoteTypesConsortiumManager.deleteInstanceNoteTypeByNameAndTenant(
          testData.newInstanceNoteType.name,
          Affiliations.University,
        );
      });

      it(
        'C410916 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local instance note types of selected affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
        { tags: ['criticalPathECS', 'thunderjet', 'C410916'] },
        () => {
          cy.resetTenant();
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.consortiumManagerPath,
            waiter: ConsortiumManagerApp.waitLoading,
          });

          ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
          InstanceNoteTypesConsortiumManager.choose();

          SelectMembers.selectAllMembers();
          ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);

          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newInstanceNoteType);
          ConsortiaControlledVocabularyPaneset.clickSave();

          ConfirmCreate.waitLoadingConfirmCreate(testData.newInstanceNoteType.name);
          ConfirmCreate.clickConfirm();

          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newInstanceNoteType.name,
            tenantNames.central,
            [testData.newInstanceNoteType.name, 'local', '', tenantNames.central],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newInstanceNoteType.name,
            tenantNames.college,
            [testData.newInstanceNoteType.name, 'local', '', tenantNames.college],
            [actionIcons.edit, actionIcons.trash],
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.newInstanceNoteType.name,
            tenantNames.university,
            [testData.newInstanceNoteType.name, 'local', '', tenantNames.university],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newInstanceNoteType.name,
            tenantNames.university,
            actionIcons.edit,
          );

          ConsortiaControlledVocabularyPaneset.fillInTextField({
            name: testData.editInstanceNoteType.name,
          });
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiumManagerApp.checkMessage(
            `${testData.editInstanceNoteType.name} was successfully updated for ${tenantNames.university} library.`,
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
            testData.editInstanceNoteType.name,
            tenantNames.university,
            [testData.editInstanceNoteType.name, 'local', '', tenantNames.university],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiaControlledVocabularyPaneset.performActionFor(
            testData.newInstanceNoteType.name,
            tenantNames.college,
            actionIcons.trash,
          );
          ConsortiaControlledVocabularyPaneset.confirmDelete();
          ConsortiumManagerApp.checkMessage(
            messages.deleted('instance note type', testData.newInstanceNoteType.name),
          );
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.newInstanceNoteType.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.tempInstanceNoteType);
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConfirmCreate.waitLoadingConfirmCreate(testData.tempInstanceNoteType.name);
          ConfirmCreate.clickKeepEditing();
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
          ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
            testData.tempInstanceNoteType.name,
            tenantNames.central,
          );

          ConsortiaControlledVocabularyPaneset.createViaUi(false, testData.newInstanceNoteType);
          ConsortiaControlledVocabularyPaneset.clickSave();
          ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
            name: messages.notUnique('Name'),
          });
          ConsortiaControlledVocabularyPaneset.clickCancel();
          ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

          cy.visit(SettingsMenu.instanceNoteTypes);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.newInstanceNoteType.name, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(SettingsMenu.instanceNoteTypes);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
            testData.newInstanceNoteType.name,
          );

          ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
          cy.visit(SettingsMenu.instanceNoteTypes);
          cy.wait(4000);
          ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
            [testData.editInstanceNoteType.name, 'local', ''],
            [actionIcons.edit, actionIcons.trash],
          );
        },
      );
    });
  });
});
