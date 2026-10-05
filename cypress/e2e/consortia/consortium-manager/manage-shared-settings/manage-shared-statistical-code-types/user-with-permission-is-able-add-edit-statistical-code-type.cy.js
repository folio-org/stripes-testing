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
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import StatisticalCodeTypes from '../../../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodeTypes';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../../../support/utils';
import { formatIntlDateTime } from '../../../../../support/utils/acquisitions';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

const R = {
  USER: 'user',
  LOCALE: 'locale',
};

const NAME_FIELD_KEY = 'name';

const SCT_NAME = getTestEntityValue('SharedStatisticalCodeType3');
const SCT_NAME_EDITED = getTestEntityValue('SharedStatisticalCodeType3Edited');

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Statistical code types', () => {
        const flow = new ExecutionFlowManager();

        before('Create C411354 preconditions', () => {
          cy.getAdminToken();
          cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

          const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

          flow.step(steps.createAndConfigureUser).step(steps.loginAsConfiguredUser);
        });

        after('Delete C411354 data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          flow.cleanup();
        });

        it(
          'C411354 User with "Consortium manager: Can share settings to all members" permission is able to add/edit statistical code type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411354'] },
          () => {
            const { locale } = flow.ctx();
            const rowDataToCheck = [
              SCT_NAME,
              INVENTORY_RECORD_SOURCE.CONSORTIUM,
              formatIntlDateTime(locale, new Date()),
              SHARED_SETTING_LIBRARIES,
            ];
            const rowDataEditedToCheck = [
              SCT_NAME_EDITED,
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
            StatisticalCodeTypesConsortiumManager.choose();
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
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: SCT_NAME });

            cy.log('<--- STEP 8 --->');
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 9 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(SCT_NAME);

            cy.log('<--- STEP 10 --->');
            ConfirmShare.clickConfirm();
            StatisticalCodeTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(messages.created(SCT_NAME, SHARED_SETTING_LIBRARIES));
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 11 --->');
            cy.visit(SettingsMenu.statisticalCodeTypes);
            StatisticalCodeTypes.verifyConsortiumStatisticalCodeTypesInTheList({ name: SCT_NAME });

            cy.log('<--- STEP 12 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.statisticalCodeTypes);
            StatisticalCodeTypes.verifyConsortiumStatisticalCodeTypesInTheList({ name: SCT_NAME });

            cy.log('<--- STEP 13 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            StatisticalCodeTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(SCT_NAME, actionIcons.edit);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifySaveButtonIsActive(false);

            cy.log('<--- STEP 14 --->');
            ConsortiaControlledVocabularyPaneset.clearTextField(NAME_FIELD_KEY);
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: SCT_NAME_EDITED });
            ConsortiaControlledVocabularyPaneset.verifySaveButtonIsActive(true);

            cy.log('<--- STEP 15 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(SCT_NAME_EDITED);

            cy.log('<--- STEP 16 --->');
            ConfirmShare.clickConfirm();
            StatisticalCodeTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.updated(SCT_NAME_EDITED, SHARED_SETTING_LIBRARIES),
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
            cy.visit(SettingsMenu.statisticalCodeTypes);
            StatisticalCodeTypes.verifyConsortiumStatisticalCodeTypesInTheList({
              name: SCT_NAME_EDITED,
            });

            cy.log('<--- STEP 21 --->');
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            cy.visit(SettingsMenu.statisticalCodeTypes);
            StatisticalCodeTypes.verifyConsortiumStatisticalCodeTypesInTheList({
              name: SCT_NAME_EDITED,
            });
          },
        );
      });
    });
  });
});

function getPreconditionSteps() {
  // Precondition 2: User created in central tenant with affiliation in member-1 (College).
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
