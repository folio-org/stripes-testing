import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileEdit from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileEditForm';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsPane from '../../../support/fragments/settings/settingsPane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;

describe('Data Import', () => {
  describe('Settings', () => {
    const matchProfile = {
      profileName: `C411856 Match profile ${getRandomPostfix()}`,
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

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile);

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
      'C411856 Match profile: update options for MARC Bibliographic "Incoming records" in edited one (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to "Settings" application-> "Data import" section-> "Match profiles" section
        SettingsDataImport.goToSettingsDataImport();
        DataImport.selectDataImportProfile('Match profiles');

        // Click a match profile from the list
        MatchProfiles.selectMatchProfileFromList(matchProfile.profileName);

        // Click on the "Actions" button-> Click on the "Edit" button
        MatchProfileView.edit();

        // Click on "MARC Bibliographic" option as the "Existing records" type
        MatchProfileEdit.clickOnExistingRecordByName('MARC Bibliographic');

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
