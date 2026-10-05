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
import ResourceIdentifierTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/instances/resourceIdentifierTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ResourceIdentifierTypes from '../../../../../support/fragments/settings/inventory/instances/resourceIdentifierTypes';
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

const RIT_NAME_1 = getTestEntityValue('SharedResourceIdentifierType1');
const RIT_NAME_2 = getTestEntityValue('SharedResourceIdentifierType2');

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Resource identifier types', () => {
        const flow = new ExecutionFlowManager();

        before('Create C411322 preconditions', () => {
          cy.getAdminToken();
          cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

          const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

          flow.step(steps.createAndConfigureUser).step(steps.loginAsConfiguredUser);
        });

        after('Delete C411322 data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          flow.cleanup();
        });

        it(
          'C411322 User with "Consortium manager: Can share settings to all members" permission is able to add/delete resource identifier type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411322'] },
          () => {
            const { locale } = flow.ctx();
            const rowDataToCheck = [
              RIT_NAME_1,
              'consortium',
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
            ResourceIdentifierTypesConsortiumManager.choose();
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
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: RIT_NAME_1 });

            cy.log('<--- STEP 5 --->');
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 6 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(RIT_NAME_1);

            cy.log('<--- STEP 7 --->');
            ConfirmShare.clickConfirm();
            ResourceIdentifierTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.created(RIT_NAME_1, SHARED_SETTING_LIBRARIES),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 8 --->');
            ConsortiaControlledVocabularyPaneset.createViaUi(true, { name: RIT_NAME_2 });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(RIT_NAME_2);

            cy.log('<--- STEP 9 --->');
            ConfirmShare.clickKeepEditing();
            ResourceIdentifierTypesConsortiumManager.waitLoading();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 10 --->');
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(RIT_NAME_2);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton();

            cy.log('<--- STEP 11 --->');
            ConsortiaControlledVocabularyPaneset.createViaUi(true, { name: RIT_NAME_1 });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
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
            ConsortiaControlledVocabularyPaneset.performAction(RIT_NAME_1, actionIcons.trash);
            DeleteCancelReason.waitLoadingDeleteModal('resource identifier type', RIT_NAME_1);

            cy.log('<--- STEP 14 --->');
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              actionIcons.edit,
              actionIcons.trash,
            ]);

            cy.log('<--- STEP 15 --->');
            ConsortiaControlledVocabularyPaneset.performAction(RIT_NAME_1, actionIcons.trash);
            DeleteCancelReason.waitLoadingDeleteModal('resource identifier type', RIT_NAME_1);
            DeleteCancelReason.clickDelete();
            ResourceIdentifierTypesConsortiumManager.waitLoading();
            ConsortiumManagerApp.checkMessage(
              messages.deleted('resource identifier type', RIT_NAME_1),
            );
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(RIT_NAME_1);

            cy.log('<--- STEP 16-18 --->');
            [tenantNames.central, tenantNames.college, tenantNames.university].forEach(
              (tenant, index, arr) => {
                cy.visit(SettingsMenu.resourceIdentifierTypes);
                ResourceIdentifierTypes.verifyResourceIdentifierTypesAbsentInTheList({
                  name: RIT_NAME_1,
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
  const createAndConfigureUser = (flow) => {
    return cy
      .createTempUser([
        Permissions.consortiaSettingsConsortiumManagerShare.gui,
        Permissions.consortiaSettingsConsortiumManagerEdit.gui,
        Permissions.crudResourceIdentifierTypes.gui,
      ])
      .then((userProperties) => {
        return flow.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));
      })
      .then(() => cy.assignAffiliationToUser(Affiliations.College, flow.get(R.USER).userId))
      .then(() => {
        cy.setTenant(Affiliations.College);
        cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
          Permissions.crudResourceIdentifierTypes.gui,
        ]);
      })
      .then(() => {
        cy.resetTenant();
        cy.assignAffiliationToUser(Affiliations.University, flow.get(R.USER).userId);
      })
      .then(() => {
        cy.setTenant(Affiliations.University);
        cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
          Permissions.crudResourceIdentifierTypes.gui,
        ]);
      });
  };

  const loginAsConfiguredUser = (flow) => {
    cy.resetTenant();

    return cy.login(flow.get(R.USER).username, flow.get(R.USER).password);
  };

  return {
    createAndConfigureUser,
    loginAsConfiguredUser,
  };
}
