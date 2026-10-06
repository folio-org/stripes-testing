import { APPLICATION_NAMES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
  SHARED_SETTING_LIBRARIES,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import LoanTypesConsortiumManager, {
  LOAN_TYPE_ENTITY_TYPE,
} from '../../../../../support/fragments/consortium-manager/inventory/items/loanTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import LoanTypes from '../../../../../support/fragments/settings/inventory/items/loanTypes';
import SettingsInventory, {
  INVENTORY_SETTINGS_TABS,
} from '../../../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../../../support/utils';
import { formatIntlDateTime } from '../../../../../support/utils/acquisitions';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

const R = {
  USER: 'user',
  LOCALE: 'locale',
};

const NAME_FIELD = 'name';
const NAME_FIELD_LABEL = 'Name';

const LT_NAME_1 = getTestEntityValue('SharedLoanType1');
const LT_NAME_2 = getTestEntityValue('SharedLoanType2');

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Loan types', () => {
        const flow = new ExecutionFlowManager();

        before('Create C411587 preconditions', () => {
          cy.getAdminToken();
          cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

          const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

          flow.step(steps.createAndConfigureUser).step(steps.loginAsConfiguredUser);
        });

        after('Delete C411587 data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          flow.cleanup();
        });

        it(
          'C411587 User with "Consortium manager: Can share settings to all members" permission is able to add/delete loan type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411587'] },
          () => {
            const { locale } = flow.ctx();
            const rowDataToCheck = [
              LT_NAME_1,
              formatIntlDateTime(locale, new Date()),
              SHARED_SETTING_LIBRARIES,
            ];

            cy.log('<--- STEP 1 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            cy.log('<--- STEP 2 --->');
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            LoanTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            cy.log('<--- STEP 3 --->');
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            cy.log('<--- STEP 4 --->');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [NAME_FIELD]: LT_NAME_1 });

            cy.log('<--- STEP 5 --->');
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 6 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(LT_NAME_1);

            cy.log('<--- STEP 7 --->');
            ConfirmShare.clickConfirm();
            LoanTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.created(LT_NAME_1, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 8 --->');
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [NAME_FIELD]: LT_NAME_2 });
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(LT_NAME_2);

            cy.log('<--- STEP 9 --->');
            ConfirmShare.clickKeepEditing();
            LoanTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 10 --->');
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(LT_NAME_2);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            cy.log('<--- STEP 11 --->');
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [NAME_FIELD]: LT_NAME_1 });
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              [NAME_FIELD]: messages.notUnique(NAME_FIELD_LABEL),
            });

            cy.log('<--- STEP 12 --->');
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 13 --->');
            ConsortiaControlledVocabularyPaneset.performAction(LT_NAME_1, actionIcons.trash);
            DeleteCancelReason.waitLoadingDeleteModal(LOAN_TYPE_ENTITY_TYPE, LT_NAME_1);

            cy.log('<--- STEP 14 --->');
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 15 --->');
            ConsortiaControlledVocabularyPaneset.performAction(LT_NAME_1, actionIcons.trash);
            DeleteCancelReason.waitLoadingDeleteModal(LOAN_TYPE_ENTITY_TYPE, LT_NAME_1);
            DeleteCancelReason.clickDelete();
            LoanTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.deleted(LOAN_TYPE_ENTITY_TYPE, LT_NAME_1));
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(LT_NAME_1);

            cy.log('<--- STEP 16 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.LOAN_TYPES);
            LoanTypes.verifyLoanTypesAbsentInTheList({ name: LT_NAME_1 });

            cy.log('<--- STEP 17 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.LOAN_TYPES);
            LoanTypes.verifyLoanTypesAbsentInTheList({ name: LT_NAME_1 });

            cy.log('<--- STEP 18 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.LOAN_TYPES);
            LoanTypes.verifyLoanTypesAbsentInTheList({ name: LT_NAME_1 });
          },
        );
      });
    });
  });
});

function getPreconditionSteps() {
  // Precondition 1: User created in central tenant with affiliations in College and University.
  const createAndConfigureUser = (flow) => {
    return (
      cy
        // Precondition 2.1: Central tenant permissions.
        .createTempUser([
          Permissions.consortiaSettingsConsortiumManagerShare.gui,
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.uiCreateEditDeleteLoanTypes.gui,
        ])
        .then((userProperties) => {
          return flow.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));
        })
        // Precondition 2.2: Assign affiliation and permissions in member-1 (College).
        .then(() => cy.assignAffiliationToUser(Affiliations.College, flow.get(R.USER).userId))
        .then(() => {
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
            Permissions.uiCreateEditDeleteLoanTypes.gui,
          ]);
        })
        // Precondition 2.3: Assign affiliation and permissions in member-2 (University).
        .then(() => {
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, flow.get(R.USER).userId);
        })
        .then(() => {
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
            Permissions.uiCreateEditDeleteLoanTypes.gui,
          ]);
        })
    );
  };

  // Precondition 3: User is logged in central tenant.
  const loginAsConfiguredUser = (flow) => {
    cy.resetTenant();

    return cy.login(flow.get(R.USER).username, flow.get(R.USER).password);
  };

  return {
    createAndConfigureUser,
    loginAsConfiguredUser,
  };
}
