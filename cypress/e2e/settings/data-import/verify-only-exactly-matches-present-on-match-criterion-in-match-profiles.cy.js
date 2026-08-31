import { EXISTING_RECORD_NAMES, FOLIO_RECORD_TYPE } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import MatchProfileEditForm from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileEditForm';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    const matchProfileName = `AT_C1045416_MatchProfile_${getRandomPostfix()}`;
    let user;

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.matchProfilePath,
          waiter: MatchProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C1045416 Verify that only "Exactly matches" present on Match criteria on Match profiles (promin)',
      { tags: ['extendedPath', 'promin', 'C1045416'] },
      () => {
        // Step 1: Open new match profile, fill Name, Incoming = MARC Bibliographic, Existing = Instance
        MatchProfiles.clickCreateNewMatchProfile();

        MatchProfileEditForm.fillSummaryProfileFields({ name: matchProfileName });
        NewMatchProfile.selectExistingRecordType(EXISTING_RECORD_NAMES.INSTANCE);
        MatchProfileEditForm.selectIncomingRecordType(FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC);
        MatchProfileEditForm.verifyMatchCriterionOnlyExactlyMatches();

        // Step 2: Change Existing records to Holdings
        NewMatchProfile.selectExistingRecordType(EXISTING_RECORD_NAMES.HOLDINGS);
        MatchProfileEditForm.verifyMatchCriterionOnlyExactlyMatches();

        // Step 3: Change Existing records to Item
        NewMatchProfile.selectExistingRecordType(EXISTING_RECORD_NAMES.ITEM);
        MatchProfileEditForm.verifyMatchCriterionOnlyExactlyMatches();

        // Step 4: Change Existing records to MARC Bibliographic
        NewMatchProfile.selectExistingRecordType(EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC);
        MatchProfileEditForm.verifyMatchCriterionOnlyExactlyMatches();

        // Step 5: Change Existing records to MARC Authority
        NewMatchProfile.selectExistingRecordType(EXISTING_RECORD_NAMES.MARC_AUTHORITY);
        MatchProfileEditForm.verifyMatchCriterionOnlyExactlyMatches();
      },
    );
  });
});
