import moment from 'moment';

import { APPLICATION_NAMES, LIST_ASSERTION_MODES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  messages,
  settingsItems,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ItemNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import DeleteCancelReason from '../../../../../support/fragments/consortium-manager/modal/delete-cancel-reason';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ItemNoteTypes from '../../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../../../support/utils';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

const R = {
  USER: 'user',
};

const ITEM_NOTE_1 = getTestEntityValue('SharedItemNote1');
const ITEM_NOTE_2 = getTestEntityValue('SharedItemNote2');

const verifySettingInEachTenant = (settingName, mode = LIST_ASSERTION_MODES.EXISTS) => {
  const assertFn = {
    [LIST_ASSERTION_MODES.EXISTS]: (name) => ItemNoteTypes.verifyConsortiumItemNoteTypesInTheList({ name }),
    [LIST_ASSERTION_MODES.ABSENT]: (name) => ItemNoteTypes.verifyItemNoteTypesAbsentInTheList({ name }),
  }[mode];

  const tenantsToCheck = [tenantNames.central, tenantNames.college, tenantNames.university];

  cy.log(`<--- VERIFY SETTING IN MEMBER TENANTS (${mode}) --->`);
  tenantsToCheck.forEach((tenant, index, arr) => {
    cy.log(`--- VERIFY IN "${tenant}" ---`);
    cy.visit(SettingsMenu.itemNoteTypesPath);
    ItemNoteTypes.waitLoading();
    assertFn(settingName);
    ConsortiumManager.switchActiveAffiliation(
      tenant,
      arr[index === arr.length - 1 ? 0 : index + 1],
    );
  });
};

describe('Consortia', () => {
  describe('Consortium manager', () => {
    describe('Manage shared settings', () => {
      describe('Manage shared Item note types', () => {
        const flow = new ExecutionFlowManager();

        before('Create C411450 preconditions', () => {
          cy.getAdminToken();

          const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

          flow.step(steps.createAndConfigureUser).step(steps.loginAsConfiguredUser);
        });

        after('Delete C411450 data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          flow.cleanup();
        });

        it(
          'C411450 User with "Consortium manager: Can share settings to all members" permission is able to add/delete item note type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411450'] },
          () => {
            const rowDataToCheck = [ITEM_NOTE_1, 'consortium', moment().format('l'), 'All'];

            cy.log('<--- STEP 1 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            SelectMembers.selectAllMembers();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(3);
            ConsortiumManagerApp.verifyChooseSettingsIsDisplayed();

            cy.log('<--- STEP 2 --->');
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ItemNoteTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);

            cy.log('<--- STEP 3 --->');
            ConsortiaControlledVocabularyPaneset.clickNew();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            cy.log('<--- STEP 4 --->');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: ITEM_NOTE_1 });
            ConsortiaControlledVocabularyPaneset.verifySaveButtonIsActive(true);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: false,
            });

            cy.log('<--- STEP 5 --->');
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({ isChecked: true });

            cy.log('<--- STEP 6 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(ITEM_NOTE_1);

            cy.log('<--- STEP 7 --->');
            ConfirmShare.clickConfirm();
            ItemNoteTypesConsortiumManager.assertSettingIsDisplayed();
            ItemNoteTypesConsortiumManager.assertCreatedCalloutMessage(ITEM_NOTE_1);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            /* Not described in the TC, but it is worth checking. */
            verifySettingInEachTenant(ITEM_NOTE_1);
            cy.log('<--- RETURN TO CONSORTIUM MANAGER --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.waitLoading();
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ItemNoteTypesConsortiumManager.choose();

            cy.log('<--- STEP 8 --->');
            ConsortiaControlledVocabularyPaneset.createViaUi(true, { name: ITEM_NOTE_2 });
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(ITEM_NOTE_2);

            cy.log('<--- STEP 9 --->');
            ConfirmShare.clickKeepEditing();
            ItemNoteTypesConsortiumManager.assertSettingIsDisplayed();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isEnabled: true,
              isChecked: true,
            });

            cy.log('<--- STEP 10 --->');
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(ITEM_NOTE_2);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton(true);

            cy.log('<--- STEP 11 --->');
            ConsortiaControlledVocabularyPaneset.createViaUi(true, { name: ITEM_NOTE_1 });
            ConsortiaControlledVocabularyPaneset.checkShareCheckbox();
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive();
            ConsortiaControlledVocabularyPaneset.verifyFieldValidatorError({
              name: messages.notUnique('Name'),
            });

            cy.log('<--- STEP 12 --->');
            ConsortiaControlledVocabularyPaneset.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordHasNoDuplicatesInTheList(ITEM_NOTE_1);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton(true);

            cy.log('<--- STEP 13 --->');
            ConsortiaControlledVocabularyPaneset.performAction(ITEM_NOTE_1, actionIcons.trash);
            ItemNoteTypesConsortiumManager.waitLoadingDeleteModal(ITEM_NOTE_1);

            cy.log('<--- STEP 14 --->');
            DeleteCancelReason.clickCancel();
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(rowDataToCheck, [
              'edit',
              'trash',
            ]);

            cy.log('<--- STEP 15 --->');
            ConsortiaControlledVocabularyPaneset.performAction(ITEM_NOTE_1, actionIcons.trash);
            ItemNoteTypesConsortiumManager.waitLoadingDeleteModal(ITEM_NOTE_1);
            DeleteCancelReason.clickDelete();
            ItemNoteTypesConsortiumManager.assertSettingIsDisplayed();
            ItemNoteTypesConsortiumManager.assertDeletedCalloutMessage(ITEM_NOTE_1);
            ConsortiaControlledVocabularyPaneset.verifyRecordNotInTheList(ITEM_NOTE_1);
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton(true);

            cy.log('<--- STEP 16-18 --->');
            verifySettingInEachTenant(ITEM_NOTE_1, LIST_ASSERTION_MODES.ABSENT);
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
        Permissions.inventoryCRUDItemNoteTypes.gui,
      ])
      .then((userProperties) => flow.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId)))
      .then(() => cy.assignAffiliationToUser(Affiliations.College, flow.get(R.USER).userId))
      .then(() => {
        cy.setTenant(Affiliations.College);
        cy.getCollegeAdminToken();
        cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
          Permissions.inventoryCRUDItemNoteTypes.gui,
        ]);
      })
      .then(() => {
        cy.resetTenant();
        cy.getAdminToken();
        cy.assignAffiliationToUser(Affiliations.University, flow.get(R.USER).userId);
      })
      .then(() => {
        cy.setTenant(Affiliations.University);
        cy.getUniversityAdminToken();
        cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
          Permissions.inventoryCRUDItemNoteTypes.gui,
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
