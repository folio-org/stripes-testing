import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
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
        jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
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
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
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
      existingRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
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
      FileManager.deleteFile(`cypress/fixtures/${testData.marcAuthorityCreate.editedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcAuthorityUpdate.editedFileName}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        MarcAuthority.deleteViaAPI(testData.createdAuthorityIDs[0]);
      });
    });

    it(
      'C380510 Verify the JSON tab error for the duplicated records for MARC Authorities (folijet)',
      { tags: ['extendedPath', 'folijet', 'C380510'] },
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
        Logs.waitFileIsImported(testData.marcAuthorityCreate.fileName);
        Logs.checkJobStatus(testData.marcAuthorityCreate.fileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcAuthorityCreate.fileName);
        for (let i = 0; i < testData.marcAuthorityCreate.numOfRecords; i++) {
          Logs.getCreatedItemsID(i).then((link) => {
            testData.createdAuthorityIDs.push(link.split('/')[5]);
          });
        }

        // create field mapping profile
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryForMarcAuthInMappingProfile(mappingProfile);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);

        // create Action profile and link it to Field mapping profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create Match profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);

        // create Job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(actionProfile.name);
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();
        JobProfiles.waitLoadingList();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(
          testData.marcAuthorityUpdate.editedFileName,
          testData.marcAuthorityUpdate.fileName,
        );
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.marcAuthorityUpdate.fileName);
        Logs.checkJobStatus(
          testData.marcAuthorityUpdate.fileName,
          JOB_STATUS_NAMES.COMPLETED_WITH_ERRORS,
        );
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
