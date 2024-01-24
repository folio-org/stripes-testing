import {
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  RECORD_STATUSES,
  JOB_STATUS_NAMES,
} from '../../../../support/constants';
import {
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
} from '../../../../support/fragments/settings/dataImport';
import Permissions from '../../../../support/dictionary/permissions';
import getRandomPostfix from '../../../../support/utils/stringTools';
import Users from '../../../../support/fragments/users/users';
import TopMenu from '../../../../support/fragments/topMenu';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import MatchProfiles from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import FieldMappingProfileView from '../../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import NewFieldMappingProfile from '../../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import FileManager from '../../../../support/utils/fileManager';

describe('Inventory', () => {
  describe('Instance', () => {
    const testData = {};
    const mappingProfile = {
      name: `C411726 Update instance adding stat code${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
      statisticalCodeUI: 'Book, print (books)',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C411726 Update instance adding stat code${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const matchProfile = {
      profileName: `C411726 Update instance adding stat code${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 'i',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      existingRecordOption: NewMatchProfile.optionsList.instanceUuid,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C411726 Update instance adding stat code${getRandomPostfix()}`,
    };

    before('Create test data', () => {
      cy.getCollegeAdminToken();
      cy.getConsortiaId().then((consortiaId) => {
        testData.consortiaId = consortiaId;
      });
      cy.setTenant(Affiliations.College);
      InventoryInstance.createInstanceViaApi()
        .then(({ instanceData }) => {
          testData.instance = instanceData;

          InventoryInstance.shareInstanceViaApi(
            testData.instance.instanceId,
            testData.consortiaId,
            Affiliations.College,
            Affiliations.Consortia,
          );
        })
        .then(() => {
          cy.loginAsAdmin();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventorySearchAndFilter.closeInstanceDetailPane();
          InventorySearchAndFilter.selectResultCheckboxes(1);
          InventorySearchAndFilter.exportInstanceAsMarc();

          // use cy.getToken function to get toket for current tenant
          cy.getCollegeAdminToken();
          // download exported marc file
          cy.visit(TopMenu.dataExportPath);
          cy.wait(2000);
          ExportFile.getExportedFileNameViaApi().then((name) => {
            testData.exportedFileName = name;

            ExportFile.downloadExportedMarcFile(testData.exportedFileName);
          });
          cy.resetTenant();
        });

      cy.getAdminToken();
      cy.createTempUser([Permissions.uiInventoryViewCreateEditInstances.gui])
        .then((userProperties) => {
          testData.user = userProperties;
        })
        .then(() => {
          cy.assignAffiliationToUser(Affiliations.College, testData.user.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(testData.user.userId, [
            Permissions.settingsDataImportEnabled.gui,
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          ]);
          cy.resetTenant();

          cy.login(testData.user.username, testData.user.password);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${testData.exportedFileName}`);
    });

    it(
      'C411726 (CONSORTIA) Verify that shared Instance is updated using Data import from member tenant (consortia) (folijet)',
      { tags: ['criticalPathECS', 'folijet'] },
      () => {
        // create Field mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.addStatisticalCode(mappingProfile.statisticalCode, 8);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create Action profile and link it to Field mapping profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create Match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfileWithExistingPart(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.openNewJobProfileForm();
        NewJobProfile.fillJobProfile(jobProfile);
        NewJobProfile.linkMatchProfile(matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(actionProfile.name);
        // waiter needed for the action profile to be linked
        cy.wait(1000);
        NewJobProfile.saveAndClose();
        JobProfiles.waitLoadingList();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        // upload the exported and edited marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(testData.exportedFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(testData.exportedFileName);
        Logs.checkJobStatus(testData.exportedFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.exportedFileName);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.instance,
        );
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InventoryInstance.waitInstanceRecordViewOpened(testData.instance.instanceTitle);
        InstanceRecordView.verifyInstanceSource('MARC');
        InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
        InventoryInstance.viewSource();
        InventoryViewSource.contains(`$a ${testData.instance.instanceTitle}`);
      },
    );
  });
});
