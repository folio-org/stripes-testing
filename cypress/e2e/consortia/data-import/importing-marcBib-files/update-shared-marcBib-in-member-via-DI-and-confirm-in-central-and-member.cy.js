import {
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import Users from '../../../../support/fragments/users/users';
import FileManager from '../../../../support/utils/fileManager';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../../support/fragments/settings/dataImport';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
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
      field245: {
        tag: '245',
        content: '$a C405528 Instance Shared Central Updated',
      },
      field500: {
        tag: '500',
        content: '$a Proceedings Updated.',
      },
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
      cy.loginAsAdmin({
        path: TopMenu.dataImportPath,
        waiter: DataImport.waitLoading,
      });
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(testData.marcFile.marc, testData.marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(testData.marcFile.jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(testData.marcFile.fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(testData.marcFile.fileName);
      Logs.getCreatedItemsID().then((link) => {
        testData.sharedInstanceId.push(link.split('/')[5]);
      });
      cy.logout();

      // create user A
      cy.createTempUser([Permissions.moduleDataImportEnabled.gui])
        .then((userProperties) => {
          users.userAProperties = userProperties;
        })
        .then(() => {
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
          cy.assignAffiliationToUser(Affiliations.University, users.userBProperties.userId);
          cy.setTenant(Affiliations.University);
          cy.assignPermissionsToExistingUser(users.userBProperties.userId, [
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          ]);
          cy.resetTenant();
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(users.userAProperties.userId);
      Users.deleteViaApi(users.userBProperties.userId);
      InventoryInstance.deleteInstanceViaApi(testData.sharedInstanceId[0]);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
    });

    it(
      'C405528 User can update shared "MARC Bib" in member tenant via Data import and confirm in central & member tenants (consortia) (folijet)',
      { tags: ['extendedPathECS', 'folijet'] },
      () => {
        cy.login(users.userAProperties.username, users.userAProperties.password);
        ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(testData.instanceTitle);
        InventorySearchAndFilter.closeInstanceDetailPane();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.verifySelectedRecords(1);
        InventorySearchAndFilter.exportInstanceAsMarc();

        // download exported marc file
        cy.setTenant(Affiliations.College).then(() => {
          // use cy.getToken function to get toket for current tenant
          cy.getCollegeAdminToken();
          cy.visit(TopMenu.dataExportPath);
          cy.wait(2000);
          ExportFile.getExportedFileNameViaApi().then((name) => {
            testData.marcFile.exportedFileName = name;

            ExportFile.downloadExportedMarcFile(testData.marcFile.exportedFileName);
            // change exported file
            DataImport.editMarcFile(
              testData.marcFile.exportedFileName,
              testData.marcFile.modifiedMarcFile,
              [testData.instanceTitle, 'Proceedings'],
              [testData.updatedInstanceTitle, 'Proceedings Updated'],
            );

            // upload the exported and edited marc file
            cy.visit(TopMenu.dataImportPath);
            // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
            DataImport.verifyUploadState();
            DataImport.uploadExportedFile(testData.marcFile.modifiedMarcFile);
            JobProfiles.waitFileIsUploaded();
            JobProfiles.search(jobProfileName);
            JobProfiles.runImportFile();
            JobProfiles.waitFileIsImported(testData.marcFile.modifiedMarcFile);
            Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
            Logs.openFileDetails(testData.marcFile.modifiedMarcFile);
            FileDetails.openInstanceInInventory(FileDetails.status.updated);
            InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
            InventoryInstance.verifyLastUpdatedSource(
              users.userAProperties.firstName,
              users.userAProperties.lastName,
            );
            cy.logout();

            cy.login(users.userBProperties.username, users.userBProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.verifyPanesExist();
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            InventoryInstances.searchByTitle(testData.updatedInstanceTitle);
            InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
            InventoryInstance.verifyLastUpdatedSource(
              users.userAProperties.firstName,
              users.userAProperties.lastName,
            );
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkContentByTag(testData.field245.tag, testData.field245.content);
            QuickMarcEditor.checkContentByTag(testData.field500.tag, testData.field500.content);
            QuickMarcEditor.checkSourceValue(
              users.userAProperties.firstName,
              users.userAProperties.lastName,
            );
            cy.logout();

            cy.login(users.userBProperties.username, users.userBProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.university);
            InventorySearchAndFilter.verifyPanesExist();
            InventoryInstances.searchByTitle(testData.updatedInstanceTitle);
            InventoryInstance.waitInstanceRecordViewOpened(testData.updatedInstanceTitle);
            // InventoryInstance.verifyLastUpdatedSource(
            //   users.userAProperties.firstName,
            //   users.userAProperties.lastName,
            // );
            InventoryInstance.viewSource();
            InventoryViewSource.contains(testData.field245.content);
            InventoryViewSource.contains(testData.field500.content);
          });
        });
      },
    );
  });
});
