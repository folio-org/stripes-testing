import {
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import NewActionProfile from '../../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FileManager from '../../../../support/utils/fileManager';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import ServicePoints from '../../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Locations from '../../../../support/fragments/settings/tenant/location-setup/locations';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../../support/fragments/settings/dataImport';
import NewLocation from '../../../../support/fragments/settings/tenant/locations/newLocation';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {
      instanceIds: [],
      marcFile: {
        marc: 'marcBibFileForC411791.mrc',
        fileName: `C411791 testMarcFile${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        exportedFileName: `C411791 exportedTestMarcFile${getRandomPostfix()}.mrc`,
        modifiedMarcFile: `C411791 modifiedTestMarcFile${getRandomPostfix()}.mrc`,
      },
      instanceTitle: 'C411791 Instance Shared Central',
      field500Content: '$a Proceedings Updated.',
    };
    const mappingProfile = {
      name: `C411791 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: `C411791 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
      action: 'UPDATE',
      folioRecordType: 'MARC_BIBLIOGRAPHIC',
    };
    const matchProfile = {
      profileName: `C411791 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`,
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
    const jobProfileName = `C411791 Update MARC Bib records by matching 999 ff $s subfield value${getRandomPostfix()}`;

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
        testData.instanceIds.push(link.split('/')[5]);
      });

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
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

          const collegeLocationData = Locations.getDefaultLocation({
            servicePointId: ServicePoints.getDefaultServicePoint().id,
          }).location;
          Locations.createViaApi(collegeLocationData).then((location) => {
            testData.collegeLocation = location;

            cy.getInstance({
              limit: 1,
              expandAll: true,
              query: `"title"=="${testData.instanceTitle}"`,
            }).then((instance) => {
              InventoryHoldings.createHoldingRecordViaApi({
                instanceId: instance.id,
                permanentLocationId: testData.collegeLocation.id,
              });
            });
          });
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceIds[0]);
      cy.resetTenant();
      cy.setTenant(Affiliations.College);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      cy.getInstance({
        limit: 1,
        expandAll: true,
        query: `"title"=="${testData.instanceTitle}"`,
      }).then((instance) => {
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
      NewLocation.deleteViaApiIncludingInstitutionCampusLibrary(
        testData.collegeLocation.institutionId,
        testData.collegeLocation.campusId,
        testData.collegeLocation.libraryId,
        testData.collegeLocation.id,
      );
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${testData.marcFile.modifiedMarcFile}`);
    });

    it(
      'C411791 User without import permissions in Central tenant cannot update Shared "MARC Bib" in member tenant via Data import (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
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
              ['Proceedings'],
              ['Proceedings Updated'],
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

            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.searchByTitle(testData.instanceTitle);
            InventoryInstance.viewSource();
            InventoryViewSource.notContains(testData.field500Content);
          });
        });
      },
    );
  });
});
