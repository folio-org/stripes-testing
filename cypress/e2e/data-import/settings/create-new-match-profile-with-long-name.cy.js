import { DevTeams, Permissions, TestTypes } from '../../../support/dictionary';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const matchProfile = {
      profileName: `C2343 autotest match profile ${getRandomStringCode(160)}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const calloutMessage = `The match profile "${matchProfile.profileName}" was successfully created`;

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    });

    it(
      'C2337 Create a new match profile with a long name (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);
        MatchProfileView.verifyMatchProfileOpened();
        MatchProfileView.verifyMatchProfileTitleName(matchProfile.profileName);
        MatchProfiles.checkCalloutMessage(calloutMessage);
      },
    );
  });
});
