import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileEdit from '../../../support/fragments/data_import/match_profiles/matchProfileEdit';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const matchProfile = {
      profileName: `C2339 autotest MatchProf${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const calloutMessage = `The match profile "${matchProfile.profileName}" was successfully updated`;

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
        MatchProfileEdit.save();
        MatchProfiles.checkCalloutMessage(calloutMessage);
        MatchProfileView.verifyExistingInstanceRecordField();
      },
    );
  });
});
