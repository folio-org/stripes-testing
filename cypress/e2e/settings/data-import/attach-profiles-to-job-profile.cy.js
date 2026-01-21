import { ACCEPTED_DATA_TYPE_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfileView from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfileView';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C11139 autotest match profile1 ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
            in1: '',
            in2: '',
            subfield: '',
          },
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          existingMatchExpressionValue: 'instance.hrid',
        },
      },
      {
        matchProfile: {
          profileName: `C11139 autotest match profile2 ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
            in1: '',
            in2: '',
            subfield: '',
          },
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          existingMatchExpressionValue: 'instance.hrid',
        },
      },
    ];
    const collectionOfActionProfiles = [
      {
        actionProfile: {
          name: `C11139 autotest action profile1 ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        actionProfile: {
          name: `C11139 autotest action profile2 ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        actionProfile: {
          name: `C11139 autotest action profile3 ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
    ];
    const mappingProfile = {
      name: `C11139 mapping profile ${getRandomPostfix()}`,
    };
    const jobProfile = {
      profileName: `C11139 autotest job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.jobProfilePath,
          waiter: JobProfiles.waitLoadingList,
        });

        // create 3 action profiles linked to mapping profile
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile).then(
          (mappingProfileResponse) => {
            collectionOfActionProfiles.forEach((profile) => {
              NewActionProfile.createActionProfileViaApi(
                profile.actionProfile,
                mappingProfileResponse.body.id,
              ).then((actionProfileResponse) => {
                profile.actionProfile.id = actionProfileResponse.body.id;
              });
            });
          },
        );

        // create 2 match profile
        collectionOfMatchProfiles.forEach((profile) => {
          NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
            profile.matchProfile,
          ).then((matchProfileResponse) => {
            profile.matchProfile.id = matchProfileResponse.body.id;
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        collectionOfMatchProfiles.forEach((profile) => SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.profileName));
        collectionOfActionProfiles.forEach((profile) => SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.name));
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C11139 Attaching match and action profiles to a job profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C11139'] },
      () => {
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfActionProfiles[0].actionProfile.name,
          2,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfActionProfiles[1].actionProfile.name,
          2,
        );
        NewJobProfile.linkActionProfileForNonMatches(
          collectionOfActionProfiles[2].actionProfile.name,
          3,
        );
        NewJobProfile.saveAndClose();
        cy.wait(3000);
        JobProfileView.verifyLinkedProfiles(
          [
            collectionOfMatchProfiles[0].matchProfile.profileName,
            collectionOfMatchProfiles[1].matchProfile.profileName,
            collectionOfActionProfiles[0].actionProfile.name,
            collectionOfActionProfiles[1].actionProfile.name,
            collectionOfActionProfiles[2].actionProfile.name,
          ],
          5,
        );
        JobProfileView.openLinkedProfileById(collectionOfActionProfiles[0].actionProfile.id);
        ActionProfileView.verifyActionProfileTitleName(
          collectionOfActionProfiles[0].actionProfile.name,
        );
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(collectionOfActionProfiles[1].actionProfile.id);
        ActionProfileView.verifyActionProfileTitleName(
          collectionOfActionProfiles[1].actionProfile.name,
        );
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(collectionOfActionProfiles[2].actionProfile.id);
        ActionProfileView.verifyActionProfileTitleName(
          collectionOfActionProfiles[2].actionProfile.name,
        );
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(collectionOfMatchProfiles[0].matchProfile.id);
        MatchProfileView.verifyMatchProfileTitleName(
          collectionOfMatchProfiles[0].matchProfile.profileName,
        );
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.select(jobProfile.profileName);
        JobProfileView.openLinkedProfileById(collectionOfMatchProfiles[1].matchProfile.id);
        MatchProfileView.verifyMatchProfileTitleName(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );
      },
    );
  });
});
