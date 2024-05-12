import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/genereteTextCode';

describe('Data Import', () => {
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
      existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
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
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(duplicatedMatchProfile.profileName);
      });
    });

    it(
      'C2340 Duplicate an existing match profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
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
