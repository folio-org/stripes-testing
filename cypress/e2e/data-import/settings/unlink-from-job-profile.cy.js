import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import JobProfileView from '../../../support/fragments/data_import/job_profiles/jobProfileView';
import JobProfileEdit from '../../../support/fragments/data_import/job_profiles/jobProfileEdit';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
} from '../../../support/constants';
import Users from '../../../support/fragments/users/users';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const actionProfile1 = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C11116 autotest action profile1 ${getRandomPostfix()}`,
      action: 'Create (all record types except MARC Authority or MARC Holdings)',
    };
    const actionProfile2 = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C11116 autotest action profile2 ${getRandomPostfix()}`,
      action: 'Create (all record types except MARC Authority or MARC Holdings)',
    };
    const actionProfile3 = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C11116 autotest action profile3 ${getRandomPostfix()}`,
      action: 'Create (all record types except MARC Authority or MARC Holdings)',
    };
    const matchProfile = {
      profileName: `C11116 autotest match profile ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: 'Admin data: Instance HRID',
    };
    const mappingProfile = {
      name: `C11116 mapping profile ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const instanceStatusTerm = INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED;
    const catalogedDate = '###TODAY###';
    const jobProfile = {
      profileName: `C11116 autotest job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password);

        // create mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillInstanceStatusTerm(instanceStatusTerm);
        NewFieldMappingProfile.fillCatalogedDate(catalogedDate);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);

        // create 3 action profiles
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile1, mappingProfile.name);
        ActionProfileView.close();
        ActionProfiles.waitLoading();
        ActionProfiles.create(actionProfile2, mappingProfile.name);
        ActionProfileView.close();
        ActionProfiles.waitLoading();
        ActionProfiles.create(actionProfile3, mappingProfile.name);
        ActionProfileView.close();
        ActionProfiles.waitLoading();

        // create match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
      });
    });

    after('delete test data', () => {
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile1.name);
      ActionProfiles.deleteActionProfile(actionProfile2.name);
      ActionProfiles.deleteActionProfile(actionProfile3.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C11116 Unlinking a match or action profile from a job profile (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // create Job profile with linked match and action profiles
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(actionProfile1.name);
        NewJobProfile.linkActionProfileForMatches(actionProfile2.name);
        NewJobProfile.linkActionProfileForNonMatches(actionProfile3.name);
        NewJobProfile.saveAndClose();
        JobProfileView.edit();
        JobProfileEdit.unlinkMatchProfile(0);
        JobProfileEdit.saveAndClose();
        JobProfileView.verifyLinkedProfiles(
          [matchProfile.profileName, actionProfile2.name, actionProfile3.name],
          3,
        );
      },
    );
  });
});
