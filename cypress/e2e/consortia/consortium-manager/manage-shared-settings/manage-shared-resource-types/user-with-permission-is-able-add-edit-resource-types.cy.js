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
import ResourceTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/resourceTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ResourceTypes from '../../../../../support/fragments/settings/inventory/instances/resourceTypes';
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
      describe('Manage shared Resource types', () => {
        let user;
        let testData;
        const systemUserName = 'System';
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');

        before('Create test data', () => {
          const postfix = getRandomPostfix();
          testData = {
            resourceTypeName: `AT_C411570_ResourceType_${postfix}`,
            resourceTypeCode: `AT_C411570_${postfix}`,
            editedResourceTypeName: `AT_C411570_ResourceType_${postfix}_edited`,
            editedResourceTypeCode: `AT_C411570_${postfix}_edited`,
          };

          cy.resetTenant();
          cy.getAdminToken();
          cy.setTenant(Affiliations.College);
          cy.createTempUser([Permissions.crudDefinedResourceTypes.gui]).then((userProperties) => {
            user = userProperties;

            cy.setTenant(Affiliations.Consortia);
            cy.assignPermissionsToExistingUser(user.userId, [
              Permissions.consortiaSettingsConsortiumManagerShare.gui,
              Permissions.consortiaSettingsConsortiumManagerEdit.gui,
              Permissions.crudDefinedResourceTypes.gui,
            ]);

            cy.resetTenant();
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
          ResourceTypes.getViaApi({
            query: `name=="${testData.resourceTypeName}" or name=="${testData.editedResourceTypeName}"`,
          }).then((resourceTypes) => {
            resourceTypes.forEach(({ id, name, code }) => {
              ResourceTypesConsortiumManager.deleteViaApi({
                payload: { name, code, id, source: 'consortium' },
                settingId: id,
                url: '/instance-types',
              });
            });
          });
        });

        it(
          'C411570 User with "Consortium manager: Can share settings to all members" permission is able to add/edit resource type shared to all affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411570'] },
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

            // Step 5: Open Inventory => Resource types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ResourceTypesConsortiumManager.choose();
            ResourceTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 6: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyNewRowInEditMode({ withCode: true });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 7: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              name: testData.resourceTypeName,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.resourceTypeName,
            });

            // Step 8: Fill in the code
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.resourceTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              code: testData.resourceTypeCode,
            });

            // Step 9: Check "Share" checkbox
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            // Step 10: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.resourceTypeName);

            // Step 11: Confirm sharing
            ConfirmShare.clickConfirm();
            ResourceTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.created(testData.resourceTypeName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.resourceTypeName,
                testData.resourceTypeCode,
                'consortium',
                `${todayDate} by ${systemUserName}`,
                SHARED_SETTING_LIBRARIES,
              ],
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 12: Verify in Settings => Inventory => Resource types (central tenant)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.RESOURCE_TYPES);
            ResourceTypes.waitLoading();
            ResourceTypes.verifyResourceTypeShown({
              name: testData.resourceTypeName,
              code: testData.resourceTypeCode,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 13: Switch to member tenant and verify
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.RESOURCE_TYPES);
            ResourceTypes.waitLoading();
            ResourceTypes.verifyResourceTypeShown({
              name: testData.resourceTypeName,
              code: testData.resourceTypeCode,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 14: Switch back to central tenant and click "Edit" for the shared resource type
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ResourceTypesConsortiumManager.choose();
            ResourceTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.performAction(
              testData.resourceTypeName,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: testData.resourceTypeName,
              code: testData.resourceTypeCode,
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
              name: testData.editedResourceTypeName,
            });
            ConsortiaControlledVocabularyPaneset.fillInTextField({
              code: testData.editedResourceTypeCode,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 16: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(testData.editedResourceTypeName);

            // Step 17: Confirm sharing
            ConfirmShare.clickConfirm();
            ResourceTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedResourceTypeName, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [
                testData.editedResourceTypeName,
                testData.editedResourceTypeCode,
                'consortium',
                `${todayDate} by ${systemUserName}`,
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

            // Step 21: Verify updated values in Settings => Inventory => Resource types (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.RESOURCE_TYPES);
            ResourceTypes.waitLoading();
            ResourceTypes.verifyResourceTypeShown({
              name: testData.editedResourceTypeName,
              code: testData.editedResourceTypeCode,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });

            // Step 22: Switch to member tenant and verify updated values
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.RESOURCE_TYPES);
            ResourceTypes.waitLoading();
            ResourceTypes.verifyResourceTypeShown({
              name: testData.editedResourceTypeName,
              code: testData.editedResourceTypeCode,
              source: 'consortium',
              lastUpdated: [todayDate, systemUserName],
            });
          },
        );
      });
    });
  });
});
