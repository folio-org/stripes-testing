import { EXISTING_RECORD_NAMES } from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const randomPostfix = getRandomPostfix();
      const tags = { tag008: '008', tag245: '245', tag500: '500' };
      const bibTitle = `AT_C411796_MarcBibInstance_${randomPostfix}`;
      const bibNote = `AT_C411796_Note_${randomPostfix}`;
      const bibTitleUpdatedByA = `${bibTitle} (with Updates by A)`;
      const bibTitleUpdatedByB = `${bibTitle} (with Updates by B)`;
      const bibNoteUpdatedByB = `${bibNote} (with Updates by B)`;
      const bibFields = [
        { tag: tags.tag008, content: QuickMarcEditor.valid008ValuesInstance },
        { tag: tags.tag245, content: `$a ${bibTitle}`, indicators: ['1', '1'] },
        { tag: tags.tag500, content: `$a ${bibNote}`, indicators: ['\\', '\\'] },
      ];

      const mappingProfile = { name: `AT_C411796_Update MARC Bib ${randomPostfix}` };
      const actionProfile = {
        name: `AT_C411796_Update MARC Bib ${randomPostfix}`,
        action: 'UPDATE',
        folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const matchProfile = {
        profileName: `AT_C411796_Match 999 ff $s ${randomPostfix}`,
        incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
        recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const jobProfile = {
        profileName: `AT_C411796_Update MARC Bib by matching 999 ff $s ${randomPostfix}`,
      };

      const csvFile = `AT_C411796_export${randomPostfix}.csv`;
      const exportedMarcFile = `AT_C411796_exportedMarcFile${randomPostfix}.mrc`;
      const modifiedMarcFile = `AT_C411796_modifiedMarcFile${randomPostfix}.mrc`;
      const importedFileName = `AT_C411796_importedFile${randomPostfix}.mrc`;

      const userAPermissions = [
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ];
      // User B in Member 1: Data import, Inventory all, "Module Data-Export Enabled"
      const userBPermissions = [
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.dataExportEnableApp.gui,
        // User B exports the record in the test
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        // Without it Data import can't update a shared record in Central from a Member tenant
        Permissions.consortiaCentralAll.gui,
      ];
      // User B in Central: Data import only
      const userBCentralPermissions = [Permissions.moduleDataImportEnabled.gui];
      const testData = {};

      // The shared instance gets a shadow copy in a Member tenant when it has Holdings there
      const createHoldingsInMember = (affiliation, holdingsKey) => {
        cy.setTenant(affiliation);
        cy.getLocations({ limit: 1, query: 'name<>"AT_*" and name<>"*auto*"' }).then((location) => {
          InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
            InventoryHoldings.createHoldingRecordViaApi({
              instanceId: testData.instanceId,
              permanentLocationId: location.id,
              sourceId: folioSource.id,
            }).then((createdHoldings) => {
              testData[holdingsKey] = createdHoldings.id;
            });
          });
        });
      };

      before('Create test data and users', () => {
        cy.resetTenant();
        cy.getAdminToken();
        [Affiliations.College, Affiliations.University, Affiliations.Consortia].forEach(
          (affiliation) => {
            cy.withinTenant(affiliation, () => {
              InventoryInstances.deleteFullInstancesByTitleViaApi('C411796_');
            });
          },
        );

        // Shared MARC bib: created in Central
        cy.resetTenant();
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, bibFields).then(
          (instanceId) => {
            testData.instanceId = instanceId;
          },
        );

        cy.then(() => {
          // Holdings in both Member tenants - the instance has a shadow copy in each of them
          createHoldingsInMember(Affiliations.College, 'collegeHoldingsId');
          createHoldingsInMember(Affiliations.University, 'universityHoldingsId');
        })
          .then(() => {
            // The job profile "Update MARC Bib records by matching 999 ff $s subfield value" is
            // created in Member 1 (College)
            cy.setTenant(Affiliations.College);
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
          })
          .then(() => {
            // User A: created in Member 2 (University) - the test starts there; the permissions
            // in Central too (the Central affiliation is automatic)
            cy.setTenant(Affiliations.University);
            cy.createTempUser(userAPermissions).then((userProperties) => {
              testData.userA = userProperties;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testData.userA.userId, userAPermissions);
            });
          })
          .then(() => {
            // User B: created in Member 1 (College); in Central only Data import
            cy.setTenant(Affiliations.College);
            cy.createTempUser(userBPermissions).then((userProperties) => {
              testData.userB = userProperties;

              cy.resetTenant();
              cy.assignPermissionsToExistingUser(testData.userB.userId, userBCentralPermissions);
            });
          })
          .then(() => {
            cy.setTenant(Affiliations.University);
            cy.login(testData.userA.username, testData.userA.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          });
      });

      after('Delete users, data and profiles', () => {
        cy.resetTenant();
        cy.getAdminToken(false);
        FileManager.deleteFile(`cypress/fixtures/${csvFile}`);
        FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
        FileManager.deleteFile(`cypress/fixtures/${modifiedMarcFile}`);
        FileManager.deleteFileFromDownloadsByMask(exportedMarcFile);

        // Each user is deleted from the tenant where it was created; the Holdings are deleted
        // from the Member tenants before the shared instance
        cy.setTenant(Affiliations.University);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.universityHoldingsId);
        Users.deleteViaApi(testData.userA.userId);

        cy.setTenant(Affiliations.College);
        InventoryHoldings.deleteHoldingRecordViaApi(testData.collegeHoldingsId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(testData.userB.userId);

        cy.resetTenant();
        InventoryInstance.deleteInstanceViaApi(testData.instanceId);
      });

      it(
        'C411796 Check quickMARC optimistic locking in member tenant when Shadow "MARC Bib" record updated by a different user in a different member tenant (consortia) (promin)',
        { tags: ['extendedPathECS', 'promin', 'C411796'] },
        () => {
          // Step 1: user A (Member 2) finds the shared record, opens its details
          cy.setTenant(Affiliations.University);
          InventorySearchAndFilter.clearDefaultHeldbyFilter();
          InventoryInstances.searchByTitle(testData.instanceId);
          InventoryInstances.selectInstanceById(testData.instanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();

          // Step 2: Actions > Edit MARC bibliographic record
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag(tags.tag245, `$a ${bibTitle}`);

          // Steps 3-10: the second tab (user B in Member 1) can't be opened in Cypress - user B
          // exports the record, edits 245 and 500 in the file and imports it via API
          cy.wait(2000);
          cy.clearCookies({ domain: null });
          cy.setTenant(Affiliations.College);
          cy.getToken(testData.userB.username, testData.userB.password);
          FileManager.createFile(`cypress/fixtures/${csvFile}`, testData.instanceId);
          ExportFile.exportFileViaApi(csvFile).then((exportJob) => {
            ExportFile.downloadExportedMarcFile(exportedMarcFile, exportJob);
          });
          DataImport.editMarcFile(
            exportedMarcFile,
            modifiedMarcFile,
            [bibTitle, bibNote],
            [bibTitleUpdatedByB, bibNoteUpdatedByB],
          );
          DataImport.uploadFileViaApi(modifiedMarcFile, importedFileName, jobProfile.profileName);
          // The update is applied asynchronously - wait until the title of the record is updated
          cy.recurse(
            () => cy.getInstanceById(testData.instanceId),
            (instance) => instance.title === bibTitleUpdatedByB,
            { limit: 15, delay: 5000, timeout: 70000 },
          );

          // Back to user A in Member 2 - the UI session continues under its token
          cy.clearCookies({ domain: null });
          cy.setTenant(Affiliations.University);
          cy.getToken(testData.userA.username, testData.userA.password);

          // Step 11: user A changes 245, Save & close - the conflict detection banner with the
          // "View latest version" link
          QuickMarcEditor.updateExistingField(tags.tag245, `$a ${bibTitleUpdatedByA}`);
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyOptimisticLockingBanner();

          // Step 12: the link opens the detail view of the updated record
          QuickMarcEditor.clickViewLatestVersionLink();
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.checkInstanceTitle(bibTitleUpdatedByB);

          // Step 13: the editor shows the updates of user B, not of user A; the paneheader
          // shows user B as the source
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.checkContentByTag(tags.tag245, `$a ${bibTitleUpdatedByB}`);
          QuickMarcEditor.checkContentByTag(tags.tag500, `$a ${bibNoteUpdatedByB}`);
          QuickMarcEditor.checkUserNameInHeader(testData.userB.firstName, testData.userB.lastName);
        },
      );
    });
  });
});
