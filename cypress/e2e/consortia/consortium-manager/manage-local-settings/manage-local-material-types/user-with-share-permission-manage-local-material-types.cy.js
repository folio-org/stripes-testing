import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import MaterialTypesConsortiumManager, {
  MATERIAL_TYPE_ENTITY_TYPE,
} from '../../../../../support/fragments/consortium-manager/inventory/items/materialTypesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import MaterialTypes from '../../../../../support/fragments/settings/inventory/items/materialTypes';
import MaterialTypesSettings from '../../../../../support/fragments/settings/inventory/materialTypes';
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
    describe('Manage local settings', () => {
      describe('Manage local Material types', () => {
        let user;
        let testData;
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
        const capabSetsToAssignCentral = [
          CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
          CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
          CapabilitySets.uiInventorySettingsMaterialTypesView,
        ];
        const capabSetsToAssignMember = [CapabilitySets.uiInventorySettingsMaterialTypesView];
        const allTenantNames = [tenantNames.central, tenantNames.college, tenantNames.university]
          .sort()
          .join(', ');

        before('Create test data', () => {
          const postfix = getRandomPostfix();
          testData = {
            name: `AT_C411424_MaterialType_${postfix}`,
            editedName: `AT_C411424_MaterialType_${postfix}_edited`,
          };

          cy.clearLocalStorage();
          cy.resetTenant();
          cy.getAdminToken();
          cy.createTempUser([]).then((userProperties) => {
            user = userProperties;
            cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssignCentral);

            [Affiliations.College, Affiliations.University].forEach((tenantId) => {
              cy.resetTenant();
              cy.assignAffiliationToUser(tenantId, user.userId);
              cy.setTenant(tenantId);
              cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssignMember);
            });

            cy.resetTenant();
            cy.login(user.username, user.password);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          if (user?.userId) Users.deleteViaApi(user.userId);
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenantId) => {
              cy.setTenant(tenantId);
              MaterialTypesSettings.getMaterialTypesViaApi({
                query: `name=="${testData.name}" or name=="${testData.editedName}"`,
              }).then(({ mtypes }) => {
                mtypes.forEach(({ id }) => MaterialTypesSettings.deleteViaApi(id));
              });
            },
          );
          cy.resetTenant();
        });

        it(
          'C411424 User with "Consortium manager: Can share settings to all members" permission is able to manage local material types of selected affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411424'] },
          () => {
            const lastUpdated = `${todayDate} by ${user.lastName}, ${user.firstName}`;
            const localRow = (name, tenantName) => [name, 'local', lastUpdated, tenantName];

            // Step 1: Open Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.verifyPaneIncludesSettings();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            // Step 2: Open Inventory => Material types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            MaterialTypesConsortiumManager.choose();
            MaterialTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 3: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyNewRowInEditMode();
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 4: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.name });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({ name: testData.name });

            // Step 5: Leave "Share" checkbox unchecked
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 6: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.name, [
              tenantNames.central,
              tenantNames.college,
              tenantNames.university,
            ]);

            // Step 7: Confirm creation
            ConfirmCreate.clickConfirm();
            MaterialTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(testData.name, allTenantNames));
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Steps 8-10: Verify the rows in central, member-1 and member-2 tenants
            [tenantNames.central, tenantNames.college, tenantNames.university].forEach(
              (tenantName) => {
                ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
                  testData.name,
                  tenantName,
                  localRow(testData.name, tenantName),
                  [actionIcons.edit, actionIcons.trash],
                );
              },
            );

            // Step 11: Click "Edit" for the row in central tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.name,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: testData.name,
              source: 'local',
              lastUpdated: [lastUpdated],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 12: Edit the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.editedName });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.editedName,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 13: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.name,
              tenantNames.central,
              localRow(testData.name, tenantNames.central),
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 14: Edit the name for the row in central tenant and click "Save"
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.name,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.editedName });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedName, tenantNames.central),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedName,
              tenantNames.central,
              localRow(testData.editedName, tenantNames.central),
              [actionIcons.edit, actionIcons.trash],
            );
            [tenantNames.college, tenantNames.university].forEach((tenantName) => {
              ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
                testData.name,
                tenantName,
                localRow(testData.name, tenantName),
                [actionIcons.edit, actionIcons.trash],
              );
            });
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 15: Click "Delete" for the row in member-1 tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.name,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(MATERIAL_TYPE_ENTITY_TYPE, testData.name);

            // Step 16: Click "Delete" in the modal
            DeleteCancelReason.clickDelete();
            MaterialTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(MATERIAL_TYPE_ENTITY_TYPE, testData.name),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.name,
              tenantNames.college,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.name,
              tenantNames.university,
              localRow(testData.name, tenantNames.university),
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedName,
              tenantNames.central,
              localRow(testData.editedName, tenantNames.central),
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 17: Verify the edited record in Settings => Inventory => Material types (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.MATERIAL_TYPES);
            MaterialTypes.waitLoading();
            MaterialTypes.verifyLocalMaterialTypesInTheList({
              name: testData.editedName,
              lastUpdated: [lastUpdated],
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 18: Switch to member-1 tenant and verify the record is absent
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.MATERIAL_TYPES);
            MaterialTypes.waitLoading();
            MaterialTypes.verifyMaterialTypesAbsentInTheList({ name: testData.name });

            // Step 19: Switch to member-2 tenant and verify the original record
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.MATERIAL_TYPES);
            MaterialTypes.waitLoading();
            MaterialTypes.verifyLocalMaterialTypesInTheList({
              name: testData.name,
              lastUpdated: [lastUpdated],
              actions: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
