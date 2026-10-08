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
import StatisticalCodesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances-holdings-items/statisticalCodesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
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

const CODE_FIELD = 'code';
const NAME_FIELD = 'name';

const SCT_TYPE_NAME = getTestEntityValue('SharedSCType595');

const SC_CODE = getTestEntityValue('SharedSC');
const SC_NAME = getTestEntityValue('SharedStatisticalCode');
const SC_CODE_EDITED = getTestEntityValue('SharedSCEdited');

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Statistical codes', () => {
        const flow = new ExecutionFlowManager();

        before('Create C411595 preconditions', () => {
          cy.getAdminToken();
          cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

          // Precondition 2: Shared statistical code type created for test data setup.
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

        after('Delete C411595 data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          flow.cleanup();
        });

        it(
          'C411595 User with "Consortium manager: Can share settings to all members" permission is able to add/edit statistical code shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411595'] },
          () => {
            const { locale, sctType } = flow.ctx();
            const rowDataToCheck = [
              SC_CODE,
              SC_NAME,
              sctType.name,
              INVENTORY_RECORD_SOURCE.CONSORTIUM,
              formatIntlDateTime(locale, new Date()),
              SHARED_SETTING_LIBRARIES,
            ];
            const rowDataEditedToCheck = [
              SC_CODE_EDITED,
              SC_NAME,
              sctType.name,
              INVENTORY_RECORD_SOURCE.CONSORTIUM,
              formatIntlDateTime(locale, new Date()),
              SHARED_SETTING_LIBRARIES,
            ];

            cy.log('<--- STEP 1 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(2);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            cy.log('<--- STEP 2 --->');
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 2, true);

            cy.log('<--- STEP 3 --->');
            SelectMembers.checkMember(tenantNames.college, false);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(1);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, true);

            cy.log('<--- STEP 4 --->');
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.verifyMembersSelected(1);
            ConsortiumManagerApp.verifySelectMembersButton();
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            cy.log('<--- STEP 5 --->');
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            StatisticalCodesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            cy.log('<--- STEP 6 --->');
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            cy.log('<--- STEP 7 --->');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [CODE_FIELD]: SC_CODE });

            cy.log('<--- STEP 8 --->');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [NAME_FIELD]: SC_NAME });

            cy.log('<--- STEP 9 --->');
            StatisticalCodesConsortiumManager.selectStatisticalCodeType(sctType.name);

            cy.log('<--- STEP 10 --->');
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 11 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(SC_CODE);

            cy.log('<--- STEP 12 --->');
            ConfirmShare.clickConfirm();
            StatisticalCodesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(SC_CODE, SHARED_SETTING_LIBRARIES));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 13 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.verifyConsortiumStatisticalCodeInTheList({ code: SC_CODE });

            cy.log('<--- STEP 14 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.verifyConsortiumStatisticalCodeInTheList({ code: SC_CODE });

            cy.log('<--- STEP 15 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            StatisticalCodesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(SC_NAME, actionIcons.edit);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifySaveButtonIsActive(false);

            cy.log('<--- STEP 16 --->');
            ConsortiaControlledVocabularyPaneset.clearTextField(CODE_FIELD);
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [CODE_FIELD]: SC_CODE_EDITED });
            ConsortiaControlledVocabularyPaneset.verifySaveButtonIsActive(true);

            cy.log('<--- STEP 17 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(SC_CODE_EDITED);

            cy.log('<--- STEP 18 --->');
            ConfirmShare.clickConfirm();
            StatisticalCodesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.updated(SC_CODE_EDITED, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataEditedToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            cy.log('<--- STEP 19 --->');
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);

            cy.log('<--- STEP 20 --->');
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            cy.log('<--- STEP 21 --->');
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyMembersSelected(0);
            ConsortiumManagerApp.verifySelectMembersButton();
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            cy.log('<--- STEP 22 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.verifyConsortiumStatisticalCodeInTheList({ code: SC_CODE_EDITED });

            cy.log('<--- STEP 23 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.STATISTICAL_CODES);
            StatisticalCodes.verifyConsortiumStatisticalCodeInTheList({ code: SC_CODE_EDITED });
          },
        );
      });
    });
  });
});

function getPreconditionSteps() {
  // Precondition 3: User created in member-1 (College) tenant; central affiliation is added automatically.
  const createAndConfigureUser = (flow) => {
    cy.setTenant(Affiliations.College);

    return (
      cy
        // Precondition 4.2: Permissions in member tenant.
        .createTempUser([
          Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
          Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
        ])
        .then((userProperties) => {
          return flow.set(R.USER, userProperties, () => {
            cy.setTenant(Affiliations.College);
            Users.deleteViaApi(userProperties.userId);
          });
        })
        // Precondition 4.1: Assign permissions in central tenant.
        .then(() => {
          cy.resetTenant();
          cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsStatisticalCodeTypesCreateEditDelete.gui,
            Permissions.uiSettingsStatisticalCodesCreateEditDelete.gui,
          ]);
        })
    );
  };

  // Precondition 5: User is logged in and switched affiliation to central tenant.
  const loginAsConfiguredUser = (flow) => {
    cy.setTenant(Affiliations.College);

    return cy.login(flow.get(R.USER).username, flow.get(R.USER).password).then(() => {
      ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
    });
  };

  return {
    createAndConfigureUser,
    loginAsConfiguredUser,
  };
}
