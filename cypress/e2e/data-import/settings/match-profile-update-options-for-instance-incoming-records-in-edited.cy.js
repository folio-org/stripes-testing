import { Permissions } from '../../../support/dictionary';
import getRandomPostfix from '../../../support/utils/stringTools';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import SettingsDataImport from '../../../support/fragments/settings/dataImport/settingsDataImport';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import MatchProfileEdit from '../../../support/fragments/data_import/match_profiles/matchProfileEdit';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';

let user;

describe('data-import', () => {
  describe('Settings', () => {
    const matchProfile = {
      profileName: `C411691 Match profile ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
    };

    before('Create test data', () => {
      cy.getAdminToken();
      // create Match profile
      NewMatchProfile.createMatchProfileViaApiMarc(matchProfile);

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C411691 Match profile: update options for Instance "Incoming records" in Edited Match Profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to "Settings" application-> "Data import" section-> "Match profiles" section
        SettingsDataImport.goToSettingsDataImport();
        DataImport.selectDataImportProfile('Match profiles');

        // Click a match profile from the list
        MatchProfiles.selectMatchProfileFromList(matchProfile.profileName);

        // Click on the "Actions" button-> Click on the "Edit" button
        MatchProfileView.edit();

        // Click on "Instance" option as the "Existing records" type
        MatchProfileEdit.clickOnExistingRecordByName('Instance');

        // Click on "MARC Bibliographic" option in "Incoming record" column and check the available options
        MatchProfileEdit.verifyIncomingRecordsDropdown(
          'MARC Bibliographic',
          'Static value (submatch only)',
        );
        MatchProfileEdit.verifyIncomingRecordsItemDoesNotExist('MARC Authority');
      },
    );
  });
});
