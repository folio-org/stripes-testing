import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import { ACCEPTED_DATA_TYPE_NAMES, FOLIO_RECORD_TYPE } from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const collectionOfActionProfiles = [
      {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C11116 autotest action profile1 ${getRandomPostfix()}`,
        action: 'Create (all record types except MARC Authority or MARC Holdings)',
      },
      {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C11116 autotest action profile2 ${getRandomPostfix()}`,
        action: 'Create (all record types except MARC Authority or MARC Holdings)',
      },
      {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C11116 autotest action profile3 ${getRandomPostfix()}`,
        action: 'Create (all record types except MARC Authority or MARC Holdings)',
      },
    ];
    const matchProfile = {
      profileName: `C11116 autotest match profile ${getRandomPostfix()}`,
    };
    const mappingProfile = {
      name: `C11116 mapping profile ${getRandomPostfix()}`,
    };
    const jobProfile = {
      profileName: `C11116 autotest job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);

        // create mapping profile
        NewFieldMappingProfile.createMappingProfileViaApi(mappingProfile.name);

        // create match profile
        NewMatchProfile.createMatchProfileViaApi(matchProfile.profileName);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        MatchProfiles.deleteMatchProfile(matchProfile.profileName);
        collectionOfActionProfiles.forEach((profile) => ActionProfiles.deleteActionProfile(profile.name));
        FieldMappingProfileView.deleteViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C11116 Unlinking a match or action profile from a job profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // create 3 action profiles
        cy.visit(SettingsMenu.actionProfilePath);
        collectionOfActionProfiles.forEach((profile) => {
          ActionProfiles.create(profile, mappingProfile.name);
          ActionProfileView.close();
          ActionProfiles.waitLoading();
        });
        // create Job profile with linked match and action profiles
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(collectionOfActionProfiles[0].name);
        NewJobProfile.linkActionProfileForMatches(collectionOfActionProfiles[1].name);
        NewJobProfile.linkActionProfileForNonMatches(collectionOfActionProfiles[2].name);
        NewJobProfile.saveAndClose();
        JobProfileView.edit();
        JobProfileEdit.unlinkMatchProfile(0);
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyLinkedProfiles(
          [
            matchProfile.profileName,
            collectionOfActionProfiles[1].name,
            collectionOfActionProfiles[2].name,
          ],
          3,
        );
      },
    );
  });
});
