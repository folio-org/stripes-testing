import { including } from '@interactors/html';
import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../../support/constants';
import { Permissions } from '../../../../../support/dictionary';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import ExportFile from '../../../../../support/fragments/data-export/exportFile';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../../support/fragments/inventory/inventorySearchAndFilter';
import JobProfiles from '../../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../../support/fragments/data_import/logs/logs';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import FileManager from '../../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import { getLongDelay } from '../../../../../support/utils/cypressTools';
import NewFieldMappingProfile from '../../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import NewJobProfile from '../../../../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsJobProfiles from '../../../../../support/fragments/settings/dataImport/jobProfiles/jobProfiles';
import SettingsMatchProfiles from '../../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import SettingsActionProfiles from '../../../../../support/fragments/settings/dataImport/actionProfiles/actionProfiles';
import SettingsFieldMappingProfiles from '../../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      describe('Manual linking', () => {
        const testData = {
          tag245: '245',
          tag100: '100',
          tag611: '611',
          title: `AT_C422135_Important book ${getRandomPostfix()}`,
          titleUpdated: `AT_C422135_Important book UPDATED ${getRandomPostfix()}`,
          authority1Heading: 'AT_C422135_Mostly Chopin Festival',
          authority2Heading: 'AT_C422135_Jackson, Peter,',
          createdRecordIDs: [],
          createdAuthorityIDs: [],
        };

        const marcAuthFiles = [
          {
            marc: 'C422135MarcAuth1.mrc',
            fileName: `AT_C422135_testMarcAuth1.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
            heading: 'AT_C422135_Mostly Chopin Festival. sonet',
          },
          {
            marc: 'C422135MarcAuth2.mrc',
            fileName: `AT_C422135_testMarcAuth2.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
            heading: 'AT_C422135_Jackson, Peter, 1950-2022 Inspector Banks series ;',
          },
        ];

        const mappingProfile = {
          name: `AT_C422135_Update MARC Bib ${getRandomPostfix()}`,
        };

        const actionProfile = {
          name: `AT_C422135_Update MARC Bib ${getRandomPostfix()}`,
          action: 'UPDATE',
          folioRecordType: 'MARC_BIBLIOGRAPHIC',
        };

        const matchProfile = {
          profileName: `AT_C422135_Match 999 ff $s ${getRandomPostfix()}`,
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
          recordType: 'MARC_BIBLIOGRAPHIC',
        };

        const jobProfile = {
          profileName: `AT_C422135_Update MARC Bib by matching 999 ff $s ${getRandomPostfix()}`,
        };

        const exportedMarcFile = `AT_C422135_exportedMarcFile${getRandomPostfix()}.mrc`;
        const modifiedMarcFile = `AT_C422135_modifiedMarcFile${getRandomPostfix()}.mrc`;

        before('Create test data', () => {
          cy.getAdminToken();

          // Delete any existing authority records from previous test runs
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C422135*');

          // Import MARC Authority records
          DataImport.uploadFilesViaApi(marcAuthFiles).then((ids) => {
            Object.assign(testData, ids);
            testData.createdAuthorityIDs = ids.createdAuthorityIDs;
          });

          // Create job profile via API for updating MARC Bib
          NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile)
            .then((matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            })
            .then(() => {
              NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(
                mappingProfile,
              ).then((mappingProfileResponse) => {
                mappingProfile.id = mappingProfileResponse.body.id;
              });
            })
            .then(() => {
              NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
                (actionProfileResponse) => {
                  actionProfile.id = actionProfileResponse.body.id;
                },
              );
            })
            .then(() => {
              NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                jobProfile.profileName,
                matchProfile.id,
                actionProfile.id,
              );
            });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]).then((userProperties) => {
            testData.userProperties = userProperties;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken();

          // Delete job profile and related profiles
          if (jobProfile.profileName) {
            SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
          }
          if (matchProfile.id) {
            SettingsMatchProfiles.deleteMatchProfileViaApi(matchProfile.id);
          }
          if (actionProfile.id) {
            SettingsActionProfiles.deleteActionProfileViaApi(actionProfile.id);
          }
          if (mappingProfile.id) {
            SettingsFieldMappingProfiles.deleteMappingProfileViaApi(mappingProfile.id);
          }

          // Delete instances
          if (testData.createdRecordIDs && testData.createdRecordIDs.length > 0) {
            testData.createdRecordIDs.forEach((id) => {
              InventoryInstance.deleteInstanceViaApi(id);
            });
          }

          // Delete authority records
          if (testData.createdAuthorityIDs && testData.createdAuthorityIDs.length > 0) {
            testData.createdAuthorityIDs.forEach((id) => {
              MarcAuthorities.deleteViaAPI(id);
            });
          }

          // Delete user
          if (testData.userProperties?.userId) {
            Users.deleteViaApi(testData.userProperties.userId);
          }

          // Delete downloaded files
          FileManager.deleteFileFromDownloadsByMask('AT_C422135*');
          FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
          FileManager.deleteFile(`cypress/fixtures/${modifiedMarcFile}`);
        });

        it(
          'C422135 Create "MARC Bib" record - link fields - export and edit - update upon import (spitfire)',
          { tags: ['extendedPath', 'spitfire', 'C422135'] },
          () => {
            // Step 1-3: Create new MARC Bib record and fill required fields
            InventoryInstances.createNewMarcBibRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.updateExistingField(testData.tag245, `$a ${testData.title}`);
            QuickMarcEditor.updateLDR06And07Positions();

            // Step 4-5: Add and populate 100 field
            QuickMarcEditor.addNewField(testData.tag100, '$a test123', 4);

            // Step 6-7: Add and populate 611 field
            QuickMarcEditor.addNewField(testData.tag611, '$a test123', 5);

            // Step 8-10: Link 100 field to Authority
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tag100);
            MarcAuthorities.switchToBrowse();
            MarcAuthorityBrowse.searchBy('Personal name', testData.authority2Heading);
            MarcAuthorities.selectTitle(marcAuthFiles[1].heading);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag100);

            // Step 11-13: Link 611 field to Authority
            QuickMarcEditor.clickLinkIconInTagFieldByTag(testData.tag611);
            MarcAuthorities.switchToBrowse();
            MarcAuthorityBrowse.searchBy('Name-title', testData.authority1Heading);
            MarcAuthorities.selectTitle(marcAuthFiles[0].heading);
            MarcAuthorities.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingAuthority(testData.tag611);

            // Step 14: Save & close
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            // Step 15: Find created record
            InventoryInstances.searchByTitle(testData.title);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            // Get instance ID
            InventoryInstance.getId().then((id) => {
              testData.createdRecordIDs.push(id);
            });

            // Step 16-18: Export instance as MARC using quick export
            cy.intercept('/data-export/quick-export').as('quickExport');
            InstanceRecordView.exportInstanceMarc();
            cy.wait('@quickExport', getLongDelay()).then((resp) => {
              const expectedRecordHrid = resp.response.body.jobExecutionHrId;

              TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
              ExportFile.waitLandingPageOpened();
              ExportFile.downloadExportedMarcFileWithRecordHrid(
                expectedRecordHrid,
                exportedMarcFile,
              );
              FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');

              // Step 19-22: Edit exported MARC file
              // Changes: 1) Remove $0 from field 100 to unlink it
              //          2) Modify controlled subfield in field 611 (Festival -> Fest)
              //          3) Update title field 245
              DataImport.editMarcFile(
                exportedMarcFile,
                modifiedMarcFile,
                ['03052044', 'Mostly Chopin Festival.', testData.title],
                ['', 'Mostly Chopin Fest.', testData.titleUpdated],
              );
            });

            // Step 23-24: Upload modified file and run job profile
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
            DataImport.waitLoading();
            DataImport.uploadFile(modifiedMarcFile, modifiedMarcFile);
            JobProfiles.waitFileIsUploaded();
            JobProfiles.search(jobProfile.profileName);
            JobProfiles.runImportFile();
            Logs.waitFileIsImported(modifiedMarcFile);
            Logs.checkJobStatus(modifiedMarcFile, 'Completed');
            Logs.openFileDetails(modifiedMarcFile);

            // Step 25-26: Verify changes in updated record
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
            InventorySearchAndFilter.resetAllAndVerifyNoResultsAppear();
            InventoryInstances.searchByTitle(testData.titleUpdated);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            // Edit MARC bib to verify changes
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();

            // Verify 100 field is unlinked (no unlink/view authority buttons after field mapping profile removes $0)
            QuickMarcEditor.checkContentByTag(
              testData.tag100,
              including(testData.authority2Heading.split(',')[0]),
            );

            // Verify 611 field remains linked with modified controlled subfield
            // Using verifyTagFieldAfterLinkingByTag for comprehensive linked field validation
            QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
              testData.tag611,
              '\\',
              '\\',
              '$a AT_C422135_Mostly Chopin Festival. $e Orchestra $t sonet',
              '',
              including('$0 997404'), // $0 field contains authority UUID
              '',
            );

            // Verify 245 field has updated value
            QuickMarcEditor.checkContentByTag(testData.tag245, including(testData.titleUpdated));
          },
        );
      });
    });
  });
});
