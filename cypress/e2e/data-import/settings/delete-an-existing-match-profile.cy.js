import getRandomPostfix from '../../../support/utils/stringTools';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import ConfirmDelete from '../../../support/fragments/data_import/match_profiles/modals/confirmDelete';
import ExceptionDelete from '../../../support/fragments/data_import/match_profiles/modals/exceptionDelete';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const matchProfileToDelete = {
      profileName: `C2346 autotest match profile_${getRandomStringCode(8)}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const profile = {
      createJobProfile: `autotest jobProfileForCreate.${getRandomPostfix()}`,
      createMatchProfile: `autotest matchProfileForCreate${getRandomPostfix()}`,
    };

    const calloutMessage = `The match profile "${matchProfileToDelete.profileName}" was successfully deleted`;

    before('Create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        NewMatchProfile.createMatchProfileViaApi(profile.createMatchProfile).then(
          (matchProfileResponse) => {
            NewJobProfile.createJobProfileWithLinkedMatchProfileViaApi(
              profile.createJobProfile,
              matchProfileResponse.body.id,
            );
          },
        );
        cy.login(user.username, user.password);
        cy.visit(SettingsMenu.matchProfilePath);
      });
      MatchProfiles.createMatchProfile(matchProfileToDelete);
      MatchProfileView.closeViewMode();
    });

    after('Delete test data', () => {
      JobProfiles.deleteJobProfile(profile.createJobProfile);
      MatchProfiles.deleteMatchProfile(profile.createMatchProfile);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C2341 Delete an existing match profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        MatchProfiles.search(profile.createMatchProfile);
        MatchProfiles.selectMatchProfileFromList(profile.createMatchProfile);
        MatchProfileView.delete();
        ConfirmDelete.delete();
        ExceptionDelete.verifyExceptionMessage();
        ExceptionDelete.closeException();
        MatchProfiles.search(matchProfileToDelete.profileName);
        MatchProfiles.selectMatchProfileFromList(matchProfileToDelete.profileName);
        MatchProfileView.delete();
        ConfirmDelete.delete();
        MatchProfiles.checkCalloutMessage(calloutMessage);
        MatchProfiles.search(matchProfileToDelete.profileName);
        MatchProfiles.verifyMatchProfileAbsent();
      },
    );
  });
});
