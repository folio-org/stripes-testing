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
import LoanTypesConsortiumManager, {
  LOAN_TYPE_ENTITY_TYPE,
} from '../../../../../support/fragments/consortium-manager/inventory/items/loanTypesConsortiumManager';
import ConfirmCreate from '../../../../../support/fragments/consortium-manager/modal/confirm-create';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import LoanTypes from '../../../../../support/fragments/settings/inventory/items/loanTypes';
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
      describe('Manage local Loan types', () => {
        let user;
        let testData;
        const todayDate = DateTools.getFormattedDate({ date: new Date() }, 'M/D/YYYY');
        const capabSetsToAssignCentral = [
          CapabilitySets.uiConsortiaSettingsConsortiumManagerEdit,
          CapabilitySets.uiInventorySettingsLoanTypesView,
        ];
        const capabSetsToAssignMember = [CapabilitySets.uiInventorySettingsLoanTypesView];
        const allTenantNames = [tenantNames.central, tenantNames.college, tenantNames.university]
          .sort()
          .join(', ');

        before('Create test data', () => {
          const postfix = getRandomPostfix();
          testData = {
            name: `AT_C411778_LoanType_${postfix}`,
            editedName: `AT_C411778_LoanType_${postfix}_edited`,
            secondName: `AT_C411778_LoanType_${postfix}_second`,
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
              cy.getLoanTypes({
                query: `name=="${testData.name}" or name=="${testData.editedName}" or name=="${testData.secondName}"`,
              }).then((loanTypes) => {
                loanTypes.forEach(({ id }) => cy.deleteLoanType(id, true));
              });
            },
          );
          cy.resetTenant();
        });

        it(
          'C411778 User with "Consortium manager: Can create, edit and remove settings" permission is able to manage local loan types of selected affiliated tenants in "Consortium manager" app (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411778'] },
          () => {
            const localRow = (name, tenantName) => [
              name,
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

            // Step 2: Open Inventory => Loan types
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            LoanTypesConsortiumManager.choose();
            LoanTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            // Step 3: Click "New"
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: '',
              lastUpdated: ['-'],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 4: Fill in the loan type name
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
            LoanTypesConsortiumManager.waitLoading();
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
              lastUpdated: [todayDate, user.lastName],
            });
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: false,
              isChecked: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            // Step 11: Edit the loan type name
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
            DeleteCancelReason.waitLoadingDeleteModal(LOAN_TYPE_ENTITY_TYPE, testData.name);

            // Step 14: Click "Delete" in the modal
            DeleteCancelReason.clickDelete();
            LoanTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(LOAN_TYPE_ENTITY_TYPE, testData.name),
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
            LoanTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyEditRowInList({
              name: testData.secondName,
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
            ConsortiaControlledVocabularyPaneset.verifyRecordIsNotInTheList(
              testData.name,
              tenantNames.college,
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            // Step 19: Verify the record in Settings => Inventory => Loan types (central)
            TopMenuNavigation.navigateToApp(
              APPLICATION_NAMES.SETTINGS,
              APPLICATION_NAMES.INVENTORY,
            );
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.LOAN_TYPES);
            LoanTypes.waitLoading();
            LoanTypes.verifyLoanTypesInTheList({
              name: testData.name,
              lastUpdated: [todayDate, user.lastName],
              actions: [actionIcons.edit, actionIcons.trash],
            });

            // Step 20: Switch to member-1 tenant and verify the record is absent
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.LOAN_TYPES);
            LoanTypes.waitLoading();
            LoanTypes.verifyLoanTypesAbsentInTheList({ name: testData.name });

            // Step 21: Switch to member-2 tenant and verify the edited record
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsPane.waitLoading();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.LOAN_TYPES);
            LoanTypes.waitLoading();
            LoanTypes.verifyLoanTypesInTheList({
              name: testData.editedName,
              lastUpdated: [todayDate, user.lastName],
              actions: [actionIcons.edit, actionIcons.trash],
            });
          },
        );
      });
    });
  });
});
