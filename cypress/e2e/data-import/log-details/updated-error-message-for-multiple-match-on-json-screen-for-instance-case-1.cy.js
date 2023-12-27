import { Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  EXISTING_RECORDS_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
} from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import TopMenu from '../../../support/fragments/topMenu';
// import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
// import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';

describe('data-import', () => {
  describe('Log details', () => {
    const testData = {
      createdRecordIDs: [],
      marcFilePath: 'marcBibFileForC387452.mrc',
      jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
      fileName: `C389589 marcFileName${getRandomPostfix()}`,
      title: '',
      errorMessage:
        'org.folio.processing.exceptions.MatchingException: Found multiple records matching specified conditions (UUIDs: <UUIDs that matches divided by comma>")',
    };
    const matchProfile = {
      profileName: `C389589 Updating SRS by 035 to OCLC number${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '035',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.identifierOCLC,
    };
    // collectionOfMappingAndActionProfiles
    const mappingProfileForModify = {
      name: `C389589 Modifying 500 record${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      modifications: {
        action: 'Add',
        field: '500',
        ind1: '',
        ind2: '',
        subfield: 'a',
        data: `Test.${getRandomPostfix()}`,
      },
    };
    const mappingProfile = {
      name: `C389589 Updating Instance with ADM note${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      adminNotes: 'Add this to existing',
      adminNote: `Test${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C389589 Updating Instance by 035 OCLC record${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const marcFileNames = [
      {
        fileName: `C389589 testMarcFile${getRandomPostfix()}.mrc`,
      },
      {
        fileName: `C389589 testMarcFile${getRandomPostfix()}.mrc`,
      },
    ];

    before('Create test data', () => {
      cy.getAdminToken();
      cy.loginAsAdmin();
      marcFileNames.forEach((name) => {
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(testData.marcFilePath, name);
        JobProfiles.search(testData.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(name);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(name);
        Logs.getCreatedItemsID().then((link) => {
          testData.createdRecordIDs.push(link.split('/')[5]);
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportCanViewOnly.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    // after('delete test data', () => {
    //   cy.getAdminToken().then(() => {
    //     Users.deleteViaApi(testData.user.userId);
    //     JobProfiles.deleteJobProfile(jobProfile.profileName);
    //     MatchProfiles.deleteMatchProfile(matchProfile.profileName);
    //     ActionProfiles.deleteActionProfile(actionProfile.name);
    //     FieldMappingProfileView.deleteViaApi(mappingProfile.name);
    //   });
    // });

    it(
      'C389589  Verify the updated error message for multiple match on JSON screen for Instance: Case 1 (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // craete match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create mapping profile
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfileForModify);
        NewFieldMappingProfile.addFieldMappingsForMarc();
        NewFieldMappingProfile.fillModificationSectionWithAdd(
          mappingProfileForModify.modifications,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfileForModify.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfileForModify.name);

        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addAdministrativeNote(mappingProfile.adminNote, 5);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // // create action profiles
        // collectionOfMappingAndActionProfiles.forEach((profile) => {
        //   cy.visit(SettingsMenu.actionProfilePath);
        //   ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        //   ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        // });

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        // NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        // NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName);
        // NewJobProfile.linkActionProfileForMatches(
        //   collectionOfMappingAndActionProfiles[0].actionProfile.name,
        //   2,
        // );
        // NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[2].matchProfile.profileName);
        // NewJobProfile.linkActionProfileForMatches(
        //   collectionOfMappingAndActionProfiles[1].actionProfile.name,
        //   4,
        // );
        // NewJobProfile.saveAndClose();
        // JobProfiles.checkJobProfilePresented(jobProfileWithMatch.profileName);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(testData.marcFilePath, testData.fileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(testData.fileName);
        FileDetails.openJsonScreen(testData.title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openOrderTab();
        JsonScreenView.verifyContentInTab(testData.errorMessage);
      },
    );
  });
});
