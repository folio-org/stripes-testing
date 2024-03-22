import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import getRandomPostfix from '../../../support/utils/stringTools';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;

    const matchProfile = {
      profileName: `match_${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '001',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const recordItems = ['INSTANCE', 'HOLDINGS', 'ITEM', 'MARC_BIBLIOGRAPHIC', 'MARC_AUTHORITY'];

    before('Create test data', () => {
      cy.getAdminToken();
      NewMatchProfile.createMatchProfileViaApiMarc(matchProfile);
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
        cy.visit(SettingsMenu.matchProfilePath);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C421992 - (NON-CONSORTIA) Verify the match profile options (Folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        MatchProfiles.clickCreateNewMatchProfile();

        NewMatchProfile.verifyExistingRecordSection();

        NewMatchProfile.clickClose();
        MatchProfiles.search(matchProfile.profileName);
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileTitleName(matchProfile.profileName);

        recordItems.forEach((item) => {
          MatchProfileView.verifyExistingDetails(item);
        });
      },
    );
  });
});
