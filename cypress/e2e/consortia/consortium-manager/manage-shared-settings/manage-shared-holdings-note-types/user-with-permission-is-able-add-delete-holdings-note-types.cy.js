import moment from 'moment';
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
import HoldingsNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsNoteTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import HoldingsNoteTypes from '../../../../../support/fragments/settings/inventory/holdings/holdingsNoteTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Holdings note types', () => {
        let user;
        let testData;
        let sharedNoteTypeRow;
        const deleteModalSettingName = 'holdings note type';
        const systemUserName = 'System';

        before('Create test data', () => {
          testData = {
            sharedNoteTypeName: `AT_C411472_HoldingsNoteType_Shared_${getRandomPostfix()}`,
            cancelledNoteTypeName: `AT_C411472_HoldingsNoteType_Cancelled_${getRandomPostfix()}`,
          };
          sharedNoteTypeRow = [
            testData.sharedNoteTypeName,
            'consortium',
            moment().format('l'),
            SHARED_SETTING_LIBRARIES,
          ];

          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.inventoryCRUDHoldingsNoteTypes.gui,
          ]).then((userProperties) => {
            user = userProperties;

            [Affiliations.College, Affiliations.University].forEach((tenantId) => {
              cy.affiliateUserToTenant({
                tenantId,
                userId: user.userId,
                permissions: [Permissions.inventoryCRUDHoldingsNoteTypes.gui],
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
          InventoryInstances.getHoldingsNotesTypes({
            query: `name=="${testData.sharedNoteTypeName}"`,
          }).then((noteTypes) => {
            noteTypes.forEach(({ id, name }) => {
              HoldingsNoteTypesConsortiumManager.deleteViaApi({
                payload: { name, id, source: 'consortium' },
                settingId: id,
                url: '/holdings-note-types',
              });
            });
          });
        });

        it(
          'C411472 User with "Consortium manager: Can share settings to all members" permission is able to add/delete holdings note type shared to all affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411472'] },
          () => {
            // Step 1: Open Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            // Step 2: Open Inventory => Holdings note types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsNoteTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 3: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyNewRowInEditMode();
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 4: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.sharedNoteTypeName,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.sharedNoteTypeName,
            });

            // Step 5: Check "Share" checkbox
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            // Step 6: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.sharedNoteTypeName);

            // Step 7: Confirm sharing
            ConfirmShare.clickConfirm();
            ConsortiaControlledVocabularyPaneset.waitLoading('Holdings note types');
            ConsortiumManagerApp.checkMessage(
              messages.created(testData.sharedNoteTypeName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(sharedNoteTypeRow, [
              actionIcons.edit,
              actionIcons.trash,
            ]);
            ConsortiaControlledVocabularyPaneset.verifyLastUpdatedInTheList(
              testData.sharedNoteTypeName,
              [systemUserName],
            );

            // Step 8: Create a new shared record and click "Save"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.cancelledNoteTypeName,
            });
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.cancelledNoteTypeName);

            // Step 9: Click "Keep editing"
            ConfirmShare.clickKeepEditing();
            ConsortiaControlledVocabularyPaneset.waitLoading('Holdings note types');
            ConsortiaControlledVocabularyPaneset.verifyNewRowInEditMode({
              name: testData.cancelledNoteTypeName,
              isShared: true,
            });

            // Step 10: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.cancelledNoteTypeName,
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 11: Create a record with a non-unique name and click "Save"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.sharedNoteTypeName,
            });
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });

            // Step 12: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();
            ConsortiaControlledVocabularyPaneset.verifyRecordHasNoDuplicatesInTheList(
              testData.sharedNoteTypeName,
            );

            // Step 13: Click "Delete" icon for the shared holdings note type
            ConsortiaControlledVocabularyPaneset.performAction(
              testData.sharedNoteTypeName,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              deleteModalSettingName,
              testData.sharedNoteTypeName,
            );

            // Step 14: Click "Cancel" in the delete modal
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(sharedNoteTypeRow, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            // Step 15: Delete the holdings note type
            ConsortiaControlledVocabularyPaneset.performAction(
              testData.sharedNoteTypeName,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              deleteModalSettingName,
              testData.sharedNoteTypeName,
            );
            DeleteCancelReason.clickDelete();
            ConsortiaControlledVocabularyPaneset.waitLoading('Holdings note types');
            ConsortiumManagerApp.checkMessage(
              messages.deleted(deleteModalSettingName, testData.sharedNoteTypeName),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(
              testData.sharedNoteTypeName,
            );
            // wait for the deletion of the shared record to propagate to the member tenants
            cy.wait(3000);

            // Step 16: Verify the record is absent in Settings => Inventory => Holdings note types (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_NOTE_TYPES);
            HoldingsNoteTypes.waitLoading();
            HoldingsNoteTypes.verifyHoldingsNoteTypesAbsentInTheList({
              name: testData.sharedNoteTypeName,
            });

            // Step 17: Switch to member-1 tenant and verify the record is absent
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_NOTE_TYPES);
            HoldingsNoteTypes.waitLoading();
            HoldingsNoteTypes.verifyHoldingsNoteTypesAbsentInTheList({
              name: testData.sharedNoteTypeName,
            });

            // Step 18: Switch to member-2 tenant and verify the record is absent
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_NOTE_TYPES);
            HoldingsNoteTypes.waitLoading();
            HoldingsNoteTypes.verifyHoldingsNoteTypesAbsentInTheList({
              name: testData.sharedNoteTypeName,
            });
          },
        );
      });
    });
  });
});
