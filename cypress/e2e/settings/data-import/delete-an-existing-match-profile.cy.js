import { EXISTING_RECORDS_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import ConfirmDelete from '../../../support/fragments/settings/dataImport/matchProfiles/modals/confirmDelete';
import ExceptionDelete from '../../../support/fragments/settings/dataImport/matchProfiles/modals/exceptionDelete';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomStringCode from '../../../support/utils/genereteTextCode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const matchProfileToDelete = {
      profileName: `C2341 autotest match profile_${getRandomStringCode(8)}`,
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

    before('Create test data and login', () => {
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
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(profile.createJobProfile);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.createMatchProfile);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C2341 Delete an existing match profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
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
