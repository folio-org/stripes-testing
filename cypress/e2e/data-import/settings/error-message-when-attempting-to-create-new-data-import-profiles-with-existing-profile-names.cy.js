import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import Users from '../../../support/fragments/users/users';
import MatchProfileView from '../../../support/fragments/data_import/match_profiles/matchProfileView';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: 'Default - Create instance and SRS MARC Bib',
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      actionProfile: 'Default - Create instance',
    };
    const matchProfile = {
      name: 'Inventory Single Record - Default match for no SRS record',
      description:
        'Matches the Instance UUID from the 999 ff $i in the incoming MARC record to the UUID of the existing Instance record',
      incomingRecordFields: {
        field: '001',
      },
      existingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const actionProfile = {
      name: 'Default - Create instance',
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
    };
    const mappingProfile = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: 'Default - Create instance',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'HOLDINGS',
      description:
        "This field mapping profile is used with FOLIO's default job profile for creating Inventory Instances and SRS MARC Bibliographic records. It can be edited, duplicated, deleted, or linked to additional action profiles.",
    };

    before('create user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(user.userId);
    });

    it(
      'C404370 Verify the error message when attempting to create new Data Import profiles with existing profile names (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const jobProfileErrorMessage =
          "New record not created: Job profile 'Default - Create instance and SRS MARC Bib' already exists";
        const matchProfileErrorMessage = `New record not created: Match profile '${matchProfile.name}' already exists`;
        const actionProfileErrorMessage = `New record not created: Action profile '${actionProfile.name}' already exists`;
        const mappingProfileErrorMessage = `New record not created: The field mapping profile '${mappingProfile.name}' already exists`;

        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfileByName(jobProfile.actionProfile);
        NewJobProfile.saveAndClose();
        NewJobProfile.checkPreviouslyPopulatedDataIsDisplayed(jobProfile, jobProfile.actionProfile);
        NewJobProfile.checkCalloutMessage(jobProfileErrorMessage);

        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.search(matchProfile.name);
        MatchProfileView.duplicate();
        NewMatchProfile.verifyNewMatchProfileFormIsOpened();
        NewMatchProfile.selectExistingRecordType(matchProfile.existingRecordType);
        NewMatchProfile.fillIncomingRecordSections(matchProfile);
        NewMatchProfile.fillExistingRecordSections(matchProfile);
        NewMatchProfile.saveAndClose();
        NewMatchProfile.verifyPreviouslyPopulatedDataIsDisplayed(
          matchProfile,
          'MARC Bibliographic',
        );
        NewMatchProfile.checkCalloutMessage(matchProfileErrorMessage);

        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.search(actionProfile.name);
        ActionProfiles.selectActionProfileFromList(actionProfile.name);
        ActionProfileView.duplicate();
        NewActionProfile.chooseAction(actionProfile.action);
        NewActionProfile.saveProfile();
        NewActionProfile.verifyPreviouslyCreatedDataIsDisplayed(actionProfile);
        NewActionProfile.verifyCalloutMessage(actionProfileErrorMessage);

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.search(mappingProfile.name);
        FieldMappingProfiles.selectMappingProfileFromList(mappingProfile.name);
        FieldMappingProfileView.duplicate();
        NewFieldMappingProfile.fillFolioRecordType(mappingProfile);
        NewFieldMappingProfile.save();
        NewFieldMappingProfile.checkNewMatchProfileFormIsOpened();
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfile);
        NewFieldMappingProfile.checkCalloutMessage(mappingProfileErrorMessage);
      },
    );
  });
});
