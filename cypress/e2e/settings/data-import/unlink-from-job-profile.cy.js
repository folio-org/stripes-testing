import {
  ACCEPTED_DATA_TYPE_NAMES,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import ActionProfileView from '../../../support/fragments/settings/dataImport/actionProfiles/actionProfileView';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user;
    const collectionOfActionProfiles = [
      {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C11116 autotest action profile1 ${getRandomPostfix()}`,
      },
      {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C11116 autotest action profile2 ${getRandomPostfix()}`,
      },
      {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C11116 autotest action profile3 ${getRandomPostfix()}`,
      },
    ];
    const matchProfile = {
      profileName: `C11116 autotest match profile ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
        in1: '',
        in2: '',
        subfield: '',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      existingMatchExpressionValue: 'instance.hrid',
    };
    const mappingProfile = {
      name: `C11116 mapping profile ${getRandomPostfix()}`,
    };
    const jobProfile = {
      profileName: `C11116 autotest job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);

        NewFieldMappingProfile.createInstanceMappingProfileViaApi(mappingProfile);
        NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
          matchProfile,
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        collectionOfActionProfiles.forEach((profile) => SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.name));
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C11116 Unlinking a match or action profile from a job profile (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C11116'] },
      () => {
        // create 3 action profiles
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfActionProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile, mappingProfile.name);
          ActionProfileView.close();
          SettingsActionProfiles.waitLoading();
        });
        // create Job profile with linked match and action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(collectionOfActionProfiles[0].name);
        NewJobProfile.linkActionProfileForMatches(collectionOfActionProfiles[1].name, 1);
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
