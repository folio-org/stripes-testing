import { APPLICATION_NAMES, LIST_ASSERTION_MODES } from '../../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import Permissions from '../../../../../support/dictionary/permissions';
import ConsortiaControlledVocabularyPaneset, {
  actionIcons,
} from '../../../../../support/fragments/consortium-manager/consortiaControlledVocabularyPaneset';
import ConsortiumManagerApp, {
  settingsItems,
  SHARED_SETTING_LIBRARIES,
} from '../../../../../support/fragments/consortium-manager/consortiumManagerApp';
import ItemNoteTypesConsortiumManager from '../../../../../support/fragments/consortium-manager/inventory/items/itemNoteTypesConsortiumManager';
import ConfirmShare from '../../../../../support/fragments/consortium-manager/modal/confirm-share';
import SelectMembers from '../../../../../support/fragments/consortium-manager/modal/select-members';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ItemNoteTypes from '../../../../../support/fragments/settings/inventory/items/itemNoteTypes';
import SettingsMenu from '../../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import { ExecutionFlowManager } from '../../../../../support/utils';
import { normalizePublicationResults } from '../../../../../support/utils/consortium';
import { getTestEntityValue } from '../../../../../support/utils/stringTools';

const R = {
  LOCALE: 'locale',
  PC_RESULTS: 'publicationResults',
  USER: 'user',
};

const ITEM_NOTE = getTestEntityValue('SharedItemNote');
const ITEM_NOTE_EDITED = `${ITEM_NOTE} (edited)`;

const getDateString = (locale) => {
  return new Intl.DateTimeFormat(locale.locale, { timeZone: locale.timezone }).format(new Date());
};

const interceptRequestToUpdateFlowContext = (flow) => {
  const cleanup = () => {
    const publicationResults = flow.get(R.PC_RESULTS);
    const setting = publicationResults?.[0]?.response?.itemNoteTypes?.find(
      ({ name }) => name === ITEM_NOTE_EDITED,
    );
    const settingId = setting?.id;

    ItemNoteTypesConsortiumManager.deleteViaApi({
      settingId,
      url: '/item-note-types',
      payload: setting,
    });
  };

  cy.intercept('GET', '/consortia/*/publications/*/results', (req) => {
    req.continue((res) => {
      if (res.statusCode === 200) {
        flow.set(R.PC_RESULTS, normalizePublicationResults(res.body)?.publicationResults, cleanup);
      }
    });
  });
};

