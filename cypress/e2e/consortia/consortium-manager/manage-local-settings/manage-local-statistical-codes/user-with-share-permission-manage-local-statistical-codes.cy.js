import { APPLICATION_NAMES, INVENTORY_RECORD_SOURCE } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import CapabilitySets from '../../../../../support/dictionary/capabilitySets';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import StatisticalCodeTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodeTypesConsortiumManager';
import StatisticalCodesConsortiumManager, {
  STATISTICAL_CODE_ENTITY_TYPE,
  STATISTICAL_CODE_TYPE_PLACEHOLDER,
} from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import StatisticalCodes from '../../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
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
      describe('Manage local Statistical codes', () => {
        let user;
        let testData;
        let sharedCodeType;
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
        const capabSetsToAssignCentral = [
          CapabilitySets.uiConsortiaSettingsConsortiumManagerShare,
          CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
          CapabilitySets.uiInventorySettingsStatisticalCodeTypesView,
          CapabilitySets.uiInventorySettingsStatisticalCodesView,
        ];
        const capabSetsToAssignMember = [
          CapabilitySets.uiInventorySettingsStatisticalCodeTypesView,
          CapabilitySets.uiInventorySettingsStatisticalCodesView,
        ];
        const allTenantNames = [tenantNames.central, tenantNames.college, tenantNames.university]
          .sort()
          .join(', ');

        before('Create test data', () => {
          const postfix = getRandomPostfix();
          testData = {
            codeTypeName: `AT_C411603_SharedStatisticalCodeType_${postfix}`,
            code: `AT_C411603_SC_${postfix}`,
            name: `AT_C411603_StatisticalCode_${postfix}`,
            editedName: `AT_C411603_StatisticalCode_${postfix}_edited`,
          };

          cy.clearLocalStorage();
          cy.resetTenant();
          cy.getAdminToken();
          StatisticalCodeTypesConsortiumManager.createSharedViaApi({
            name: testData.codeTypeName,
          }).then((codeType) => {
            sharedCodeType = codeType;
          });
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
          if (sharedCodeType) {
            StatisticalCodeTypesConsortiumManager.deleteSharedViaApi(sharedCodeType);
          }
          [Affiliations.Consortia, Affiliations.College, Affiliations.University].forEach(
            (tenantId) => {
              cy.setTenant(tenantId);
              cy.getStatisticalCodes({ query: `code=="${testData.code}"` }).then(
                (statisticalCodes) => {
                  statisticalCodes.forEach(({ id }) => StatisticalCodes.deleteViaApi(id));
                },
              );
            },
          );
        });

        it(
          'C411603 User with "Consortium manager: Can share settings to all members" permission is able to manage local statistical codes of selected affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411603'] },
          () => {
            const localRow = (name, tenantName) => [
              testData.code,
              name,
              testData.codeTypeName,
              INVENTORY_RECORD_SOURCE.LOCAL,
              `${todayDate} by ${user.lastName}`,
              tenantName,
            ];
            const settingsRow = (name) => ({
              code: testData.code,
              name,
              type: testData.codeTypeName,
              lastUpdated: [todayDate, user.lastName],
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 1: Open Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.verifyPaneIncludesSettings();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            // Step 2: Open Inventory => Statistical codes
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            StatisticalCodesConsortiumManager.choose();
            StatisticalCodesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 3: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyNewRowInEditMode({ withCode: true });
            StatisticalCodesConsortiumManager.verifyStatisticalCodeTypeSelected(
              STATISTICAL_CODE_TYPE_PLACEHOLDER,
            );
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 4: Fill in the code
            ConsortiaControlledVocabularyPaneset.fillInTextField({ code: testData.code });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({ code: testData.code });

            // Step 5: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.name });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({ name: testData.name });

            // Step 6: Select the statistical code type
            StatisticalCodesConsortiumManager.selectStatisticalCodeType(testData.codeTypeName);
            StatisticalCodesConsortiumManager.verifyStatisticalCodeTypeSelected(
              testData.codeTypeName,
            );

            // Step 7: Leave "Share" checkbox unchecked
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            // Step 8: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.code, [
              tenantNames.central,
              tenantNames.college,
              tenantNames.university,
            ]);

            // Step 9: Confirm creation
            ConfirmCreate.clickConfirm();
            StatisticalCodesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(testData.code, allTenantNames));
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Steps 10-12: Verify the rows in central, member-1 and member-2 tenants
            [tenantNames.central, tenantNames.college, tenantNames.university].forEach(
              (tenantName) => {
                ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
                  testData.code,
                  tenantName,
                  localRow(testData.name, tenantName),
                  [actionIcons.edit, actionIcons.trash],
                );
              },
            );

            // Step 13: Click "Edit" for the row in central tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.code,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: testData.name,
              code: testData.code,
              source: INVENTORY_RECORD_SOURCE.LOCAL,
              lastUpdated: [todayDate, user.lastName],
            });
            StatisticalCodesConsortiumManager.verifyStatisticalCodeTypeSelected(
              testData.codeTypeName,
            );
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 14: Edit the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.editedName });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.editedName,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 15: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.code,
              tenantNames.central,
              localRow(testData.name, tenantNames.central),
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 16: Edit the name for the row in central tenant and click "Save"
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.code,
              tenantNames.central,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.editedName });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(messages.updated(testData.code, tenantNames.central));
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.code,
              tenantNames.central,
              localRow(testData.editedName, tenantNames.central),
              [actionIcons.edit, actionIcons.trash],
            );
            [tenantNames.college, tenantNames.university].forEach((tenantName) => {
              ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
                testData.code,
                tenantName,
                localRow(testData.name, tenantName),
                [actionIcons.edit, actionIcons.trash],
              );
            });
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 17: Click "Delete" for the row in member-1 tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.code,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(STATISTICAL_CODE_ENTITY_TYPE, testData.code);

            // Step 18: Click "Delete" in the modal
            DeleteCancelReason.clickDelete();
            StatisticalCodesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(STATISTICAL_CODE_ENTITY_TYPE, testData.code),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.code,
              tenantNames.college,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.code,
              tenantNames.university,
              localRow(testData.name, tenantNames.university),
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.code,
              tenantNames.central,
              localRow(testData.editedName, tenantNames.central),
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 19: Verify the edited record in Settings => Inventory => Statistical codes (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.waitLoading();
            StatisticalCodes.verifyLocalStatisticalCodeInTheList(settingsRow(testData.editedName));

            // Step 20: Switch to member-1 tenant and verify the record is absent
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.waitLoading();
            StatisticalCodes.verifyStatisticalCodesAbsentInTheList({ code: testData.code });

            // Step 21: Switch to member-2 tenant and verify the original record
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.waitLoading();
            StatisticalCodes.verifyLocalStatisticalCodeInTheList(settingsRow(testData.name));
          },
        );
      });
    });
  });
});
