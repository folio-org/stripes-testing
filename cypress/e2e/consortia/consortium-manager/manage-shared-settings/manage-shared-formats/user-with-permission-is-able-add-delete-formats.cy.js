import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  SHARED_SETTING_LIBRARIES,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import FormatsConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/formatsConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import Formats from '../../../../../support/fragments/settings/inventory/instances/formats';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import DateTools from '../../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Formats', () => {
        let user;
        let testData;
        let sharedFormatRow;
        const deleteModalSettingName = 'format';
        const systemUserName = 'System';
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

        before('Create test data', () => {
          testData = {
            sharedName: `AT_C410732_Format_Shared_${getRandomPostfix()}`,
            sharedCode: `AT_C410732_Shared_${getRandomPostfix()}`,
            cancelledName: `AT_C410732_Format_Cancelled_${getRandomPostfix()}`,
            cancelledCode: `AT_C410732_Cancelled_${getRandomPostfix()}`,
          };
          sharedFormatRow = [
            testData.sharedName,
            testData.sharedCode,
            'consortium',
            todayDate,
            SHARED_SETTING_LIBRARIES,
          ];

          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.crudFormats.gui,
          ]).then((userProperties) => {
            user = userProperties;

            [Affiliations.College, Affiliations.University].forEach((tenantId) => {
              cy.affiliateUserToTenant({
                tenantId,
                userId: user.userId,
                permissions: [Permissions.crudFormats.gui],
              });
            });

            cy.clearLocalStorage();
            cy.login(user.username, user.password);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          if (user?.userId) Users.deleteViaApi(user.userId);
          Formats.getViaApi({
            query: `name=="${testData.sharedName}" or name=="${testData.cancelledName}"`,
          }).then((formats) => {
            formats.forEach(({ id, name, code }) => {
              FormatsConsortiumManager.deleteViaApi({
                payload: { name, code, id, source: 'consortium' },
                settingId: id,
                url: '/instance-formats',
              });
            });
          });
        });

        it(
          'C410732 User with "Consortium manager: Can share settings to all members" permission is able to add/delete format shared to all affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C410732'] },
          () => {
            // Step 1: Open Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            // Step 2: Open Inventory => Formats
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            FormatsConsortiumManager.choose();
            FormatsConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 3: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyNewRowInEditMode({ withCode: true });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 4: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.sharedName });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.sharedName,
            });

            // Step 5: Fill in the code
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: testData.sharedCode });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              code: testData.sharedCode,
            });

            // Step 6: Check "Share" checkbox
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            // Step 7: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.sharedName);

            // Step 8: Confirm sharing
            ConfirmShare.clickConfirm();
            FormatsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.created(testData.sharedName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(sharedFormatRow, [
              actionIcons.edit,
              actionIcons.trash,
            ]);
            ConsortiaControlledVocabularyPaneset.verifyLastUpdatedInTheList(testData.sharedName, [
              systemUserName,
            ]);

            // Step 9: Create a new shared record and click "Save"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.cancelledName });
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: testData.cancelledCode });
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.cancelledName);

            // Step 10: Click "Keep editing"
            ConfirmShare.clickKeepEditing();
            FormatsConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyNewRowInEditMode({
              name: testData.cancelledName,
              isShared: true,
              withCode: true,
            });

            // Step 11: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(testData.cancelledName);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 12: Create a record with non-unique name and code and click "Save"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.sharedName });
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: testData.sharedCode });
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              code: messages.notUnique('Code'),
            });

            // Step 13: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();
            ConsortiaControlledVocabularyPaneset.verifyRecordHasNoDuplicatesInTheList(
              testData.sharedName,
            );

            // Step 14: Click "Delete" icon for the shared format
            ConsortiaControlledVocabularyPaneset.performAction(
              testData.sharedName,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(deleteModalSettingName, testData.sharedName);

            // Step 15: Click "Cancel" in the delete modal
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(sharedFormatRow, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            // Step 16: Delete the format
            ConsortiaControlledVocabularyPaneset.performAction(
              testData.sharedName,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(deleteModalSettingName, testData.sharedName);
            DeleteCancelReason.clickDelete();
            FormatsConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(deleteModalSettingName, testData.sharedName),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(testData.sharedName);
            // wait for the deletion of the shared record to propagate to the member tenants
            cy.wait(3000);

            // Step 17: Verify the record is absent in Settings => Inventory => Formats (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FORMATS);
            Formats.waitLoading();
            Formats.verifyFormatsAbsentInTheList({ name: testData.sharedName });

            // Step 18: Switch to member-1 tenant and verify the record is absent
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FORMATS);
            Formats.waitLoading();
            Formats.verifyFormatsAbsentInTheList({ name: testData.sharedName });

            // Step 19: Switch to member-2 tenant and verify the record is absent
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.FORMATS);
            Formats.waitLoading();
            Formats.verifyFormatsAbsentInTheList({ name: testData.sharedName });
          },
        );
      });
    });
  });
});
