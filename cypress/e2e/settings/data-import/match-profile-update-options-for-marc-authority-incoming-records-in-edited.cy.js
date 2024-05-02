import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
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
      profileName: `C411860 MARC authority record ${getRandomPostfix()}`,
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
      recordType: EXISTING_RECORDS_NAMES.MARC_AUTHORITY,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewMatchProfile.createMatchProfileViaApiMarc(matchProfile);

      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C411860 Match profile: update options for MARC Authority "Incoming records" in edited one (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // Go to "Settings" application-> "Data import" section-> "Match profiles" section
        cy.login(user.username, user.password, {
          path: TopMenu.settingsPath,
          waiter: SettingsPane.waitLoading,
        });
        SettingsDataImport.goToSettingsDataImport();
        DataImport.selectDataImportProfile('Match profiles');

        // Click a match profile from the list
        MatchProfiles.selectMatchProfileFromList(matchProfile.profileName);

        // Click on the "Actions" button-> Click on the "Edit" button
        MatchProfileView.edit();

        // Click on "MARC Authority" option in "Incoming record" column and check the available options
        MatchProfileEdit.verifyIncomingRecordsDropdown(
          'MARC Authority',
          'Static value (submatch only)',
        );
        MatchProfileEdit.verifyIncomingRecordsItemDoesNotExist('MARC Bibliographic');
      },
    );
  });
});
