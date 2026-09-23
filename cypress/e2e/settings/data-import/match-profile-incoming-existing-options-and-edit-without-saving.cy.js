import { EXISTING_RECORD_NAMES, FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileEdit from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileEditForm';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;

describe('Data Import', () => {
  describe('Settings', () => {
    const matchProfile = {
      profileName: `AT_C359145_MatchProfile_${getRandomPostfix()}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const existingRecordItems = [
      EXISTING_RECORD_NAMES.INSTANCE,
      EXISTING_RECORD_NAMES.HOLDINGS,
      EXISTING_RECORD_NAMES.ITEM,
      EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    ];
    const excludedExistingRecordTypes = [
      EXISTING_RECORD_NAMES.MARC_HOLDINGS,
      EXISTING_RECORD_NAMES.ORDER,
      EXISTING_RECORD_NAMES.INVOICE,
    ];
    const changedSubfieldValue = 't';

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile);
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: SettingsMenu.matchProfilePath,
          waiter: MatchProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C359145 Checking the "Incoming/Existing" options and edit without saving changes for existing match profile (promin)',
      { tags: ['extendedPath', 'promin', 'C359145'] },
      () => {
        // Steps 1-2: Match profiles list > select our own match profile
        MatchProfiles.search(matchProfile.profileName);
        MatchProfiles.selectMatchProfileFromList(matchProfile.profileName);
        MatchProfileView.verifyMatchProfileOpened();

        // Step 3: Actions > Edit
        MatchProfileView.edit();

        // Step 4: "Existing records" section contains Instance/Holdings/Item/MARC Bibliographic/MARC Authority
        MatchProfileEdit.verifyDetailsSection(existingRecordItems);

        // Step 5: "Incoming records" dropdown contains MARC Bibliographic/Static value (submatch only)
        MatchProfileEdit.verifyIncomingRecordsDropdown(
          'MARC Bibliographic',
          'Static value (submatch only)',
        );

        // Steps 6-7: "Match criterion" for Incoming/Existing doesn't mention MARC Holdings, Order, Invoice
        MatchProfileEdit.verifyMatchCriteriaDoesNotContain(['MARC Holdings', 'Order', 'Invoice']);
        MatchProfileEdit.verifyDetailsSectionAbsent(excludedExistingRecordTypes);

        // Step 8: Change a field value; "Save as profile & Close" becomes enabled
        MatchProfileEdit.changeExistingRecordSubfieldValue(changedSubfieldValue);
        MatchProfileEdit.checkButtonsConditions([
          { label: 'Save as profile & Close', conditions: { disabled: false } },
        ]);

        // Steps 9-10: Close > "Keep editing" - modal closes, edit form stays open
        MatchProfileEdit.clickCloseButton({ action: 'keepEditing' });

        // Step 11: Close > "Close without saving" - returned to match profile view
        MatchProfileEdit.clickCloseButton();

        // Step 12: the change made in step 8 was not saved
        MatchProfileView.verifyMatchProfileWithIncomingAndExistingValue(
          {
            profileName: matchProfile.profileName,
            incomingRecordFields: matchProfile.incomingRecordFields,
            existingRecordFields: matchProfile.existingRecordFields,
            existingRecordType: matchProfile.recordType,
          },
          FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        );
      },
    );
  });
});
