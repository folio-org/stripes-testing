import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import { ACCEPTED_DATA_TYPE_NAMES } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    cy.createTempUser([Permissions.settingsDataImportCanViewOnly.gui]).then((userProperties) => {
      user = userProperties;

      cy.login(user.username, user.password);
    });

    // after('Delete test data', () => {
    //   JobProfiles.deleteJobProfile(jobProfile.profileName);
    //   Users.deleteViaApi(user.userId);
    // });

    it(
      'C11139 Attaching match and action profiles to a job profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        cy.visit(SettingsMenu.jobProfilePath);
      },
    );
  });
});
