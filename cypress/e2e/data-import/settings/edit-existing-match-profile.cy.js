import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import Users from '../../../support/fragments/users/users';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import MatchProfileEdit from '../../../support/fragments/data_import/match_profiles/matchProfileEdit';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('ui-data-import: Edit an existing match profile', () => {
  const matchProfileName = `C2339 autotest MatchProf${Helper.getRandomBarcode()}`;
  let user;
  const matchProfile = {
    profileName: matchProfileName,
    incomingRecordFields: {
      field: '001'
    },
    matchCriterion: 'Exactly matches',
    existingRecordType: 'INSTANCE',
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
    MatchProfiles.deleteMatchProfile(matchProfileName);
  });

  it('C2339 Edit an existing match profile (folijet)', { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
    MatchProfiles.checkListOfExistingProfilesIsDisplayed();
    MatchProfiles.search(matchProfileName);
    MatchProfiles.selectMatchProfileFromList(matchProfileName);
    MatchProfileView.edit();
    MatchProfileEdit.verifyScreenName(matchProfileName);
    MatchProfileEdit.changeExistingInstanceRecordField();
    MatchProfileEdit.save();
    MatchProfiles.checkCalloutMessage(matchProfileName);
    MatchProfileView.verifyExistingInstanceRecordField();
  });
});
