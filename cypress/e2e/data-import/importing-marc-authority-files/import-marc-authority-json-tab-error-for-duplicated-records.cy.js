import Permissions from '../../../support/dictionary/permissions';
import {
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import FileManager from '../../../support/utils/fileManager';

describe('data-import', () => {
  describe('Importing MARC Authority files', () => {
    const randomNumberFor10Field = `nh00${randomFourDigitNumber()}`;
    const testData = {
      title: 'Council for Christian Colleges & Universities',
      quantityOfItems: '1',
      createdAuthorityIDs: [],
      marcAuthorityCreate: {
        marc: 'marcAuthFileC380510.mrc',
        fileName: `C380510 testMarcFile${getRandomPostfix()}.mrc`,
        editedFileName: `C380510 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 1,
      },
      marcAuthorityUpdate: {
        marc: 'marcAuthFileC380510_1.mrc',
        fileName: `C380510 testMarcFile${getRandomPostfix()}.mrc`,
        editedFileName: `C380510 testMarcFile${getRandomPostfix()}.mrc`,
      },
      errorMessage:
        'org.folio.services.exceptions.DuplicateRecordException: Incoming file may contain duplicates',
    };
    const mappingProfile = {
      name: `C380510 Test_large batch import ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      name: `C380510 Test_large batch import ${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const matchProfile = {
      profileName: `C380510 Match large batch ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '010',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '010',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C380510 Job large batch ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((createdUserProperties) => {
        testData.user = createdUserProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      MarcAuthority.deleteViaAPI(testData.createdAuthorityIDs[0]);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcAuthorityCreate.editedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcAuthorityUpdate.editedFileName}`);
    });

    it(
      'C380510 Verify the JSON tab error for the duplicated records for MARC Authorities (folijet)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // change 10$a in files to random value
        DataImport.editMarcFile(
          testData.marcAuthorityCreate.marc,
          testData.marcAuthorityCreate.editedFileName,
          ['nh000204'],
          [randomNumberFor10Field],
        );
        DataImport.editMarcFile(
          testData.marcAuthorityUpdate.marc,
          testData.marcAuthorityUpdate.editedFileName,
          ['nh000204', 'nh000204'],
          [randomNumberFor10Field, randomNumberFor10Field],
        );
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(
          testData.marcAuthorityCreate.editedFileName,
          testData.marcAuthorityCreate.fileName,
        );
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(testData.marcAuthorityCreate.jobProfileToRun);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.marcAuthorityCreate.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcAuthorityCreate.fileName);
        for (let i = 0; i < testData.marcAuthorityCreate.numOfRecords; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            testData.createdAuthorityIDs.push(link.split('/')[5]);
          });
        }

        // create field mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryForMarcAuthInMappingProfile(mappingProfile);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);

        // create Action profile and link it to Field mapping profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create Match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(actionProfile.name);
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();
        JobProfiles.waitLoadingList();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(
          testData.marcAuthorityUpdate.editedFileName,
          testData.marcAuthorityUpdate.fileName,
        );
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.marcAuthorityUpdate.fileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS);
        Logs.openFileDetails(testData.marcAuthorityUpdate.fileName);
        // check updated record
        FileDetails.checkSrsRecordQuantityInSummaryTable(testData.quantityOfItems, 1);
        FileDetails.checkAuthorityQuantityInSummaryTable(testData.quantityOfItems, 1);
        FileDetails.openJsonScreenByStatus(RECORD_STATUSES.NO_ACTION, testData.title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyContentInTab(testData.errorMessage);
      },
    );
  });
});
