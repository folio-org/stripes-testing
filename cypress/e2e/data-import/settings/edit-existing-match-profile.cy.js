import permissions from '../../../support/dictionary/permissions';
import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import Users from '../../../support/fragments/users/users';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import MatchProfileEdit from '../../../support/fragments/data_import/match_profiles/matchProfileEdit';
import InteractorsTools from '../../../support/utils/interactorsTools';
import { EXISTING_RECORDS_NAMES } from '../../../support/constants';

describe('ui-data-import', () => {
  let user;
  const matchProfile = {
    profileName: `C2339 autotest MatchProf${getRandomPostfix}`,
    incomingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
    instanceOption: NewMatchProfile.optionsList.instanceHrid
  };

  before('create test data', () => {
    cy.createTempUser([
      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);

        // create match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        InteractorsTools.closeCalloutMessage();
        MatchProfileView.closeViewModeForMatchProfile();
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
    MatchProfiles.deleteMatchProfile(matchProfile.profileName);
  });

  it('C2339 Edit an existing match profile (folijet)', { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
    MatchProfiles.checkListOfExistingProfilesIsDisplayed();
    MatchProfiles.search(matchProfile.profileName);
    MatchProfiles.selectMatchProfileFromList(matchProfile.profileName);
    MatchProfileView.edit();
    MatchProfileEdit.verifyScreenName(matchProfile.profileName);
    MatchProfileEdit.changeExistingInstanceRecordField();
    MatchProfileEdit.save();
    MatchProfiles.checkCalloutMessage(matchProfile.profileName);
    MatchProfileView.verifyExistingInstanceRecordField();
  });
});
