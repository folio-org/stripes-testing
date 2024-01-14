import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  FOLIO_RECORD_TYPE,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import ActionProfiles from '../../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../../support/fragments/data_import/match_profiles/matchProfiles';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import FileManager from '../../../../support/utils/fileManager';
import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
import NewMatchProfile from '../../../../support/fragments/data_import/match_profiles/newMatchProfile';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import BrowseSubjects from '../../../../support/fragments/inventory/search/browseSubjects';
import BrowseContributors from '../../../../support/fragments/inventory/search/browseContributors';
import FieldMappingProfileView from '../../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    describe('Consortia', () => {
      const users = {};
      const testData = {
        sharedInstanceId: [],
        marcFile: {
          marc: 'marcBibFileForC405528.mrc',
          fileName: `C405528 testMarcFile${getRandomPostfix()}.mrc`,
          jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
          exportedFileName: `C405528 exportedTestMarcFile${getRandomPostfix()}.mrc`,
          modifiedMarcFile: `C405528 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
        },
        instanceTitle: 'C405528 Instance Shared Central',
        updatedInstanceTitle: 'C405528 Instance Shared Central Updated',
      };
      const mappingProfile = {
        name: `C405528 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      };
      const actionProfile = {
        typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        name: `C405528 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
        action: 'UPDATE',
        folioRecordType: 'MARC_BIBLIOGRAPHIC',
      };
      const matchProfile = {
        profileName: `C405528 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
        recordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
      };
      const jobProfileName = `C405528 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

      before('Create test data', () => {
        cy.getAdminToken();
        // cy.loginAsAdmin({
        //   path: TopMenu.dataImportPath,
        //   waiter: DataImport.waitLoading,
        // });
        // DataImport.verifyUploadState();
        // DataImport.uploadFileAndRetry(testData.marcFile.marc, testData.marcFile.fileName);
        // JobProfiles.waitLoadingList();
        // JobProfiles.search(testData.marcFile.jobProfileToRun);
        // JobProfiles.runImportFile();
        // JobProfiles.waitFileIsImported(testData.marcFile.fileName);
        // Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        // Logs.openFileDetails(testData.marcFile.fileName);
        // Logs.getCreatedItemsID().then((link) => {
        //   testData.sharedInstanceId.push(link.split('/')[5]);
        // });
        // cy.logout();

        // create user A
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
          .then((userProperties) => {
            users.userAProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.Consortia, users.userAProperties.userId);
            cy.setTenant(Affiliations.Consortia);
            cy.assignPermissionsToExistingUser(users.userAProperties.userId, [
              Permissions.moduleDataImportEnabled.gui,
            ]);
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.College, users.userAProperties.userId);
            cy.setTenant(Affiliations.College);
            cy.assignPermissionsToExistingUser(users.userAProperties.userId, [
              Permissions.moduleDataImportEnabled.gui,
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.dataExportEnableApp.gui,
            ]);
            NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile).then(
              (mappingProfileResponse) => {
                NewActionProfile.createActionProfileViaApiMarc(
                  actionProfile,
                  mappingProfileResponse.body.id,
                ).then((actionProfileResponse) => {
                  NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                    matchProfile,
                  ).then((matchProfileResponse) => {
                    NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                      jobProfileName,
                      matchProfileResponse.body.id,
                      actionProfileResponse.body.id,
                    );
                  });
                });
              },
            );
            cy.resetTenant();
          });

        // create user B
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ])
          .then((userProperties) => {
            users.userBProperties = userProperties;
          })
          .then(() => {
            cy.assignAffiliationToUser(Affiliations.Consortia, users.userBProperties.userId);
            cy.setTenant(Affiliations.Consortia);
            cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
            cy.resetTenant();
            cy.assignAffiliationToUser(Affiliations.University, users.userBProperties.userId);
            cy.setTenant(Affiliations.University);
            cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
              Permissions.inventoryAll.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            ]);
          })
          .then(() => {
            cy.resetTenant();
            cy.pause();
            cy.login(users.userAProperties.username, users.userAProperties.password);
            ConsortiumManager.switchActiveAffiliation(tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
            cy.visit(TopMenu.inventoryPath);
          });
      });

      it(
        'C405528 User can update shared "MARC Bib" in member tenant via Data import and confirm in central & member tenants (consortia) (folijet)',
        { tags: ['extendedPath', 'folijet'] },
        () => {
          InventoryInstance.searchByTitle(testData.instanceTitle);
          // InventorySearchAndFilter.closeInstanceDetailPane();
          // InventorySearchAndFilter.selectResultCheckboxes(1);
          // InventorySearchAndFilter.verifySelectedRecords(1);
          cy.pause();
          InventorySearchAndFilter.exportInstanceAsMarc();

          // cy.setTenant(Affiliations.College);
          // // download exported marc file
          // cy.visit(TopMenu.dataExportPath);
          // cy.pause();
          // ExportFile.getExportedFileNameViaApi().then((name) => {
          //   testData.marcFile.exportedFileName = name;

          //   ExportFile.downloadExportedMarcFileViaApi(
          //     testData.marcFile.exportedFileName,
          //     users.userAProperties.username,
          //     users.userAProperties.password
          //   );
          //   // change exported file
          //   DataImport.editMarcFile(
          //     testData.marcFile.exportedFileName,
          //     testData.marcFile.modifiedMarcFile,
          //     [
          //       'C405528 Instance Shared Central',
          //       'Proceedings'
          //     ],
          //     [
          //       'C405528 Instance Shared Central Updated',
          //       'Proceedings Updated'
          //     ]
          //   );
          // });

          // // upload the exported and edited marc file
          // cy.visit(TopMenu.dataImportPath);
          // // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          // DataImport.verifyUploadState();
          // DataImport.uploadExportedFile(testData.marcFile.modifiedMarcFile);
          // JobProfiles.waitFileIsUploaded();
          // JobProfiles.search(jobProfileName);
          // JobProfiles.runImportFile();
          // JobProfiles.waitFileIsImported(testData.marcFile.modifiedMarcFile);
          // Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          // Logs.openFileDetails(testData.marcFile.modifiedMarcFile);
          // FileDetails.openInstanceInInventory(FileDetails.status.updated);
          // InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
          // InventoryInstance.verifyLastUpdatedSource(
          //   users.userAProperties.firstName,
          //   users.userAProperties.lastName,
          // );
          // cy.logout();

          // cy.login(users.userBProperties.username, users.userBProperties.password, {
          //   path: TopMenu.inventoryPath,
          //   waiter: InventoryInstances.waitContentLoading,
          // });
          // InventorySearchAndFilter.verifyPanesExist();
          // ConsortiumManager.switchActiveAffiliation(tenantNames.central);
          // ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          // InventoryInstance.searchByTitle(testData.updatedInstanceTitle);
          // InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
          // InventoryInstance.verifyLastUpdatedSource(
          //   users.userAProperties.firstName,
          //   users.userAProperties.lastName,
          // );
          // InventoryInstance.editMarcBibliographicRecord();
          //   QuickMarcEditor.checkContentByTag(
          //     '245', '$aC405528 Instance Shared Centra Updatedl'
          //     // testData.tag245, testData.tag245EditedContent
          //   );
          //   QuickMarcEditor.checkContentByTag(
          //     '500', '$aProceedings Updated.'
          //     // testData.tag245, testData.tag245EditedContent
          //   );
          //   //  Second line in paneheader including "Source" value with the name of User A

          // ConsortiumManager.switchActiveAffiliation(tenantNames.university);
          // ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.university);
          //   InventorySearchAndFilter.verifyPanesExist();
          //   InventoryInstance.searchByTitle(testData.sharedInstanceId[0]);
          //   InventoryInstance.waitInstanceRecordViewOpened('C405528 Instance Shared Centra Updatedl');
          //   InventoryInstance.verifyLastUpdatedSource(
          //     users.userAProperties.firstName,
          //     users.userAProperties.lastName,
          //   );
          //   InventoryInstance.viewSource();
          //   InventoryViewSource.contains('$aC405528 Instance Shared Centra Updatedl');
          //   InventoryViewSource.contains('$aProceedings Updated.');
        },
      );
    });
  });
});
