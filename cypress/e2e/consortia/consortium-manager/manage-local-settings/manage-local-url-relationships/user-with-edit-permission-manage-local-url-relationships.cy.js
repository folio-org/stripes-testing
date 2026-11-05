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
import UrlRelationshipConsortiumManager, {
  URL_RELATIONSHIP_ENTITY_TYPE,
} from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/urlRelationshipConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import UrlRelationship from '../../../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
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
      describe('Manage local URL relationship', () => {
        let user;
        let testData;
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
        const capabSetsToAssignCentral = [
          CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
          CapabilitySets.uiInventorySettingsElectronicAccessRelationshipsView,
        ];
        const capabSetsToAssignMember = [
          CapabilitySets.uiInventorySettingsElectronicAccessRelationshipsView,
        ];
        const allTenantNames = [tenantNames.central, tenantNames.college, tenantNames.university]
          .sort()
          .join(', ');

        before('Create test data', () => {
          const postfix = getRandomPostfix();
          testData = {
            name: `AT_C411367_UrlRelationship_${postfix}`,
            editedName: `AT_C411367_UrlRelationshipEdited_${postfix}`,
            secondName: `AT_C411367_UrlRelationshipSecond_${postfix}`,
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
              UrlRelationship.getViaApi({
                query: `name=="${testData.name}" or name=="${testData.editedName}" or name=="${testData.secondName}"`,
              }).then((urlRelationships) => {
                urlRelationships.forEach(({ id }) => UrlRelationship.deleteViaApi(id));
              });
            },
          );
        });

        it(
          'C411367 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local URL relationship of selected affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411367'] },
          () => {
            const localRow = (name, tenantName) => [
              name,
              'local',
              `${todayDate} by ${user.lastName}`,
              tenantName,
            ];

            // Step 1: Open Consortium manager app and select all members
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.verifyPaneIncludesSettings();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            // Step 2: Open Inventory => URL relationship
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            UrlRelationshipConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 3: Click "New"
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

            // Step 4: Fill in the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.name });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({ name: testData.name });

            // Step 5: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.name, [
              tenantNames.central,
              tenantNames.college,
              tenantNames.university,
            ]);

            // Step 6: Confirm creation
            ConfirmCreate.clickConfirm();
            UrlRelationshipConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(testData.name, allTenantNames));
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Steps 7-9: Verify the rows in central, member-1 and member-2 tenants
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

            // Step 10: Click "Edit" for the row in member-2 tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.name,
              tenantNames.university,
              actionIcons.edit,
            );
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: testData.name,
              source: 'local',
              lastUpdated: [todayDate, user.lastName],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 11: Edit the name
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: testData.editedName });
            ConsortiaControlledVocabularyPaneset.verifyFilledInTextField({
              name: testData.editedName,
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 12: Click "Save"
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiumManagerApp.checkMessage(
              messages.updated(testData.editedName, tenantNames.university),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedName,
              tenantNames.university,
              localRow(testData.editedName, tenantNames.university),
              [actionIcons.edit, actionIcons.trash],
            );
            [tenantNames.central, tenantNames.college].forEach((tenantName) => {
              ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
                testData.name,
                tenantName,
                localRow(testData.name, tenantName),
                [actionIcons.edit, actionIcons.trash],
              );
            });
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 13: Click "Delete" for the row in member-1 tenant
            ConsortiaControlledVocabularyPaneset.performActionFor(
              testData.name,
              tenantNames.college,
              actionIcons.trash,
            );
            DeleteCancelReason.waitLoadingDeleteModal(URL_RELATIONSHIP_ENTITY_TYPE, testData.name);

            // Step 14: Click "Delete" in the modal
            DeleteCancelReason.clickDelete();
            UrlRelationshipConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(URL_RELATIONSHIP_ENTITY_TYPE, testData.name),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.name,
              tenantNames.college,
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.editedName,
              tenantNames.university,
              localRow(testData.editedName, tenantNames.university),
              [actionIcons.edit, actionIcons.trash],
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordIsInTheList(
              testData.name,
              tenantNames.central,
              localRow(testData.name, tenantNames.central),
              [actionIcons.edit, actionIcons.trash],
            );

            // Step 15: Create new record and click "Keep editing" in the modal
            ConsortiaControlledVocabularyPaneset.createViaUi(false, { name: testData.secondName });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmCreate.waitLoadingConfirmCreate(testData.secondName);
            ConfirmCreate.clickKeepEditing();
            UrlRelationshipConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: testData.secondName,
              source: 'local',
              lastUpdated: ['-'],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 16: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(testData.secondName);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 17: Create new record with not unique name
            ConsortiaControlledVocabularyPaneset.createViaUi(false, { name: testData.name });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();

            // Step 18: Click "Cancel"
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordHasNoDuplicatesInTheList(
              testData.name,
            );
            [tenantNames.college, tenantNames.university].forEach((tenantName) => {
              ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
                testData.name,
                tenantName,
              );
            });
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 19: Verify the record in Settings => Inventory => URL relationship (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.URL_RELATIONSHIP);
            UrlRelationship.waitloading();
            UrlRelationship.verifyUrlRelationshipShown({
              name: testData.name,
              source: 'local',
              lastUpdated: [todayDate, user.lastName],
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 20: Switch to member-1 tenant and verify the record is absent
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.URL_RELATIONSHIP);
            UrlRelationship.waitloading();
            UrlRelationship.verifyUrlRelationshipAbsentInTheList({ name: testData.name });

            // Step 21: Switch to member-2 tenant and verify the edited record
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.URL_RELATIONSHIP);
            UrlRelationship.waitloading();
            UrlRelationship.verifyUrlRelationshipShown({
              name: testData.editedName,
              source: 'local',
              lastUpdated: [todayDate, user.lastName],
              actions: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
