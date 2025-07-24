import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  TARGET_PROFILE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import SettingsInventory from '../../../support/fragments/settings/inventory/settingsInventory';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Settings', () => {
    let user = null;
    let instanceHrid;
    const instanceTitle = 'Conversational Cajun French 1 / Randall P. Whatley and Harry Jannise.';
    const OCLCAuthentication = '100481406/PAOLF';
    const firstProtectedFieldsData = {
      indicator1: '*',
      indicator2: '*',
      subfield: '5',
      data: 'amb',
      source: 'USER',
      field: '*',
    };
    const secondProtectedFieldData = {
      indicator1: '*',
      indicator2: '*',
      subfield: '*',
      data: '*',
      source: 'USER',
      field: '920',
    };
    const quantityOfItems = '1';
    const oclcForImport = '830936944';
    // unique file names
    const editedMarcFileName = `C356829 editedMarcFile${getRandomPostfix()}.mrc`;
    const nameMarcFileForUpload = `C356829 autotestFile${getRandomPostfix()}.mrc`;

    const matchProfile = {
      profileName: `C356829 001 to Instance HRID ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const mappingProfile = {
      name: `C356829 Update instance and check field protections ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      catalogedDate: '###TODAY###',
      instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C356829 Update instance and check field protections ${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const jobProfile = {
      profileName: `C356829 Update instance and check field protections ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken().then(() => {
        MarcFieldProtection.getListViaApi({
          query: `"data"=="${firstProtectedFieldsData.data}"`,
        }).then((field) => {
          MarcFieldProtection.deleteViaApi(field[0].id);
        });
        MarcFieldProtection.getListViaApi({
          query: `"field"=="${secondProtectedFieldData.field}"`,
        }).then((field) => {
          MarcFieldProtection.deleteViaApi(field[0].id);
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C356829 Test field protections when importing to update instance, after editing the MARC Bib in quickMARC (folijet)',
      { tags: ['criticalPath', 'folijet', 'C356829'] },
      () => {
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        SettingsInventory.goToSettingsInventory();
        SettingsInventory.selectSettingsTab('Z39.50 target profiles');
        Z3950TargetProfiles.openTargetProfile();
        Z3950TargetProfiles.editOclcWorldCat(
          OCLCAuthentication,
          TARGET_PROFILE_NAMES.OCLC_WORLDCAT,
        );
        Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(OCLCAuthentication);

        MarcFieldProtection.createViaApi(firstProtectedFieldsData);
        MarcFieldProtection.createViaApi(secondProtectedFieldData);

        // create match profile
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create mapping profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogedDate);
        NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.statusTerm);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(actionProfile, mappingProfile.name);
        SettingsActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchAndActionProfiles(matchProfile.profileName, actionProfile.name);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.importWithOclc(oclcForImport);
        InventoryInstance.editMarcBibliographicRecord();
        [17, 18, 19, 20, 21, 22, 23, 24, 25].forEach((fieldNumber) => {
          InventoryEditMarcRecord.deleteField(fieldNumber);
        });
        InventoryEditMarcRecord.editField('$a Louisiana $2 fast', '$a Louisiana $2 fast $5 amb');
        InventoryEditMarcRecord.addField('920', 'This should be a protected field', 28);
        InventoryEditMarcRecord.saveAndClose();
        cy.wait(1500);
        InventoryEditMarcRecord.saveAndClose();
        InventoryEditMarcRecord.confirmDeletingField();
        InventoryInstance.waitInstanceRecordViewOpened(instanceTitle);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InventoryInstance.viewSource();
          InventoryViewSource.contains('651\t');
          InventoryViewSource.contains('$a Louisiana $2 fast $5 amb');
          InventoryViewSource.contains('920\t');
          InventoryViewSource.contains('This should be a protected field');
          // The prepared file without fields 651 and 920 is used because it is very difficult
          // to remove fields from the exported file along with the special characters of the .mrc file
          InventoryViewSource.extructDataFrom999Field().then((uuid) => {
            // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcFileForC356829.mrc',
              editedMarcFileName,
              ['instanceUuid', 'srsUuid', 'hrid'],
              [uuid[0], uuid[1], instanceHrid],
            );
          });

          // export instance
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InventorySearchAndFilter.selectResultCheckboxes(1);
          InventorySearchAndFilter.exportInstanceAsMarc();

          // upload a marc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName, nameMarcFileForUpload);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(nameMarcFileForUpload);
          Logs.checkJobStatus(nameMarcFileForUpload, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(nameMarcFileForUpload);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
          });
          FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 1);
          FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);
          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        });

        InventoryInstance.checkIsInstanceUpdated();
        InventoryInstance.viewSource();
        InventoryViewSource.contains('651\t');
        InventoryViewSource.contains('$a Louisiana $2 fast $5 amb');
        InventoryViewSource.contains('920\t');
        InventoryViewSource.contains('This should be a protected field');
      },
    );
  });
});
