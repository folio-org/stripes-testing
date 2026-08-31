import {
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  FOLIO_RECORD_TYPE,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { ActionProfiles as SettingsActionProfiles } from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C358980 Checking "FOLIO record type" option when create a new action profile (promin)',
      { tags: ['extendedPath', 'promin', 'C358980'] },
      () => {
        const { CREATE, MODIFY, UPDATE } = ACTION_NAMES_IN_ACTION_PROFILE;

        // Step 1: Navigate to Settings > Data Import > Action Profiles
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);

        // Step 2: Open new action profile form
        SettingsActionProfiles.openNewActionProfileForm();
        NewActionProfile.verifyNewActionProfileExists();

        // Step 3: Verify all FOLIO record type options are present
        NewActionProfile.verifyFolioRecordTypeOptions([
          FOLIO_RECORD_TYPE.INSTANCE,
          FOLIO_RECORD_TYPE.HOLDINGS,
          FOLIO_RECORD_TYPE.ITEM,
          FOLIO_RECORD_TYPE.ORDER,
          FOLIO_RECORD_TYPE.INVOICE,
          FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
          FOLIO_RECORD_TYPE.MARCAUTHORITY,
          FOLIO_RECORD_TYPE.LINKEDDATA,
        ]);

        // Steps 4-5: Instance → Create + Update available
        NewActionProfile.chooseRecordType(FOLIO_RECORD_TYPE.INSTANCE);
        NewActionProfile.verifySelectedFolioRecordType(FOLIO_RECORD_TYPE.INSTANCE);
        NewActionProfile.verifyActionOptions([CREATE, UPDATE]);
        NewActionProfile.chooseAction(UPDATE);
        NewActionProfile.verifyActionOptionSelected(UPDATE);
        NewActionProfile.chooseAction(CREATE);
        NewActionProfile.verifyActionOptionSelected(CREATE);

        // Steps 7-9: Item → Create + Update available
        NewActionProfile.chooseRecordType(FOLIO_RECORD_TYPE.ITEM);
        NewActionProfile.verifySelectedFolioRecordType(FOLIO_RECORD_TYPE.ITEM);
        NewActionProfile.verifyActionOptions([CREATE, UPDATE]);
        NewActionProfile.chooseAction(UPDATE);
        NewActionProfile.verifyActionOptionSelected(UPDATE);
        NewActionProfile.chooseAction(CREATE);
        NewActionProfile.verifyActionOptionSelected(CREATE);

        // Step 10: Order → Create only
        NewActionProfile.chooseRecordType(FOLIO_RECORD_TYPE.ORDER);
        NewActionProfile.verifySelectedFolioRecordType(FOLIO_RECORD_TYPE.ORDER);
        NewActionProfile.verifyActionOptions([CREATE]);
        NewActionProfile.verifyActionOptionSelected(CREATE);

        // Step 11: Invoice → Create only
        NewActionProfile.chooseRecordType(FOLIO_RECORD_TYPE.INVOICE);
        NewActionProfile.verifySelectedFolioRecordType(FOLIO_RECORD_TYPE.INVOICE);
        NewActionProfile.verifyActionOptions([CREATE]);
        NewActionProfile.verifyActionOptionSelected(CREATE);

        // Step 6: Holdings → Create + Update available
        NewActionProfile.chooseRecordType(FOLIO_RECORD_TYPE.HOLDINGS);
        NewActionProfile.verifySelectedFolioRecordType(FOLIO_RECORD_TYPE.HOLDINGS);
        NewActionProfile.verifyActionOptions([CREATE, UPDATE]);
        NewActionProfile.chooseAction(CREATE);
        NewActionProfile.verifyActionOptionSelected(CREATE);
        NewActionProfile.chooseAction(UPDATE);
        NewActionProfile.verifyActionOptionSelected(UPDATE);

        // Steps 12-13: MARC Bibliographic → Modify + Update (no Create)
        NewActionProfile.chooseRecordType(FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC);
        NewActionProfile.verifySelectedFolioRecordType(FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC);
        NewActionProfile.verifyActionOptions([MODIFY, UPDATE]);
        NewActionProfile.chooseAction(MODIFY);
        NewActionProfile.verifyActionOptionSelected(MODIFY);
        NewActionProfile.chooseAction(UPDATE);
        NewActionProfile.verifyActionOptionSelected(UPDATE);

        // Step 14: MARC Authority → Update only
        NewActionProfile.chooseRecordType(FOLIO_RECORD_TYPE.MARCAUTHORITY);
        NewActionProfile.verifySelectedFolioRecordType(FOLIO_RECORD_TYPE.MARCAUTHORITY);
        NewActionProfile.verifyActionOptions([UPDATE]);
        NewActionProfile.chooseAction(UPDATE);
        NewActionProfile.verifyActionOptionSelected(UPDATE);

        // Step 15: Close without saving
        NewActionProfile.closeProfileWithoutSaving();
      },
    );
  });
});
