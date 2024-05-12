import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileEdit from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileEditForm';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const matchProfile = {
      profileName: `C2339 autotest MatchProf${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };

    before('create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);

        // create match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        InteractorsTools.closeCalloutMessage();
        MatchProfileView.closeViewMode();
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      });
    });

    it(
      'C2339 Edit an existing match profile (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        MatchProfiles.verifyListOfExistingProfilesIsDisplayed();
        MatchProfiles.search(matchProfile.profileName);
        MatchProfiles.selectMatchProfileFromList(matchProfile.profileName);
        MatchProfileView.edit();
        MatchProfileEdit.verifyScreenName(matchProfile.profileName);
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
