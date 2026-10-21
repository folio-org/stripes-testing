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
import HoldingsSourcesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings/holdingsSourcesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import HoldingsSources from '../../../../../support/fragments/settings/inventory/holdings/holdingsSources';
import SettingsPane from '../../../../../support/fragments/settings/settingsPane';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import DateTools from '../../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Holdings sources', () => {
        let user;
        let testData;
        const paneName = 'Holdings sources';
        const systemUserName = 'System';
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

        before('Create test data', () => {
          const postfix = getRandomPostfix();
          testData = {
            holdingsSourceName: `AT_C648476_HoldingsSource_${postfix}`,
            editedHoldingsSourceName: `AT_C648476_HoldingsSource_${postfix}_edited`,
          };

          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.inventoryCRUDHoldingsSources.gui]).then(
            (userProperties) => {
              user = userProperties;

              cy.setTenant(Affiliations.Consortia);
              cy.assignPermissionsToExistingUser(user.userId, [
                Permissions.consortiaSettingsConsortiumManagerShare.gui,
                Permissions.consortiaSettingsConsortiumManagerEdit.gui,
                Permissions.inventoryCRUDHoldingsSources.gui,
              ]);

              cy.resetTenant();
              cy.login(user.username, user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            },
          );
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          if (user?.userId) Users.deleteViaApi(user.userId);
          cy.resetTenant();
          HoldingsSources.getHoldingsSourcesViaApi({
            query: `name=="${testData.holdingsSourceName}" or name=="${testData.editedHoldingsSourceName}"`,
          }).then((holdingsSources) => {
            holdingsSources.forEach(({ id, name }) => {
              HoldingsSourcesConsortiumManager.deleteViaApi({
                payload: { name, id, source: 'consortium' },
                settingId: id,
                url: '/holdings-sources',
              });
            });
          });
        });

        it(
          'C648476 User with "Consortium manager: Can share settings to all members" permission is able to add/edit holdings source shared to all affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C648476'] },
          () => {
            // Step 1: Open Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

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

            // Step 5: Open Inventory => Holdings sources
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsSourcesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.waitLoading(paneName);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 6: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyNewRowInEditMode();
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 7: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.holdingsSourceName,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.holdingsSourceName,
            });

            // Step 8: Check "Share" checkbox
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            // Step 9: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.holdingsSourceName);

            // Step 10: Confirm sharing
            ConfirmShare.clickConfirm();
            ConsortiaControlledVocabularyPaneset.waitLoading(paneName);
            ConsortiumManagerApp.checkMessage(
              messages.created(testData.holdingsSourceName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.holdingsSourceName,
                'consortium',
                `${todayDate} by ${systemUserName}`,
                SHARED_SETTING_LIBRARIES,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 11: Verify in Settings => Inventory => Holdings sources (central tenant)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyConsortiumHoldingsSourcesInTheList({
              name: testData.holdingsSourceName,
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 12: Switch to member tenant and verify
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyConsortiumHoldingsSourcesInTheList({
              name: testData.holdingsSourceName,
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 13: Switch back to central tenant and click "Edit" for the shared holdings source
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            HoldingsSourcesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.waitLoading(paneName);
            ConsortiaControlledVocabularyPaneset.performAction(
              testData.holdingsSourceName,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: testData.holdingsSourceName,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: true,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 14: Edit the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedHoldingsSourceName,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 15: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.editedHoldingsSourceName);

            // Step 16: Confirm sharing
            ConfirmShare.clickConfirm();
            ConsortiaControlledVocabularyPaneset.waitLoading(paneName);
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedHoldingsSourceName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.editedHoldingsSourceName,
                'consortium',
                `${todayDate} by ${systemUserName}`,
                SHARED_SETTING_LIBRARIES,
              ],
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

            // Step 20: Verify updated values in Settings => Inventory => Holdings sources (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyConsortiumHoldingsSourcesInTheList({
              name: testData.editedHoldingsSourceName,
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 21: Switch to member tenant and verify updated values
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            HoldingsSources.open();
            HoldingsSources.verifyConsortiumHoldingsSourcesInTheList({
              name: testData.editedHoldingsSourceName,
              lastUpdated: [todayDate, systemUserName],
            });
          },
        );
      });
    });
  });
});
