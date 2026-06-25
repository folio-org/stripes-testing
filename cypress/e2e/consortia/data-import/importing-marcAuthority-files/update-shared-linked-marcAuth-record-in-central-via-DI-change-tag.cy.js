import {
  ACCEPTED_DATA_TYPE_NAMES,
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
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
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
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(5);

      const testData = {
        authoritySearchOption: 'Keyword',
        authorityHeading: `C407688 Test Authority ${randomPostfix}`,
        authorityNaturalId: `n${randomLetters}`,
        tag100: '100',
        tag110: '110',
        tag010: '010',
        linkingFieldRowIndex: 5,
        csvFileNameForExport: `C407688-export-${randomPostfix}.csv`,
        exportedMarcFileName: `C407688-exported-${randomPostfix}.mrc`,
        uploadedMarcFileName: `C407688-upload-${randomPostfix}.mrc`,
      };

      const marcAuthFields = [
        {
          tag: testData.tag010,
          content: `$a ${testData.authorityNaturalId}`,
          indicators: ['\\', '\\'],
        },
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
      ];

      const getMarcBibFields = (instanceTitle) => [
        {
          tag: '008',
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: '245',
          content: `$a ${instanceTitle}`,
          indicators: ['1', '0'],
        },
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading} $e author.`,
          indicators: ['1', '\\'],
        },
      ];

      const mappingProfile = {
        name: `C407688 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
      };

      const actionProfile = {
        folioRecordType: 'MARC_AUTHORITY',
        name: `C407688 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
        action: 'UPDATE',
      };

      const matchProfile = {
        profileName: `C407688 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
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
        profileName: `C407688 Update MARC authority records by matching 999 ff $s subfield value ${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      const linkedBibInstances = {
        shared1: `C407688 Instance Shared 1 ${randomPostfix}`,
        shared2: `C407688 Instance Shared 2 ${randomPostfix}`,
        shared3: `C407688 Instance Shared 3 ${randomPostfix}`,
        localM1: `C407688 Instance Local M1 ${randomPostfix}`,
        localM2: `C407688 Instance Local M2 ${randomPostfix}`,
      };

      const users = {};
      const createdRecordIDs = [];
      let createdAuthorityID;

      before('Create test data and login', () => {
        cy.getAdminToken();

        // Clean up any existing C407688 records from previous test runs
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C407688');
        InventoryInstances.deleteInstanceByTitleViaApi('C407688');
        cy.setTenant(Affiliations.University);
        InventoryInstances.deleteInstanceByTitleViaApi('C407688');

        cy.setTenant(Affiliations.College);
        InventoryInstances.deleteInstanceByTitleViaApi('C407688');

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
            // Create shared authority in Central tenant
            cy.resetTenant();
            MarcAuthorities.createMarcAuthorityViaAPI(
              testData.authorityNaturalId,
              '',
              marcAuthFields,
            ).then((authorityId) => {
              createdAuthorityID = authorityId;
            });

            // Create 3 shared bib records in Central tenant
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              getMarcBibFields(linkedBibInstances.shared1),
            ).then((bibId) => {
              createdRecordIDs.push(bibId);
            });

            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              getMarcBibFields(linkedBibInstances.shared2),
            ).then((bibId) => {
              createdRecordIDs.push(bibId);
            });

            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              getMarcBibFields(linkedBibInstances.shared3),
            ).then((bibId) => {
              createdRecordIDs.push(bibId);
            });

            // Create local bib in Member 1 (University) tenant
            cy.setTenant(Affiliations.University);
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              getMarcBibFields(linkedBibInstances.localM1),
            ).then((bibId) => {
              createdRecordIDs.push(bibId);
            });

            // Create local bib in Member 2 (College) tenant
            cy.setTenant(Affiliations.College);
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              getMarcBibFields(linkedBibInstances.localM2),
            ).then((bibId) => {
              createdRecordIDs.push(bibId);
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

        // Delete exported MARC file
        FileManager.deleteFile(`cypress/fixtures/${testData.csvFileNameForExport}`);
        FileManager.deleteFile(`cypress/fixtures/${testData.exportedMarcFileName}`);
      });

      it(
        'C407688 Update shared linked "MARC Authority" record in Central tenant via Data Import (change tag of linked field) (consortia) (spitfire)',
        { tags: ['extendedPathECS', 'spitfire', 'C407688'] },
        () => {
          // Step 1-2: Verify authority record exists
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityHeading);
          MarcAuthorities.verifyResultsRowContent(testData.authorityHeading);

          // Step 3: Update authority tag from 100 to 110 via API (simulating the change)
          cy.getMarcRecordDataViaAPI(createdAuthorityID, true).then((marcData) => {
            const field100 = marcData.fields.find((f) => f.tag === testData.tag100);
            // Change tag from 100 to 110
            field100.tag = testData.tag110;
            cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData, true).then(
              ({ status }) => {
                expect(status).to.eq(202);
              },
            );
          });

          // Step 4-5: Wait for update to propagate and export authority record
          cy.wait(2000);
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

          // Step 6-7: Import exported MARC file with updated tag via Data Import
          cy.visit(TopMenu.dataImportPath);
          DataImport.verifyUploadState();
          DataImport.uploadFileAndRetry(
            testData.exportedMarcFileName,
            testData.uploadedMarcFileName,
          );
          JobProfiles.waitLoadingList();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(testData.uploadedMarcFileName);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(testData.uploadedMarcFileName);
          Logs.verifyInstanceStatus(0, 2, RECORD_STATUSES.UPDATED);

          // Wait for unlinking to propagate across all tenants
          cy.wait(10000);

          // Step 8-9: Verify first shared bib in Central (Instance Shared 1) - should be unlinked
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(linkedBibInstances.shared1);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.shared1);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyRowLinked(testData.linkingFieldRowIndex, false);
          QuickMarcEditor.closeEditorPane();

          // Step 10-12: Verify second shared bib in Member 1 (Instance Shared 2) - should be unlinked
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventoryInstances.searchByTitle(linkedBibInstances.shared2);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.shared2);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyRowLinked(testData.linkingFieldRowIndex, false);
          QuickMarcEditor.closeEditorPane();

          // Step 13-14: Verify local bib in Member 1 (Instance Local M1) - should be unlinked
          InventoryInstances.searchByTitle(linkedBibInstances.localM1);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.localM1);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyRowLinked(testData.linkingFieldRowIndex, false);
          QuickMarcEditor.closeEditorPane();

          // Step 15-17: Verify third shared bib in Member 2 (Instance Shared 3) - should be unlinked
          ConsortiumManager.switchActiveAffiliation(tenantNames.university, tenantNames.college);
          InventoryInstances.waitContentLoading();
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          InventorySearchAndFilter.clearDefaultFilter('Held by');
          InventoryInstances.searchByTitle(linkedBibInstances.shared3);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.shared3);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyRowLinked(testData.linkingFieldRowIndex, false);
          QuickMarcEditor.closeEditorPane();

          // Step 18-19: Verify local bib in Member 2 (Instance Local M2) - should be unlinked
          InventoryInstances.searchByTitle(linkedBibInstances.localM2);
          InventoryInstances.selectInstanceByTitle(linkedBibInstances.localM2);
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.verifyRowLinked(testData.linkingFieldRowIndex, false);
          QuickMarcEditor.closeEditorPane();

          // Step 20: Verify authority record now has tag 110 instead of 100
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.searchBy(testData.authoritySearchOption, testData.authorityHeading);
          MarcAuthorities.selectTitle(`Shared\n${testData.authorityHeading}`);
          MarcAuthority.contains(testData.tag110);
        },
      );
    });
  });
});
