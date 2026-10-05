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
import StatisticalCodeTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodeTypesConsortiumManager';
import StatisticalCodesConsortiumManager, {
  STATISTICAL_CODE_ENTITY_TYPE,
} from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import StatisticalCodes from '../../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
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
  SCT_TYPE: 'sctType',
};

const CODE_FIELD_LABEL = 'Code';
const CODE_FIELD = 'code';
const NAME_FIELD = 'name';

const SCT_TYPE_NAME = getTestEntityValue('SharedSCType594');

const SC_CODE_1 = getTestEntityValue('SharedSC1');
const SC_NAME_1 = getTestEntityValue('SharedStatisticalCode1');
const SC_CODE_2 = getTestEntityValue('SharedSC2');
const SC_NAME_2 = getTestEntityValue('SharedStatisticalCode2');

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Statistical codes', () => {
        const flow = new ExecutionFlowManager();

        before('Create C411594 preconditions', () => {
          cy.getAdminToken();
          cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

          // Precondition 1: Shared statistical code type created for test data setup.
          const sctTypeData = { name: SCT_TYPE_NAME };
          StatisticalCodeTypesConsortiumManager.createSharedViaApi(sctTypeData).then((sctType) => {
            flow.set(R.SCT_TYPE, sctType, () => {
              cy.resetTenant();
              StatisticalCodeTypesConsortiumManager.deleteSharedViaApi(sctType);
            });
          });

          const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

          flow.step(steps.createAndConfigureUser).step(steps.loginAsConfiguredUser);
        });

        after('Delete C411594 data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          flow.cleanup();
        });

        it(
          'C411594 User with "Consortium manager: Can share settings to all members" permission is able to add/delete statistical code shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411594'] },
          () => {
            const { locale, sctType } = flow.ctx();
            const rowDataToCheck = [
              SC_CODE_1,
              SC_NAME_1,
              sctType.name,
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
            StatisticalCodesConsortiumManager.choose();
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
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [CODE_FIELD]: SC_CODE_1 });

            cy.log('<--- STEP 5 --->');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [NAME_FIELD]: SC_NAME_1 });

            cy.log('<--- STEP 6 --->');
            StatisticalCodesConsortiumManager.selectStatisticalCodeType(sctType.name);

            cy.log('<--- STEP 7 --->');
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 8 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(SC_CODE_1);

            cy.log('<--- STEP 9 --->');
            ConfirmShare.clickConfirm();
            StatisticalCodesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.created(SC_CODE_1, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 10 --->');
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [CODE_FIELD]: SC_CODE_2 });
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [NAME_FIELD]: SC_NAME_2 });
            StatisticalCodesConsortiumManager.selectStatisticalCodeType(sctType.name);
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(SC_CODE_2);

            cy.log('<--- STEP 11 --->');
            ConfirmShare.clickKeepEditing();
            StatisticalCodesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 12 --->');
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(SC_NAME_2);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            cy.log('<--- STEP 13 --->');
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [CODE_FIELD]: SC_CODE_1 });
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [NAME_FIELD]: SC_NAME_2 });
            StatisticalCodesConsortiumManager.selectStatisticalCodeType(sctType.name);
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              [CODE_FIELD]: messages.notUnique(CODE_FIELD_LABEL),
            });

            cy.log('<--- STEP 14 --->');
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 15 --->');
            ConsortiaControlledVocabularyPaneset.performAction(SC_NAME_1, actionIcons.trash);
            DeleteCancelReason.waitLoadingDeleteModal(STATISTICAL_CODE_ENTITY_TYPE, SC_CODE_1);

            cy.log('<--- STEP 16 --->');
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 17 --->');
            ConsortiaControlledVocabularyPaneset.performAction(SC_NAME_1, actionIcons.trash);
            DeleteCancelReason.waitLoadingDeleteModal(STATISTICAL_CODE_ENTITY_TYPE, SC_CODE_1);
            DeleteCancelReason.clickDelete();
            StatisticalCodesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted(STATISTICAL_CODE_ENTITY_TYPE, SC_CODE_1),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(SC_NAME_1);

            cy.log('<--- STEP 18 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.verifyStatisticalCodesAbsentInTheList({ code: SC_CODE_1 });

            cy.log('<--- STEP 19 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.verifyStatisticalCodesAbsentInTheList({ code: SC_CODE_1 });

            cy.log('<--- STEP 20 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.university);
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.verifyStatisticalCodesAbsentInTheList({ code: SC_CODE_1 });
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
        // Precondition 4.1: Central tenant permissions.
        .createTempUser([
          Permissions.consortiaSettingsConsortiumManagerShare.gui,
          Permissions.consortiaSettingsConsortiumManagerEdit.gui,
          Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
          Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
        ])
        .then((userProperties) => {
          return flow.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));
        })
        // Precondition 4.2: Assign affiliation and permissions in member-1 (College).
        .then(() => cy.assignAffiliationToUser(Affiliations.College, flow.get(R.USER).userId))
        .then(() => {
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
            Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
            Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
          ]);
        })
        // Precondition 4.3: Assign affiliation and permissions in member-2 (University).
        .then(() => {
          cy.resetTenant();
          cy.assignAffiliationToUser(Affiliations.University, flow.get(R.USER).userId);
        })
        .then(() => {
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
            Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
            Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
          ]);
        })
    );
  };

  // Precondition 5: User is logged in central tenant.
  const loginAsConfiguredUser = (flow) => {
    cy.resetTenant();

    return cy.login(flow.get(R.USER).username, flow.get(R.USER).password);
  };

  return {
    createAndConfigureUser,
    loginAsConfiguredUser,
  };
}
