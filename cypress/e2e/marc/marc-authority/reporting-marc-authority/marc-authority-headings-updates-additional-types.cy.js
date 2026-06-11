import {
  DEFAULT_JOB_PROFILE_NAMES,
  APPLICATION_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  EXISTING_RECORD_NAMES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting MARC authority', () => {
      const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
      const todayWithoutPaddingZero = DateTools.clearPaddingZero(today);
      const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();

      const testData = {
        searchOption: 'Keyword',
        searchValue: 'AT_C409511_MarcAuthority',
        csvFile: `C409511_exportedCSVFile${getRandomPostfix()}.csv`,
        exportedMarcFile: `C409511_exportedMarcFile${getRandomPostfix()}.mrc`,
        editedFileNameForUpdate: `C409511_editedMarcFile${getRandomPostfix()}.mrc`,
        uploadedMarcFile: `C409511_uploadMarcFile${getRandomPostfix()}.mrc`,
        marcFile: {
          marc: 'marcAuthFileC409511.mrc',
          fileName: `C409511_testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
        },
        userProperties: {},
      };

      const mappingProfile = {
        name: `AT_C409511 Update MARC authority records ${getRandomPostfix()}`,
      };
      const actionProfile = {
        name: `AT_C409511 Update MARC authority records ${getRandomPostfix()}`,
        action: 'UPDATE',
        folioRecordType: 'MARC_AUTHORITY',
      };
      const matchProfile = {
        profileName: `AT_C409511 Update MARC authority records by matching 999 ff $s ${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '999',
          in1: 'f',
          in2: 'f',
          subfield: 's',
        },
        existingRecordFields: {
          field: '999',
          in1: 'f',
          in2: 'f',
          subfield: 's',
        },
        recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
      };
      const jobProfile = {
        profileName: `AT_C409511 Update MARC authority records by matching 999 ff $s ${getRandomPostfix()}`,
      };

      const expectedJobValues = {
        status: 'Successful',
        jobType: 'MARC authority headings updates',
        description: 'List of updated MARC authority (1XX) headings',
        outputType: 'MARC authority headings updates (CSV)',
      };

      const createdAuthorityIDs = [];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C409511_');

        // Create update profiles
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
          .then((mappingProfileResponse) => {
            mappingProfile.id = mappingProfileResponse.body.id;
          })
          .then(() => {
            NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
              (actionProfileResponse) => {
                actionProfile.id = actionProfileResponse.body.id;
              },
            );
          })
          .then(() => {
            return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
              matchProfile,
            ).then((matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            });
          })
          .then(() => {
            return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              matchProfile.id,
              actionProfile.id,
            );
          });

        // Import initial MARC authority records
        DataImport.uploadFileViaApi(
          testData.marcFile.marc,
          testData.marcFile.fileName,
          testData.marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record[testData.marcFile.propertyName].id);
          });
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.exportManagerAll.gui,
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.inventoryAll.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          Permissions.dataExportViewAddUpdateProfiles.gui,
        ]).then((userProperties) => {
          testData.userProperties = userProperties;
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        createdAuthorityIDs.forEach((id) => MarcAuthority.deleteViaAPI(id));
        Users.deleteViaApi(testData.userProperties.userId);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        FileManager.deleteFile(`cypress/fixtures/${testData.editedFileNameForUpdate}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.csvFile}`);
      });

      it(
        'C409511 "MARC authority headings updates (CSV)" report is generated for additional types of headings (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C409511'] },
        () => {
          // Export all C409511 authority records as MARC file
          MarcAuthorities.searchBy(testData.searchOption, testData.searchValue);
          MarcAuthorities.selectAllRecords();
          MarcAuthorities.exportSelected();
          cy.wait(1000);
          ExportFile.downloadCSVFile(testData.csvFile, 'QuickAuthorityExport*');

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          ExportFile.uploadFile(testData.csvFile);
          ExportFile.exportWithDefaultJobProfile(
            testData.csvFile,
            'Default authority',
            'Authorities',
          );
          ExportFile.downloadExportedMarcFile(testData.exportedMarcFile);

          // Edit the exported file to update all headings with " UPD" suffix
          DataImport.editMarcFile(
            testData.exportedMarcFile,
            testData.editedFileNameForUpdate,
            [/AT_C409511_MarcAuthority/g],
            ['AT_C409511_MarcAuthority UPD'],
          );

          // Steps 1-3: Upload the updated file and import using the update job profile
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.uploadFile(testData.editedFileNameForUpdate, testData.uploadedMarcFile);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(testData.uploadedMarcFile);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.uploadedMarcFile);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.authority,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });

          // Step 4: Go to MARC authority app
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
          MarcAuthorities.waitLoading();

          // Steps 5-8: Generate "MARC authority headings updates (CSV)" report
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);
          MarcAuthorities.clickExportButton();

          cy.intercept('POST', '/data-export-spring/jobs').as('getId');
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            const jobID = item.response.body.name;
            const expectedJobData = [
              jobID,
              expectedJobValues.status,
              expectedJobValues.jobType,
              expectedJobValues.description,
              testData.userProperties.username,
              todayWithoutPaddingZero,
            ];
            const expectedJobDetails = {
              jobID,
              status: expectedJobValues.status,
              jobType: expectedJobValues.jobType,
              outputType: expectedJobValues.outputType,
              description: expectedJobValues.description,
              source: testData.userProperties.username,
              startDate: todayWithoutPaddingZero,
              endDate: todayWithoutPaddingZero,
            };

            // Steps 9-10: Go to Export Manager, verify and download the report
            MarcAuthorities.checkCalloutAfterExport(jobID);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.waitLoading();
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.verifyJobDataInResults(expectedJobData);
            ExportManagerSearchPane.openJobDetailView(jobID);
            ExportManagerSearchPane.verifyJobDataInDetailView(expectedJobDetails);
            ExportManagerSearchPane.downloadLastCreatedJob(jobID);
          });

          // Step 11: Verify downloaded CSV contains entries for ALL updated heading types
          const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
          const fileNameMask = `${downloadedReportDate}*`;
          FileManager.verifyFile(
            MarcAuthorities.verifyMARCAuthorityFileName,
            fileNameMask,
            MarcAuthorities.verifyContentOfExportFile,
            [
              downloadedReportDate,
              // Personal name (100)
              'AT_C409511_MarcAuthority Personal name 100',
              'AT_C409511_MarcAuthority UPD Personal name 100',
              // Personal name-title (100)
              'AT_C409511_MarcAuthority Personal name-title 100',
              'AT_C409511_MarcAuthority UPD Personal name-title 100',
              // Corporate name (110)
              'AT_C409511_MarcAuthority Corporate name 110',
              'AT_C409511_MarcAuthority UPD Corporate name 110',
              // Corporate name-title (110)
              'AT_C409511_MarcAuthority Corporate name-title 110',
              'AT_C409511_MarcAuthority UPD Corporate name-title 110',
              // Conference Name (111)
              'AT_C409511_MarcAuthority Conference Name 111',
              'AT_C409511_MarcAuthority UPD Conference Name 111',
              // Conference Name-title (111)
              'AT_C409511_MarcAuthority Conference Name-title 111',
              'AT_C409511_MarcAuthority UPD Conference Name-title 111',
              // Uniform title (130)
              'AT_C409511_MarcAuthority Uniform title 130',
              'AT_C409511_MarcAuthority UPD Uniform title 130',
              // Named Event (147)
              'AT_C409511_MarcAuthority Named Event 147',
              'AT_C409511_MarcAuthority UPD Named Event 147',
              // Chronological Term (148)
              'AT_C409511_MarcAuthority Chronological Term 148',
              'AT_C409511_MarcAuthority UPD Chronological Term 148',
              // Subject (150)
              'AT_C409511_MarcAuthority Subject 150',
              'AT_C409511_MarcAuthority UPD Subject 150',
              // Geographic name (151)
              'AT_C409511_MarcAuthority Geographic name 151',
              'AT_C409511_MarcAuthority UPD Geographic name 151',
              // Genre (155)
              'AT_C409511_MarcAuthority Genre 155',
              'AT_C409511_MarcAuthority UPD Genre 155',
              // Medium of Performance Term (162)
              'AT_C409511_MarcAuthority Medium of Performance Term 162',
              'AT_C409511_MarcAuthority UPD Medium of Performance Term 162',
              // General Subdivision (180)
              'AT_C409511_MarcAuthority General Subdivision 180',
              'AT_C409511_MarcAuthority UPD General Subdivision 180',
              // Geographic Subdivision (181)
              'AT_C409511_MarcAuthority Geographic Subdivision 181',
              'AT_C409511_MarcAuthority UPD Geographic Subdivision 181',
              // Chronological Subdivision (182)
              'AT_C409511_MarcAuthority Chronological Subdivision 182',
              'AT_C409511_MarcAuthority UPD Chronological Subdivision 182',
              // Form Subdivision (185)
              'AT_C409511_MarcAuthority Form Subdivision 185',
              'AT_C409511_MarcAuthority UPD Form Subdivision 185',
            ],
          );
        },
      );
    });
  });
});