const verifySettingInEachTenant = (settingName, mode = LIST_ASSERTION_MODES.EXISTS) => {
  const assertFn = {
    [LIST_ASSERTION_MODES.EXISTS]: (name) => ItemNoteTypes.verifyConsortiumItemNoteTypesInTheList({ name }),
    [LIST_ASSERTION_MODES.ABSENT]: (name) => ItemNoteTypes.verifyItemNoteTypesAbsentInTheList({ name }),
  }[mode];

  const tenantsToCheck = [tenantNames.central, tenantNames.college];

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

        before('Create C411451 preconditions', () => {
          cy.getAdminToken();
          cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

          const steps = getPreconditionSteps(); // eslint-disable-line no-use-before-define

          flow.step(steps.createAndConfigureUser).step(steps.loginAsConfiguredUser);
        });

        after('Delete C411451 data', () => {
          cy.resetTenant();
          cy.getAdminToken();
          flow.cleanup();
        });

        it(
          'C411451 User with "Consortium manager: Can share settings to all members" permission is able to add/edit item note type shared to all affiliated tenants in "Consortium manager" app (consortia) (thunderjet)',
          { tags: ['criticalPathECS', 'thunderjet', 'C411451'] },
          () => {
            const { locale } = flow.ctx();
            const createdItemNote = [
              ITEM_NOTE,
              'consortium',
              getDateString(locale),
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
            SelectMembers.selectMembers(tenantNames.college);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(1);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, true);

            cy.log('<--- STEP 4 --->');
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(1);

            cy.log('<--- STEP 5 --->');
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ItemNoteTypesConsortiumManager.choose();

            cy.log('<--- STEP 6-8 --->');
            ConsortiaControlledVocabularyPaneset.createViaUi(true, { name: ITEM_NOTE });
            ConsortiumManagerApp.verifySelectMembersButton(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({ isChecked: true });

            cy.log('<--- STEP 9 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(ITEM_NOTE);

            cy.log('<--- STEP 10 --->');
            ConfirmShare.clickConfirm();
            ItemNoteTypesConsortiumManager.assertSettingIsDisplayed();
            ItemNoteTypesConsortiumManager.assertCreatedCalloutMessage(ITEM_NOTE);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(createdItemNote, [
              'edit',
              'trash',
            ]);

            cy.log('<--- STEP 11-12 --->');
            verifySettingInEachTenant(ITEM_NOTE);

            cy.log('<--- STEP 13 --->');
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CONSORTIUM_MANAGER);
            ConsortiumManagerApp.chooseSettingsItem(settingsItems.inventory);
            ItemNoteTypesConsortiumManager.choose();
            ConsortiaControlledVocabularyPaneset.performAction(ITEM_NOTE, actionIcons.edit);
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(false);
            ConsortiaControlledVocabularyPaneset.verifyShareCheckboxState({
              isChecked: true,
              isEnabled: false,
            });
            ConsortiumManagerApp.verifySelectMembersButton(false);

            cy.log('<--- STEP 14 --->');
            ConsortiaControlledVocabularyPaneset.fillInTextField({ name: ITEM_NOTE_EDITED });
            ConsortiaControlledVocabularyPaneset.verifyEditModeIsActive(true);

            cy.log('<--- STEP 15 --->');
            ConsortiaControlledVocabularyPaneset.clickSave();
            ConfirmShare.waitLoadingConfirmShareToAll(ITEM_NOTE_EDITED);

            cy.log('<--- STEP 16 --->');
            interceptRequestToUpdateFlowContext(flow);
            ConfirmShare.clickConfirm();
            ItemNoteTypesConsortiumManager.assertSettingIsDisplayed();
            ItemNoteTypesConsortiumManager.assertUpdatedCalloutMessage(ITEM_NOTE_EDITED);
            ConsortiaControlledVocabularyPaneset.verifyRecordInTheList(
              [ITEM_NOTE_EDITED, ...createdItemNote.slice(1)],
              ['edit', 'trash'],
            );
            ConsortiaControlledVocabularyPaneset.verifyNewButtonDisabled(false);
            ConsortiumManagerApp.verifySelectMembersButton(true);

            cy.log('<--- STEP 17 --->');
            ConsortiumManagerApp.clickSelectMembers();
            SelectMembers.verifyStatusOfSelectMembersModal(2, 1);

            cy.log('<--- STEP 18 --->');
            SelectMembers.selectMembers(tenantNames.central);
            SelectMembers.verifyMembersFound(2);
            SelectMembers.verifyTotalSelected(0);
            SelectMembers.verifyMemberIsSelected(tenantNames.college, false);
            SelectMembers.verifyMemberIsSelected(tenantNames.central, false);

            cy.log('<--- STEP 19 --->');
            SelectMembers.saveAndClose();
            ConsortiumManagerApp.verifyStatusOfConsortiumManager(0);
            ConsortiumManagerApp.verifyListIsEmpty();
            ConsortiaControlledVocabularyPaneset.verifyNewButtonShown(false);

            cy.log('<--- STEP 20-21 --->');
            verifySettingInEachTenant(ITEM_NOTE_EDITED);
          },
        );
      });
    });
  });
});

function getPreconditionSteps() {
  const createAndConfigureUser = (flow) => {
    const cleanup = (userId) => {
      cy.withinTenant(Affiliations.College, () => {
        Users.deleteViaApi(userId);
      });
    };

    cy.withinTenant(Affiliations.College, () => {
      cy.createTempUser([Permissions.inventoryCRUDItemNoteTypes.gui]).then((userProperties) => flow.set(R.USER, userProperties, cleanup.bind(null, userProperties.userId)));
    }).then(() => {
      cy.assignPermissionsToExistingUser(flow.get(R.USER).userId, [
        Permissions.consortiaSettingsConsortiumManagerShare.gui,
        Permissions.consortiaSettingsConsortiumManagerEdit.gui,
        Permissions.inventoryCRUDItemNoteTypes.gui,
      ]);
    });
  };

  const loginAsConfiguredUser = (flow) => {
    cy.login(flow.get(R.USER).username, flow.get(R.USER).password);
    ConsortiumManager.switchActiveAffiliation(tenantNames.college, tenantNames.central);
  };

  return {
    createAndConfigureUser,
    loginAsConfiguredUser,
  };
}
