import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions, Parallelization } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  TARGET_PROFILE_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Z3950TargetProfiles from '../../../support/fragments/settings/inventory/integrations/z39.50TargetProfiles';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryEditMarcRecord from '../../../support/fragments/inventory/inventoryEditMarcRecord';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import FileManager from '../../../support/utils/fileManager';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user = null;
    let instanceHrid;
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
    const editedMarcFileName = `C356829 editedMarcFile.${getRandomPostfix()}.mrc`;
    const nameMarcFileForUpload = `C356829 autotestFile.${getRandomPostfix()}.mrc`;

    const matchProfile = {
      profileName: `C356829 001 to Instance HRID ${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '001',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
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
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const jobProfile = {
      profileName: `C356829 Update instance and check field protections ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test user', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.uiInventorySettingsConfigureSingleRecordImport.gui,
        Permissions.dataExportEnableApp.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password);
      });
    });

    after('delete test data', () => {
      FileManager.deleteFolder(Cypress.config('downloadsFolder'));
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
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C356829 Test field protections when importing to update instance, after editing the MARC Bib in quickMARC (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.nonParallel] },
      () => {
        cy.visit(SettingsMenu.targetProfilesPath);
        Z3950TargetProfiles.openTargetProfile();
        Z3950TargetProfiles.editOclcWorldCat(
          OCLCAuthentication,
          TARGET_PROFILE_NAMES.OCLC_WORLDCAT,
        );
        Z3950TargetProfiles.checkIsOclcWorldCatIsChanged(OCLCAuthentication);

        MarcFieldProtection.createViaApi(firstProtectedFieldsData);
        MarcFieldProtection.createViaApi(secondProtectedFieldData);

        // create match profile
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create mapping profile
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.fillCatalogedDate(mappingProfile.catalogedDate);
        NewFieldMappingProfile.fillInstanceStatusTerm(mappingProfile.statusTerm);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

        // create action profile
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(actionProfile, mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(actionProfile.name);

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkMatchAndActionProfiles(matchProfile.profileName, actionProfile.name);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.importWithOclc(oclcForImport);
        InventoryInstance.editMarcBibliographicRecord();
        [18, 19, 20, 21, 22, 23, 24, 25, 26].forEach((fieldNumber) => {
          InventoryEditMarcRecord.deleteField(fieldNumber);
        });
        InventoryEditMarcRecord.editField('$a Louisiana $2 fast', '$a Louisiana $2 fast $5 amb');
        InventoryEditMarcRecord.addField('920', 'This should be a protected field', 28);
        InventoryEditMarcRecord.saveAndClose();
        InventoryEditMarcRecord.confirmDeletingField();
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InventoryInstance.viewSource();
          InventoryViewSource.contains('651\t');
          InventoryViewSource.contains('‡a Louisiana ‡2 fast ‡5 amb');
          InventoryViewSource.contains('920\t');
          InventoryViewSource.contains('‡a This should be a protected field');
          // The prepared file without fields 651 and 920 is used because it is very difficult
          // to remove fields from the exported file along with the special characters of the .mrc file
          InventoryViewSource.extructDataFrom999Field().then((uuid) => {
            // change file using uuid for 999 field
            DataImport.editMarcFile(
              'marcFileForC356829.mrc',
              editedMarcFileName,
              ['srsUuid', 'instanceUuid', 'hrid'],
              [uuid[0], uuid[1], instanceHrid],
            );
          });
          InventoryViewSource.close();

          // export instance
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InventorySearchAndFilter.selectResultCheckboxes(1);
          InventorySearchAndFilter.exportInstanceAsMarc();

          // upload a marc file
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName, nameMarcFileForUpload);
          JobProfiles.search(jobProfile.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(nameMarcFileForUpload);
          Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(nameMarcFileForUpload);
          [
            FileDetails.columnNameInResultList.srsMarc,
            FileDetails.columnNameInResultList.instance,
          ].forEach((columnName) => {
            FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
          });
          FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfItems, 1);
          FileDetails.checkInstanceQuantityInSummaryTable(quantityOfItems, 1);
          FileDetails.openInstanceInInventory('Updated');
        });

        InventoryInstance.checkIsInstanceUpdated();
        InventoryInstance.viewSource();
        InventoryViewSource.contains('651\t');
        InventoryViewSource.contains('‡a Louisiana ‡2 fast ‡5 amb');
        InventoryViewSource.contains('920\t');
        InventoryViewSource.contains('‡a This should be a protected field');
      },
    );
  });
});
