import { APPLICATION_NAMES, INVENTORY_RECORD_SOURCE } from '../../../../../support/constants';
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
import StatisticalCodeTypesConsortiumManager, {
  STATISTICAL_CODE_ENTITY_TYPE,
} from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodeTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import StatisticalCodeTypes from '../../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodeTypes';
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

const NAME_FIELD = 'Name';

const SCT_NAME_1 = getTestEntityValue('SharedStatisticalCodeType1');
const SCT_NAME_2 = getTestEntityValue('SharedStatisticalCodeType2');

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Statistical code types', () => {
        const flow = new ExecutionFlowManager();

        before('Create C411353 preconditions', () => {
          cy.getAdminToken();
          cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

          const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

          flow.step(steps.createAndConfigureUser).step(steps.loginAsConfiguredUser);
        });

        after('Delete C411353 data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          flow.cleanup();
        });

        it(
          'C411353 User with "Consortium manager: Can share settings to all members" permission is able to add/delete statistical code type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411353'] },
          () => {
            const { locale } = flow.ctx();
            const rowDataToCheck = [
              SCT_NAME_1,
              INVENTORY_RECORD_SOURCE.CONSORTIUM,
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
            StatisticalCodeTypesConsortiumManager.choose();
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
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: SCT_NAME_1 });

            cy.log('<--- STEP 5 --->');
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 6 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(SCT_NAME_1);

            cy.log('<--- STEP 7 --->');
            ConfirmShare.clickConfirm();
            StatisticalCodeTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.created(SCT_NAME_1, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 8 --->');
            ConsortiaControlledVocabularyPaneset.createViaUi(true, { name: SCT_NAME_2 });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(SCT_NAME_2);

            cy.log('<--- STEP 9 --->');
            ConfirmShare.clickKeepEditing();
            StatisticalCodeTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 10 --->');
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(SCT_NAME_2);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            cy.log('<--- STEP 11 --->');
            ConsortiaControlledVocabularyPaneset.createViaUi(true, { name: SCT_NAME_1 });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique(NAME_FIELD),
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
            ConsortiaControlledVocabularyPaneset.performAction(SCT_NAME_1, actionIcons.trash);
            DeleteCancelReason.waitLoadingDeleteModal(STATISTICAL_CODE_ENTITY_TYPE, SCT_NAME_1);

            cy.log('<--- STEP 14 --->');
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 15 --->');
            ConsortiaControlledVocabularyPaneset.performAction(SCT_NAME_1, actionIcons.trash);
            DeleteCancelReason.waitLoadingDeleteModal(STATISTICAL_CODE_ENTITY_TYPE, SCT_NAME_1);
            DeleteCancelReason.clickDelete();
            StatisticalCodeTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(STATISTICAL_CODE_ENTITY_TYPE, SCT_NAME_1),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(SCT_NAME_1);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();

            cy.log('<--- STEP 16-18 --->');
            [tenantNames.central, tenantNames.college, tenantNames.university].forEach(
              (tenant, index, arr) => {
                SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODE_TYPES);
                StatisticalCodeTypes.verifyStatisticalCodeTypesAbsentInTheList({
                  name: SCT_NAME_1,
                });
                ConsortiumManager.switchActiveAffiliation(
                  tenant,
                  arr[index === arr.length - 1 ? 0 : index + 1],
                );
              },
            );
          },
        );
      });
    });
  });
});

function getPreconditionSteps() {
  // Precondition 2: User created in central tenant with affiliations in College and University.
  const createAndConfigureUser = (flow) => {
    return (
      cy
        .createTempUser([
          Permissions.consortiaSettingsConsortiumManagerShare.gui,
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
        ])
        .then((userProperties) => {
          return flow.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));
        })
        // Precondition 3.2: Assign affiliation and permissions in member-1 (College).
        .then(() => cy.assignAffiliationToUser(Affiliations.College, flow.get(R.USER).userId))
        .then(() => {
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
            Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
          ]);
        })
        // Precondition 3.3: Assign affiliation and permissions in member-2 (University).
        .then(() => {
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, flow.get(R.USER).userId);
        })
        .then(() => {
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
            Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
          ]);
        })
    );
  };

  // Precondition 4: User is logged in central tenant.
  const loginAsConfiguredUser = (flow) => {
    cy.resetTenant();

    return cy.login(flow.get(R.USER).username, flow.get(R.USER).password);
  };

  return {
    createAndConfigureUser,
    loginAsConfiguredUser,
  };
}
