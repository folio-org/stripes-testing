import { APPLICATION_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import { MatchProfiles as SettingsMatchProfiles } from '../../../support/fragments/settings/dataImport';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/generateTextCode';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const matchProfile = {
      profileName: `C2340 autotest match profile ${getRandomStringCode(8)}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };

    const duplicatedMatchProfile = {
      profileName: `C2340 autotest duplicate match profile ${getRandomStringCode(8)}`,
      instanceOption: NewMatchProfile.optionsList.instanceUuid,
    };

    const calloutMessage = `The match profile "${duplicatedMatchProfile.profileName}" was successfully created`;
    const calloutErrorMessage = 'New record not created';

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfileView.verifyMatchProfileTitleName(matchProfile.profileName);
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(duplicatedMatchProfile.profileName);
      });
    });

    it(
      'C2340 Duplicate an existing match profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C2340'] },
      () => {
        MatchProfileView.duplicate();
        NewMatchProfile.selectExistingRecordField(duplicatedMatchProfile.instanceOption);
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
