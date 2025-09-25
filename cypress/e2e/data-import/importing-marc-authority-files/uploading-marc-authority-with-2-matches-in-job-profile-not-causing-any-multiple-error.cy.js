import moment from 'moment';
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
import CapabilitySets from '../../../support/dictionary/capabilitySets';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthoritiesSearch from '../../../support/fragments/marcAuthority/marcAuthoritiesSearch';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomTwoDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const testData = {
      createdRecordIDs: [],
      marcFile: {
        marc: 'marcAuthFileForC624306.mrc',
        fileName: `C624306 testMarcFile${getRandomPostfix()}.mrc`,
        exportedFileName: `C624306 exportedTestMarcFile${getRandomPostfix()}.mrc`,
        modifiedFileName: `C624306 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
        updatedFileName: `C624306 updatedTestMarcFile${getRandomPostfix()}.mrc`,
      },
      todayDate: moment(new Date()).format('YYYYMMDD'),
      partOfAuthorityTitle: 'C624306',
      calloutMessage:
        "is complete. The .csv downloaded contains selected records' UIIDs. To retrieve the .mrc file, please go to the Data export app.",
      csvFile: `C624306_Quick_Authority_Export_${getRandomPostfix()}.csv`,
    };
    const mappingProfile = {
      name: `C624306 Updating Authority with 2 matches${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCAUTHORITY,
      name: `C624306 Updating Authority with 2 matches${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const matchProfile010$aTo010$a = {
      profileName: `C624306 010$a-to-010$a auth match${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      existingRecordFields: {
        field: '010',
        in1: '',
        in2: '',
        subfield: 'a',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile005To005 = {
      profileName: `C624306 005-to-005 auth match${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '005',
      },
      existingRecordFields: {
        field: '005',
      },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C624306 Update authority with 2 matches${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      // make sure there are no duplicate authority records in the system
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(`${testData.partOfAuthorityTitle}*`);
      DataImport.uploadFileViaApi(
        testData.marcFile.marc,
        testData.marcFile.fileName,
        DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      ).then((response) => {
        response.forEach((record) => {
          testData.createdRecordIDs.push(record.authority.id);
        });
      });

      cy.createTempUser().then((userProperties) => {
        testData.user = userProperties;

        cy.assignCapabilitiesToExistingUser(
          testData.user.userId,
          [],
          [
            CapabilitySets.uiDataImportSettingsManage,
            CapabilitySets.uiDataImport,
            CapabilitySets.uiMarcAuthoritiesAuthorityRecordView,
            CapabilitySets.uiDataExportEdit,
          ],
        );

        cy.login(testData.user.username, testData.user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
        MarcAuthorities.waitLoading();
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      cy.getAdminToken();
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile010$aTo010$a.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile005To005.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      Users.deleteViaApi(testData.user.userId);
      testData.createdRecordIDs.forEach((id) => {
        MarcAuthority.deleteViaAPI(id);
      });
    });

    it(
      'C624306 Updating MARC Authority with 2 matches in job profile not causing any multiple error (folijet)',
      { tags: ['criticalPath', 'folijet', 'C624306'] },
      () => {
        MarcAuthoritiesSearch.searchBy('Keyword', testData.partOfAuthorityTitle);
        MarcAuthorities.selectAllRecords();
        MarcAuthorities.exportSelected();
        cy.wait(1000);
        MarcAuthorities.checkCallout(testData.calloutMessage);
        ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');
        MarcAuthorities.verifyAllCheckboxesAreUnchecked();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(testData.csvFile);
        ExportFile.exportWithDefaultJobProfile(
          testData.csvFile,
          'Default authority',
          'Authorities',
        );
        ExportFile.downloadExportedMarcFile(testData.marcFile.exportedFileName);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);

        DataImport.editMarcFile(
          testData.marcFile.exportedFileName,
          testData.marcFile.modifiedFileName,
          [testData.todayDate],
          [`${testData.todayDate}${randomTwoDigitNumber()}`],
        );

        // create Field mapping profile
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile);
        // create Action profile and link it to Field mapping profile
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        // create Match profile
        NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
          matchProfile010$aTo010$a,
        );
        // create Match profile
        NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
          matchProfile005To005,
        );

        // create Job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile010$aTo010$a.profileName);
        NewJobProfile.linkMatchAndActionProfilesForSubMatches(
          matchProfile005To005.profileName,
          actionProfile.name,
        );
        // wait for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFileAndRetry(
          testData.marcFile.modifiedFileName,
          testData.marcFile.updatedFileName,
        );
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.marcFile.updatedFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFile.updatedFileName);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.authority,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.NO_ACTION, columnName);
          [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].forEach((rowNumber) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName, rowNumber);
          });
        });
        FileDetails.openJsonScreenByRowAndStatus(RECORD_STATUSES.NO_ACTION);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openMarcSrsTab();
        JsonScreenView.verifyContentInTab('No record');
      },
    );
  });
});
