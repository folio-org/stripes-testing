import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import SettingsDataImport from '../../../support/fragments/data_import/settingsDataImport';

let user;

describe('data-import', () => {
  describe('Settings', () => {
    before('Create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C411859 Match profile: update options for MARC Authority "Incoming records" (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Go to "Settings" application-> "Data import" section-> "Match profiles" section-> Click "Actions" button -> Click "New match profile" option
        // "New match profile" page opens
        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsDataImport.goToSettingsDataImport();
        DataImport.selectDataImportProfile('Match profiles');
        MatchProfiles.openNewMatchProfileForm();

        // #2 Click on "MARC Authority" option as the "Existing records" type
        // The "MARC Authority" option appears on the "Existing records" column and highlights
        NewMatchProfile.clickOnExistingRecordByName('MARC Authority');

        // #3 Click on "MARC Authority" option in "Incoming record" column and check the available options
        // * Dropdown list opens and following options appears:
        //  * MARC Authority
        //  * Static value (submatch only)
        // * MARC Bibliographic is NOT present in available options
        NewMatchProfile.verifyIncomingRecordsDropdown(
          'MARC Authority',
          'Static value (submatch only)',
        );
        NewMatchProfile.verifyIncomingRecordsItemDoesNotExist('MARC Bibliographic');
      },
    );
  });
});
