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
import HoldingsTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import HoldingsTypes from '../../../../../support/fragments/settings/inventory/holdings/holdingsTypes';
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
      describe('Manage shared Holdings types', () => {
        let user;
        const systemUserName = 'System';
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
        const testData = {
          holdingsTypeName: `AT_C411495_HoldingsType_${getRandomPostfix()}`,
          editedHoldingsTypeName: `AT_C411495_HoldingsType_${getRandomPostfix()}_edited`,
        };

        before('Create test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.inventoryCRUDHoldingsTypes.gui]).then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.Consortia);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.consortiaSettingsConsortiumManagerShare.gui,
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.inventoryCRUDHoldingsTypes.gui,
            ]);

            cy.resetTenant();
            cy.clearLocalStorage();
            cy.login(user.username, user.password);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          if (user?.userId) Users.deleteViaApi(user.userId);
          cy.resetTenant();
          HoldingsTypes.getViaApi({
            query: `name=="${testData.holdingsTypeName}" or name=="${testData.editedHoldingsTypeName}"`,
          }).then((holdingsTypes) => {
            holdingsTypes.forEach(({ id, name }) => {
              HoldingsTypesConsortiumManager.deleteViaApi({
                payload: { name, id, source: 'consortium' },
                settingId: id,
                url: '/holdings-types',
              });
            });
          });
        });

        it(
          'C411495 User with "Consortium manager: Can share settings to all members" permission is able to add/edit holdings type shared to all affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411495'] },
          () => {
            // Step 1: Open Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);

            // Step 2: Open "Select members" modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 3: Uncheck member tenant
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(1);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, true);

            // Step 4: Save & close the modal
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            // Step 5: Open Inventory => Holdings types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 6: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 7: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.holdingsTypeName,
            });

            // Step 8: Check "Share" checkbox
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            // Step 9: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.holdingsTypeName);

            // Step 10: Confirm sharing
            ConfirmShare.clickConfirm();
            ConsortiaControlledVocabularyPaneset.waitLoading('Holdings types');
            ConsortiumManagerApp.checkMessage(
              messages.created(testData.holdingsTypeName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [testData.holdingsTypeName, 'consortium', todayDate, SHARED_SETTING_LIBRARIES],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 11: Verify in Settings => Inventory => Holdings types (central tenant)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyConsortiumHoldingsTypeInTheList({
              name: testData.holdingsTypeName,
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 12: Switch to member tenant and verify
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyConsortiumHoldingsTypeInTheList({
              name: testData.holdingsTypeName,
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 13: Switch back to central tenant and click "Edit" for the shared holdings type
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(
              testData.holdingsTypeName,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: true,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 14: Edit the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedHoldingsTypeName,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 15: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.editedHoldingsTypeName);

            // Step 16: Confirm sharing
            ConfirmShare.clickConfirm();
            ConsortiaControlledVocabularyPaneset.waitLoading('Holdings types');
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedHoldingsTypeName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [testData.editedHoldingsTypeName, 'consortium', todayDate, SHARED_SETTING_LIBRARIES],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 17: Open "Select members" modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1);

            // Step 18: Uncheck central tenant
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            // Step 19: Save & close the modal
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifySelectedSettingIsDisplayed(settingsItems.inventory);
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 20: Verify updated values in Settings => Inventory => Holdings types (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyConsortiumHoldingsTypeInTheList({
              name: testData.editedHoldingsTypeName,
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 21: Switch to member tenant and verify updated values
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.HOLDINGS_TYPES);
            HoldingsTypes.waitLoading();
            HoldingsTypes.verifyConsortiumHoldingsTypeInTheList({
              name: testData.editedHoldingsTypeName,
              lastUpdated: [todayDate, systemUserName],
            });
          },
        );
      });
    });
  });
});
