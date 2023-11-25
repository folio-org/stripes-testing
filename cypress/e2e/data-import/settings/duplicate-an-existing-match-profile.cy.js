import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const matchProfile = {
      profileName: `C2340 autotest match profile ${getRandomStringCode(8)}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };

    const duplicatedMatchProfile = {
      profileName: `C2340 autotest duplicate match profile ${getRandomStringCode(8)}`,
      matchCriterion: 'Existing value contains incoming value',
    };

    const calloutMessage = `The match profile "${duplicatedMatchProfile.profileName}" was successfully created`;
    const calloutErrorMessage = 'New record not created';

    before('create user and profile', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
      cy.visit(SettingsMenu.matchProfilePath);
      MatchProfiles.createMatchProfile(matchProfile);
      MatchProfileView.verifyMatchProfileTitleName(matchProfile.profileName);
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        MatchProfiles.deleteMatchProfile(matchProfile.profileName);
        MatchProfiles.deleteMatchProfile(duplicatedMatchProfile.profileName);
      });
    });

    it(
      'C2340 Duplicate an existing match profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        MatchProfileView.duplicate();
        NewMatchProfile.selectMatchCriterion(duplicatedMatchProfile.matchCriterion);
        NewMatchProfile.saveAndClose();
        NewMatchProfile.checkCalloutMessage(calloutErrorMessage);
        NewMatchProfile.fillName(duplicatedMatchProfile.profileName);
        NewMatchProfile.saveAndClose();
        MatchProfiles.checkCalloutMessage(calloutMessage);
        MatchProfileView.verifyMatchProfileTitleName(duplicatedMatchProfile.profileName);
        MatchProfileView.closeViewMode();
        MatchProfiles.checkMatchProfilePresented(duplicatedMatchProfile.profileName);
      },
    );
  });
});
