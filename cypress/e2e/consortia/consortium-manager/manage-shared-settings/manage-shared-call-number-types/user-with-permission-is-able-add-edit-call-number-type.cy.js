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
import CallNumberTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/holdings-items/callNumberTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import { CallNumberTypes } from '../../../../../support/fragments/settings/inventory/instances/callNumberTypes';
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

const CNT_NAME = getTestEntityValue('SharedCallNumberType');
const CNT_NAME_EDITED = getTestEntityValue('SharedCallNumberTypeEdited');

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared call number types', () => {
        const flow = new ExecutionFlowManager();

        before('Create C411408 preconditions', () => {
          cy.getAdminToken();
          cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

          const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

          flow.step(steps.createAndConfigureUser).step(steps.loginAsConfiguredUser);
        });

        after('Delete C411408 data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          flow.cleanup();
        });

        it(
          'C411408 User with "Consortium manager: Can share settings to all members" permission is able to add/edit call number type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['extendedPathECS', 'thunderjet', 'C411408'] },
          () => {
            const { locale } = flow.ctx();
            const rowDataToCheck = [
              CNT_NAME,
              INVENTORY_RECORD_SOURCE.CONSORTIUM,
              formatIntlDateTime(locale, new Date()),
              SHARED_SETTING_LIBRARIES,
            ];
            const rowDataEditedToCheck = [
              CNT_NAME_EDITED,
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
            CallNumberTypesConsortiumManager.choose();
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
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [NAME_FIELD]: CNT_NAME });

            cy.log('<--- STEP 8 --->');
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 9 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(CNT_NAME);

            cy.log('<--- STEP 10 --->');
            ConfirmShare.clickConfirm();
            CallNumberTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(CNT_NAME, SHARED_SETTING_LIBRARIES));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 11 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CALL_NUMBER_TYPES);
            CallNumberTypes.validateItemView(CNT_NAME, 'consortium', false, false);

            cy.log('<--- STEP 12 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CALL_NUMBER_TYPES);
            CallNumberTypes.validateItemView(CNT_NAME, 'consortium', false, false);

            cy.log('<--- STEP 13 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            CallNumberTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(CNT_NAME, actionIcons.edit);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifySaveButtonIsActive(false);

            cy.log('<--- STEP 14 --->');
            ConsortiaControlledVocabularyPaneset.clearTextField(NAME_FIELD);
            ConsortiaControlledVocabularyPaneset.fillInTextField({ [NAME_FIELD]: CNT_NAME_EDITED });
            ConsortiaControlledVocabularyPaneset.verifySaveButtonIsActive(true);

            cy.log('<--- STEP 15 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(CNT_NAME_EDITED);

            cy.log('<--- STEP 16 --->');
            ConfirmShare.clickConfirm();
            CallNumberTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.updated(CNT_NAME_EDITED, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataEditedToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            cy.log('<--- STEP 17 --->');
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1, false);

            cy.log('<--- STEP 18 --->');
            SelectMembers.checkMember(tenantNames.central, false);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            cy.log('<--- STEP 19 --->');
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyMembersSelected(0);
            ConsortiumManagerApp.verifySelectMembersButton();
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            cy.log('<--- STEP 20 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
            SettingsInventory.goToSettingsInventory();
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CALL_NUMBER_TYPES);
            CallNumberTypes.validateItemView(CNT_NAME_EDITED, 'consortium', false, false);

            cy.log('<--- STEP 21 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            SettingsInventory.selectSettingsTab(INVENTORY_SETTINGS_TABS.CALL_NUMBER_TYPES);
            CallNumberTypes.validateItemView(CNT_NAME_EDITED, 'consortium', false, false);
          },
        );
      });
    });
  });
});

function getPreconditionSteps() {
  // Precondition 1: User created in member-1 (College) tenant; central affiliation is added automatically.
  const createAndConfigureUser = (flow) => {
    cy.setTenant(Affiliations.College);

    return (
      cy
        // Precondition 2.2: Permissions in member tenant.
        .createTempUser([Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui])
        .then((userProperties) => {
          return flow.set(R.USER, userProperties, () => {
            cy.setTenant(Affiliations.College);
            Users.deleteViaApi(userProperties.userId);
          });
        })
        // Precondition 2.1: Assign permissions in central tenant.
        .then(() => {
          cy.resetTenant();
          cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
            Permissions.consortiaSettingsConsortiumManagerShare.gui,
            Permissions.consortiaSettingsConsortiumManagerEdit.gui,
            Permissions.uiSettingsCallNumberTypesCreateEditDelete.gui,
          ]);
        })
    );
  };

  // Precondition 3: User is logged in and switched affiliation to central tenant.
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
