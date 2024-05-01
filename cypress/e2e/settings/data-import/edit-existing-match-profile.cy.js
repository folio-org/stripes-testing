import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileEdit from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileEditForm';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const matchProfileName = `C2339 autotest MatchProf${getRandomPostfix()}`;

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewMatchProfile.createMatchProfileViaApi(matchProfileName);
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
        cy.visit(SettingsMenu.matchProfilePath);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfileName);
      });
    });

    it(
      'C2339 Edit an existing match profile (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.search(matchProfileName);
        MatchProfiles.selectMatchProfileFromList(matchProfileName);
        MatchProfileView.edit();
        MatchProfileEdit.verifyScreenName(matchProfileName);
        MatchProfileEdit.changeExistingInstanceRecordField();
        MatchProfileEdit.clickSaveAndCloseButton({
          profileCreated: false,
          profileUpdated: true,
        });
        MatchProfileView.verifyExistingInstanceRecordField();
      },
    );
  });
});
