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
import CallNumberTypesConsortiumManager, {
  CALL_NUMBER_TYPE_ENTITY_TYPE,
} from '../../../../../support/fragments/consortium-manager/inventory/holdings-items/callNumberTypesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { CallNumberTypes } from '../../../../../support/fragments/settings/inventory/instances/callNumberTypes';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import DateTools from '../../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage local settings', () => {
      describe('Manage local Call number types', () => {
        let user;
        let testData;
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
        const capabSetsToAssignCentral = [
          CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
          CapabilitySets.uiInventorySettingsCallNumberTypesView,
        ];
        const capabSetsToAssignMember = [CapabilitySets.uiInventorySettingsCallNumberTypesView];

        before('Create test data', () => {
          const postfix = getRandomPostfix();
          testData = {
            name: `AT_C411400_CallNumberType_${postfix}`,
            editedName: `AT_C411400_CallNumberType_${postfix}_edited`,
          };

          cy.clearLocalStorage();
          cy.resetTenant();
          cy.getAdminToken();
          // User is created in member-1 tenant and gets central affiliation automatically
          cy.setTenant(Affiliations.College);
          cy.createTempUser([]).then((userProperties) => {
            user = userProperties;
            cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssignMember);

            cy.resetTenant();
            cy.assignCapabilitiesToExistingUser(user.userId, [], capabSetsToAssignCentral);

            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password);
              ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
              ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            }, 20_000);
          });
        });

        after('Delete test data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          [Affiliations.Consortia, Affiliations.College].forEach((tenantId) => {
            cy.setTenant(tenantId);
            CallNumberTypes.deleteCallNumberTypesLike(testData.name);
          });
          cy.setTenant(Affiliations.College);
          if (user?.userId) Users.deleteViaApi(user.userId);
          cy.resetTenant();
        });

        it(
          'C411400 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local call number types of selected affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411400'] },
          () => {
            const localRow = (name) => [
              name,
              'local',
              `${todayDate} by ${user.lastName}, ${user.firstName}`,
              tenantNames.college,
            ];

            // Step 1: Open Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.verifyPaneIncludesSettings();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            // Step 2: Open "Select members" modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            // Step 3: Uncheck central tenant
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(1);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, true);

            // Step 4: Save member selection
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            // Step 5: Open Inventory => Call number types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            CallNumberTypesConsortiumManager.choose();
            CallNumberTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 6: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: '',
              source: 'local',
              lastUpdated: ['-'],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 7: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.name });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({ name: testData.name });

            // Step 8: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.name, [tenantNames.college]);

            // Step 9: Click "Keep editing"
            ConfirmCreate.clickKeepEditing();
            CallNumberTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: testData.name,
              source: 'local',
              lastUpdated: ['-'],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 10: Click "Save" and confirm creation
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.name, [tenantNames.college]);
            ConfirmCreate.clickConfirm();
            CallNumberTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(testData.name, tenantNames.college));
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.name,
              tenantNames.central,
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 11: Verify the row in member tenant
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.name,
              tenantNames.college,
              localRow(testData.name),
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 12: Click "Edit" for the row in member tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.name,
              tenantNames.college,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: testData.name,
              source: 'local',
              lastUpdated: [`${todayDate} by ${user.lastName}, ${user.firstName}`],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 13: Edit the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.editedName });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.editedName,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 14: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedName, tenantNames.college),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedName,
              tenantNames.college,
              localRow(testData.editedName),
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 15: Click "Delete" for the edited row
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.editedName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              CALL_NUMBER_TYPE_ENTITY_TYPE,
              testData.editedName,
            );

            // Step 16: Click "Cancel" in the modal
            DeleteCancelReason.clickCancel();
            CallNumberTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedName,
              tenantNames.college,
              localRow(testData.editedName),
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 17: Click "Delete" and confirm deletion
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.editedName,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(
              CALL_NUMBER_TYPE_ENTITY_TYPE,
              testData.editedName,
            );
            DeleteCancelReason.clickDelete();
            CallNumberTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(CALL_NUMBER_TYPE_ENTITY_TYPE, testData.editedName),
            );
            cy.wait(3000);
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.editedName,
              tenantNames.college,
            );

            // Step 18: Open "Select members" modal
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);

            // Step 19: Uncheck member tenant
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            // Step 20: Save member selection and verify the empty list
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifySettingsItemIsSelected(settingsItems.inventory);
            ConsortiumManagerApp.verifySelectedSettingIsDisplayed(settingsItems.inventory);
            CallNumberTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.verifyMembersSelected(0);
            ConsortiumManagerApp.verifySelectMembersButton();
            ConsortiumManagerApp.verifyListIsEmpty();
          },
        );
      });
    });
  });
});
