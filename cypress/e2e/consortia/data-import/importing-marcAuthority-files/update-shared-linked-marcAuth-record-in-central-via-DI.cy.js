/* eslint-disable newline-per-chained-call */
import {
  ACCEPTED_DATA_TYPE_NAMES,
  DEFAULT_JOB_PROFILE_NAMES,
  EXISTING_RECORD_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    describe('Consortia', () => {
      const testData = {
        authoritySearchOption: 'Keyword',
        authorityHeading: 'C407641 Lentz Shared',
        updatedAuthorityHeading: 'C407641 Lentz Shared (Updated in C)',
        tag100: '100',
        updated100FieldValue: '$a C407641 Lentz Shared (Updated in C)',
        linkingFieldRowIndex: 16,
        csvFileNameForExport: `C407641-export-${getRandomPostfix()}.csv`,
        exportedMarcFileName: `C407641-exported-${getRandomPostfix()}.mrc`,
        modifiedMarcFileName: `C407641-modified-${getRandomPostfix()}.mrc`,
        uploadedMarcFileName: `C407641-upload-${getRandomPostfix()}.mrc`,
      };

      const marcFiles = {
        authoritySharedCentral: {
          marc: 'C407641_MARC_Auth_Shared_Central.mrc',
          fileName: `C407641 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          propertyName: 'authority',
          tenant: tenantNames.central,
        },
        bibsSharedCentral: {
          marc: 'C407641_MARC_Bib_Shared_Central.mrc',
          fileName: `C407641 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          numOfRecords: 3,
          tenant: tenantNames.central,
        },
        bibLocalM1: {
          marc: 'C407641_MARC_Bib_Local_M1.mrc',
          fileName: `C407641 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          tenant: tenantNames.university,
        },
        bibLocalM2: {
          marc: 'C407641_MARC_Bib_Local_M2.mrc',
          fileName: `C407641 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          propertyName: 'instance',
          tenant: tenantNames.college,
        },
      };

      const mappingProfile = {
        name: `C407641 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      };

      const actionProfile = {
        folioRecordType: 'MARC_AUTHORITY',
        name: `C407641 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
        action: 'UPDATE',
      };

      const matchProfile = {
        profileName: `C407641 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
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
        ...NewJobProfile.defaultJobProfile,
        profileName: `C407641 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      const linkedBibInstances = {
        shared1: 'C407641 Instance Shared 1',
        shared2: 'C407641 Instance Shared 2',
        shared3: 'C407641 Instance Shared 3',
        localM1: 'C407641 Instance Local M1',
        localM2: 'C407641 Instance Local M2',
      };

      const users = {};
      const createdRecordIDs = [];
      let createdAuthorityID;

      before('Create test data and login', () => {
        cy.getAdminToken();

        // Clean up any existing C407641 records from previous test runs
        // Delete authority records in Central tenant
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407641');
        InventoryInstances.deleteInstanceByTitleViaApi('C407641');
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteInstanceByTitleViaApi('C407641');

        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('C407641');

        // Reset to Central tenant
        cy.resetTenant();

        // Create user with permissions for all three tenants
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;

            // Assign affiliations to Member 1 (University) and Member 2 (College)
            cy.assignAffiliationToUser(Affiliations.University, users.userProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.moduleDataImportEnabled.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);

            cy.resetTenant();

            // Assign permissions in Member 2 (College) tenant
            cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userProperties.userId, [
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
              Permissions.uiInventoryViewInstances.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
            cy.resetTenant();
          })
          .then(() => {
            // Create Data Import profiles in Central tenant
            cy.resetTenant();

            // Create Match profile
            NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile)
              .then((matchProfileResponse) => {
                matchProfile.id = matchProfileResponse.body.id;

                // Create Field mapping profile
                return NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(
                  mappingProfile,
                );
              })
              .then((mappingProfileResponse) => {
                mappingProfile.id = mappingProfileResponse.body.id;

                // Create Action profile
                return NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id);
              })
              .then((actionProfileResponse) => {
                actionProfile.id = actionProfileResponse.body.id;

                // Create Job profile
                return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                  jobProfile.profileName,
                  matchProfile.id,
                  actionProfile.id,
                );
              });
          })
          .then(() => {
            // Import MARC files to respective tenants
            cy.resetTenant();

            // Import shared authority to Central tenant
            DataImport.uploadFileViaApi(
              marcFiles.authoritySharedCentral.marc,
              marcFiles.authoritySharedCentral.fileName,
              marcFiles.authoritySharedCentral.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdAuthorityID = record[marcFiles.authoritySharedCentral.propertyName].id;
              });
            });

            // Import shared bibs to Central tenant
            DataImport.uploadFileViaApi(
              marcFiles.bibsSharedCentral.marc,
              marcFiles.bibsSharedCentral.fileName,
              marcFiles.bibsSharedCentral.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFiles.bibsSharedCentral.propertyName].id);
              });
            });

            // Import local bib to Member 1 (University) tenant
            cy.setTenant(Affiliations.University);
            DataImport.uploadFileViaApi(
              marcFiles.bibLocalM1.marc,
              marcFiles.bibLocalM1.fileName,
              marcFiles.bibLocalM1.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFiles.bibLocalM1.propertyName].id);
              });
            });

            // Import local bib to Member 2 (College) tenant
            cy.setTenant(Affiliations.College);
            DataImport.uploadFileViaApi(
              marcFiles.bibLocalM2.marc,
              marcFiles.bibLocalM2.fileName,
              marcFiles.bibLocalM2.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFiles.bibLocalM2.propertyName].id);
              });
            });
          })
          .then(() => {
            // Link all bibliographic records to the shared authority
            cy.resetTenant();

            // Link Central shared bibs (Instance Shared 1, 2, 3)
            createdRecordIDs.slice(0, 3).forEach((bibId) => {
              QuickMarcEditor.linkMarcRecordsViaApi({
                bibId,
                authorityIds: [createdAuthorityID],
                bibFieldTags: [testData.tag100],
                authorityFieldTags: [testData.tag100],
                finalBibFieldContents: [`$a ${testData.authorityHeading}`],
              });
            });

            // Link Member 1 local bib (Instance Local M1)
            cy.setTenant(Affiliations.University);
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: createdRecordIDs[3],
              authorityIds: [createdAuthorityID],
              bibFieldTags: [testData.tag100],
              authorityFieldTags: [testData.tag100],
              finalBibFieldContents: [`$a ${testData.authorityHeading}`],
            });

            // Link Member 2 local bib (Instance Local M2)
            cy.setTenant(Affiliations.College);
            QuickMarcEditor.linkMarcRecordsViaApi({
              bibId: createdRecordIDs[4],
              authorityIds: [createdAuthorityID],
              bibFieldTags: [testData.tag100],
              authorityFieldTags: [testData.tag100],
              finalBibFieldContents: [`$a ${testData.authorityHeading}`],
            });
          })
          .then(() => {
            cy.resetTenant();
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);

        // Delete authority record
        if (createdAuthorityID) {
          MarcAuthority.deleteViaAPI(createdAuthorityID);
        }

        // Delete bibliographic records
        createdRecordIDs.slice(0, 3).forEach((instanceId) => {
          InventoryInstance.deleteInstanceViaApi(instanceId);
        });

        cy.setTenant(Affiliations.University);
        if (createdRecordIDs[3]) {
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[3]);
        }

        cy.setTenant(Affiliations.College);
        if (createdRecordIDs[4]) {
          InventoryInstance.deleteInstanceViaApi(createdRecordIDs[4]);
        }

        // Delete Data Import profiles
        cy.resetTenant();
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);

        // Delete exported and modified MARC files
        FileManager.deleteFile(`cypress/fixtures/${testData.csvFileNameForExport}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.modifiedMarcFileName}`);
      });

      it(
        'C407641 Update shared linked "MARC Authority" record in Central tenant via Data Import (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C407641'] },
        () => {
          // Step 1-2: Search authority records for export
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityHeading);

          // Step 3-4: Export authority record
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityHeading);
          MarcAuthorities.selectAllRecords();
          MarcAuthorities.exportSelected();
          ExportFile.downloadCSVFile(testData.csvFileNameForExport, 'QuickAuthorityExport*');

          cy.visit(TopMenu.dataExportPath);
          ExportFile.uploadFile(testData.csvFileNameForExport);
          ExportFile.exportWithDefaultJobProfile(
            testData.csvFileNameForExport,
            'Default authority',
            'Authorities',
          );
          ExportFile.downloadExportedMarcFile(testData.exportedMarcFileName);
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));

          // Step 5: Edit exported MARC file - update 100 field
          cy.readFile(`cypress/fixtures/${testData.exportedMarcFileName}`, 'binary').then(
            (fileContent) => {
              // Replace the 100 field content with updated value
              const modifiedContent = fileContent.replace(
                testData.authorityHeading,
                testData.updatedAuthorityHeading,
              );
              cy.writeFile(
                `cypress/fixtures/${testData.modifiedMarcFileName}`,
                modifiedContent,
                'binary',
              );
            },
          );

          // Step 6-7: Import updated MARC file via Data Import
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(
            testData.modifiedMarcFileName,
            testData.uploadedMarcFileName,
          );
          JobProfiles.waitLoadingList();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(testData.uploadedMarcFileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.uploadedMarcFileName);
          Logs.verifyInstanceStatus(0, 2, RECORD_STATUSES.UPDATED);

          // Step 8-9: Verify first shared bib in Central (Instance Shared 1)
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(linkedBibInstances.shared1);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.shared1);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            testData.linkingFieldRowIndex,
            testData.tag100,
            '1',
            '\\',
            testData.updated100FieldValue,
            '',
            '$0 http://id.loc.gov/authorities/names/n2011049161407641',
            '',
          );
          QuickMarcEditor.closeEditorPane();

          // Step 10-12: Verify second shared bib in Member 1 (Instance Shared 2)
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InventoryInstances.searchByTitle(linkedBibInstances.shared2);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.shared2);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            testData.linkingFieldRowIndex,
            testData.tag100,
            '1',
            '\\',
            testData.updated100FieldValue,
            '',
            '$0 http://id.loc.gov/authorities/names/n2011049161407641',
            '',
          );
          QuickMarcEditor.closeEditorPane();

          // Step 13-14: Verify local bib in Member 1 (Instance Local M1)
          InventoryInstances.searchByTitle(linkedBibInstances.localM1);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.localM1);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            testData.linkingFieldRowIndex,
            testData.tag100,
            '1',
            '\\',
            testData.updated100FieldValue,
            '',
            '$0 http://id.loc.gov/authorities/names/n2011049161407641',
            '',
          );
          QuickMarcEditor.closeEditorPane();

          // Step 15-17: Verify third shared bib in Member 2 (Instance Shared 3)
          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.college);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventoryInstances.searchByTitle(linkedBibInstances.shared3);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.shared3);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            testData.linkingFieldRowIndex,
            testData.tag100,
            '1',
            '\\',
            testData.updated100FieldValue,
            '',
            '$0 http://id.loc.gov/authorities/names/n2011049161407641',
            '',
          );
          QuickMarcEditor.closeEditorPane();

          // Step 18-19: Verify local bib in Member 2 (Instance Local M2)
          InventoryInstances.searchByTitle(linkedBibInstances.localM2);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.localM2);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyTagFieldAfterLinking(
            testData.linkingFieldRowIndex,
            testData.tag100,
            '1',
            '\\',
            testData.updated100FieldValue,
            '',
            '$0 http://id.loc.gov/authorities/names/n2011049161407641',
            '',
          );
          QuickMarcEditor.closeEditorPane();
        },
      );
    });
  });
});
