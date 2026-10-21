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
import ContributorTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/contributorTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ContributorTypes from '../../../../../support/fragments/settings/inventory/instances/contributorTypes';
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
      describe('Manage shared Contributor types', () => {
        let user;
        let testData;
        const systemUserName = 'System';
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

        before('Create test data', () => {
          const postfix = getRandomPostfix();
          testData = {
            contributorTypeName: `AT_C411528_ContributorType_${postfix}`,
            contributorTypeCode: `AT_C411528_${postfix}`,
            editedContributorTypeName: `AT_C411528_ContributorType_${postfix}_edited`,
            editedContributorTypeCode: `AT_C411528_${postfix}_edited`,
          };

          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.crudContributorTypes.gui]).then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.Consortia);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.consortiaSettingsConsortiumManagerShare.gui,
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.crudContributorTypes.gui,
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
          ContributorTypes.getViaApi({
            query: `name=="${testData.contributorTypeName}" or name=="${testData.editedContributorTypeName}"`,
          }).then((contributorTypes) => {
            contributorTypes.forEach(({ id, name, code }) => {
              ContributorTypesConsortiumManager.deleteViaApi({
                payload: { name, code, id, source: 'consortium' },
                settingId: id,
                url: '/contributor-types',
              });
            });
          });
        });

        it(
          'C411528 User with "Consortium manager: Can share settings to all members" permission is able to add/edit contributor type shared to all affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411528'] },
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

            // Step 5: Open Inventory => Contributor types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ContributorTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 6: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyNewRowInEditMode({ withCode: true });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 7: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.contributorTypeName,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.contributorTypeName,
            });

            // Step 8: Fill in the code
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.contributorTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              code: testData.contributorTypeCode,
            });

            // Step 9: Check "Share" checkbox
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            // Step 10: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.contributorTypeName);

            // Step 11: Confirm sharing
            ConfirmShare.clickConfirm();
            ConsortiaControlledVocabularyPaneset.waitLoading('Contributor types');
            ConsortiumManagerApp.checkMessage(
              messages.created(testData.contributorTypeName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.contributorTypeName,
                testData.contributorTypeCode,
                'consortium',
                todayDate,
                SHARED_SETTING_LIBRARIES,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 12: Verify in Settings => Inventory => Contributor types (central tenant)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CONTRIBUTOR_TYPES);
            ContributorTypes.waitLoading();
            ContributorTypes.verifyContributorTypeShown({
              name: testData.contributorTypeName,
              code: testData.contributorTypeCode,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 13: Switch to member tenant and verify
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CONTRIBUTOR_TYPES);
            ContributorTypes.waitLoading();
            ContributorTypes.verifyContributorTypeShown({
              name: testData.contributorTypeName,
              code: testData.contributorTypeCode,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 14: Switch back to central tenant and click "Edit" for the shared contributor type
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ContributorTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(
              testData.contributorTypeName,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ContributorTypesConsortiumManager.verifyEditRowInList({
              name: testData.contributorTypeName,
              code: testData.contributorTypeCode,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: true,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 15: Edit the name and code
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.editedContributorTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedContributorTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 16: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.editedContributorTypeName);

            // Step 17: Confirm sharing
            ConfirmShare.clickConfirm();
            ConsortiaControlledVocabularyPaneset.waitLoading('Contributor types');
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedContributorTypeName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.editedContributorTypeName,
                testData.editedContributorTypeCode,
                'consortium',
                todayDate,
                SHARED_SETTING_LIBRARIES,
              ],
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 18: Open "Select members" modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1);

            // Step 19: Uncheck central tenant
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            // Step 20: Save & close the modal
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifySelectedSettingIsDisplayed(settingsItems.inventory);
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            // Step 21: Verify updated values in Settings => Inventory => Contributor types (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CONTRIBUTOR_TYPES);
            ContributorTypes.waitLoading();
            ContributorTypes.verifyContributorTypeShown({
              name: testData.editedContributorTypeName,
              code: testData.editedContributorTypeCode,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 22: Switch to member tenant and verify updated values
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CONTRIBUTOR_TYPES);
            ContributorTypes.waitLoading();
            ContributorTypes.verifyContributorTypeShown({
              name: testData.editedContributorTypeName,
              code: testData.editedContributorTypeCode,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });
          },
        );
      });
    });
  });
});
