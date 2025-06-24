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
import InstanceNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/instanceNoteTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Instance note types', () => {
        let userData;
        const instanceNote1 = { name: getTestEntityValue('SharedInstanceNote1') };
        const instanceNote2 = { name: getTestEntityValue('SharedInstanceNote2') };
        const rowDataToCheck = [instanceNote1.name, 'consortium', moment().format('l'), 'All'];

        before('Create users data', () => {
          cy.getAdminToken()
            .then(() => {
              cy.createTempUser([
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.crudInstanceNoteTypes.gui,
              ]).then((userProperties) => {
                userData = userProperties;
                cy.assignAffiliationToUser(Affiliations.College, userData.userId);
                cy.setTenant(Affiliations.College);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudInstanceNoteTypes.gui,
                ]);
                cy.resetTenant();
                cy.getAdminToken();
                cy.assignAffiliationToUser(Affiliations.University, userData.userId);
                cy.setTenant(Affiliations.University);
                cy.assignPermissionsToExistingUser(userData.userId, [
                  Permissions.crudInstanceNoteTypes.gui,
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
          'C410931 User with "Consortium manager: Can share settings to all members" permission is able to add/delete instance note type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet'] },
          () => {
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            InstanceNoteTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, instanceNote1);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(instanceNote1.name);
            ConfirmShare.clickConfirm();
            InstanceNoteTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(instanceNote1.name, 'All'));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.createViaUi(true, instanceNote2);
            ConsortiaControlledVocabularyPaneset.clickSave();

            ConfirmShare.waitLoadingConfirmShareToAll(instanceNote2.name);
            ConfirmShare.clickKeepEditing();
            InstanceNoteTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.clickCancel();

            ConsortiaControlledVocabularyPaneset.createViaUi(true, instanceNote1);
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });

            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              instanceNote1.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('instance note type', instanceNote1.name);

            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            ConsortiaControlledVocabularyPaneset.performAction(
              instanceNote1.name,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal('instance note type', instanceNote1.name);
            DeleteCancelReason.clickDelete();
            InstanceNoteTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted('instance note type', instanceNote1.name),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(instanceNote1.name);

            cy.visit(SettingsMenu.instanceNoteTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(instanceNote1.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.instanceNoteTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(instanceNote1.name);

            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            cy.visit(SettingsMenu.instanceNoteTypes);
            cy.wait(4000);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(instanceNote1.name);
          },
        );
      });
    });
  });
});
