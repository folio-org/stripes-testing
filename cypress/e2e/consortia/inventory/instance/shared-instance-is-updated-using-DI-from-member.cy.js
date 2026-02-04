import {
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_SOURCE_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import Affiliations, { tenantNames } from '../../../../support/dictionary/affiliations';
import Permissions from '../../../../support/dictionary/permissions';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import ConsortiumManager from '../../../../support/fragments/settings/consortium-manager/consortium-manager';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import Users from '../../../../support/fragments/users/users';
import { getLongDelay } from '../../../../support/utils/cypressTools';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Inventory', () => {
  describe('Instance', () => {
    describe('Consortia', () => {
      const testData = {
        exportedFileName: `C411726 exportedTestMarcFile${getRandomPostfix()}.mrc`,
      };
      const mappingProfile = {
        name: `C411726 Update instance adding stat code${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
        statisticalCodeUI: 'Book, print (books)',
      };
      const actionProfile = {
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C411726 Update instance adding stat code${getRandomPostfix()}`,
        action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
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
        existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
        existingRecordOption: NewMatchProfile.optionsList.instanceUuid,
      };
      const jobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C411726 Update instance adding stat code${getRandomPostfix()}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.getConsortiaId().then((consortiaId) => {
          testData.consortiaId = consortiaId;
        });
        cy.setTenant(Affiliations.College);
        InventoryInstance.createInstanceViaApi().then(({ instanceData }) => {
          testData.instance = instanceData;

          InventoryInstance.shareInstanceViaApi(
            testData.instance.instanceId,
            testData.consortiaId,
            Affiliations.College,
            Affiliations.Consortia,
          );
          cy.resetTenant();

          cy.loginAsAdmin();
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(testData.instance.instanceId);
          InventorySearchAndFilter.closeInstanceDetailPane();
          InventorySearchAndFilter.selectResultCheckboxes(1);
          InventorySearchAndFilter.exportInstanceAsMarc();
          cy.intercept('/data-export/quick-export').as('getHrid');
          cy.wait('@getHrid', getLongDelay()).then((req) => {
            const expectedRecordHrid = req.response.body.jobExecutionHrId;

            // download exported marc file
            cy.setTenant(Affiliations.College).then(() => {
              // use cy.getToken function to get token for current tenant
              TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.DATA_EXPORT);
              ExportFile.waitLandingPageOpened();
              ExportFile.downloadExportedMarcFileWithRecordHrid(
                expectedRecordHrid,
                testData.exportedFileName,
              );
              FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
            });
          });
        });

        cy.resetTenant();
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
        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${testData.exportedFileName}`);
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstance.deleteInstanceViaApi(testData.instance.instanceId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      });

      it(
        'C411726 (CONSORTIA) Verify that shared Instance is updated using Data import from member tenant (consortia) (folijet)',
        { tags: ['criticalPathECS', 'folijet', 'C411726'] },
        () => {
          // create Field mapping profile
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
          FieldMappingProfiles.waitLoading();
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
          NewFieldMappingProfile.addStatisticalCode(mappingProfile.statisticalCode, 8);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

          // create Action profile and link it to Field mapping profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          SettingsActionProfiles.create(actionProfile, mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

          // create Match profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfileWithExistingPart(matchProfile);
          MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

          // create Job profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
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
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
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
          InstanceRecordView.verifyInstanceSource(INSTANCE_SOURCE_NAMES.MARC);
          InstanceRecordView.verifyStatisticalCode(mappingProfile.statisticalCodeUI);
          InventoryInstance.viewSource();
          InventoryViewSource.contains(`$a ${testData.instance.instanceTitle}`);
        },
      );
    });
  });
});
