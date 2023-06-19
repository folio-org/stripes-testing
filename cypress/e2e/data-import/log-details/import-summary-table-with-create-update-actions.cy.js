import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import { LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  LOCALION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXPORT_TRANSFORMATION_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  EXISTING_RECORDS_NAMES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import permissions from '../../../support/dictionary/permissions';

describe('ui-data-import', () => {
  let user;
  let instanceHRID;
  const filePathForCreateInstance = 'marcFileForC356791.mrc';
  const fileNameForCreateInstance = `C356791 autotestFileForCreate.${getRandomPostfix()}.mrc`;
  const fileNameForUpdateInstance = `C356791 autotestFileForUpdate.${getRandomPostfix()}.mrc`;
  const jobProfileNameForExport = `C356791 autotest job profile.${getRandomPostfix()}`;
  const nameForCSVFile = `C356791autotestCsvFile.${getRandomPostfix()}.csv`;
  const collectionOfProfilesForCreate = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        name: `C356791 autotest marcBib mapping profile.${getRandomPostfix()}`,
        modifications: {
          action: 'Add',
          field: '650',
          ind1: '',
          ind2: '4',
          subfield: 'a',
          data: 'Test update' }
       },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
        name: `C356791 autotest marcBib action profile.${getRandomPostfix()}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C356791 autotest instance mapping profile.${getRandomPostfix()}` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C356791 autotest instance action profile.${getRandomPostfix()}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C356791 autotest holdings mapping profile.${getRandomPostfix()}`,
        permanentLocation: `"${LOCALION_NAMES.ONLINE}"` },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C356791 autotest holdings action profile.${getRandomPostfix()}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C356791 autotest item mapping profile.${getRandomPostfix()}`,
        materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
        status: ITEM_STATUS_NAMES.AVAILABLE,
        permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C356791 autotest item action profile.${getRandomPostfix()}` }
    }
  ];
  const jobProfileForCreate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C356791 autotest job profile.${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC
  };
  const exportMappingProfile = {
    name: `C356791 autotest mapping profile.${getRandomPostfix()}`,
    holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
    holdingsMarcField: '901',
    subfieldForHoldings:'$h',
    itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
    itemMarcField:'902',
    subfieldForItem:'$i'
  };
  const collectionOfProfilesForUpdate = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C356791 autotest instance mapping profile.${getRandomPostfix()}`,
        catalogingDate: '###TODAY###',
        statusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
        statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
        statisticalCodeUI: 'Book, print (books)' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C356791 autotest instance action profile.${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C356791 autotest holdings mapping profile.${getRandomPostfix()}`,
        holdingsType: 'electronic',
        permanetLocation: `"${LOCALION_NAMES.ONLINE}"`,
        callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        callNumber: '050$a " " 050$b' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C356791 autotest action mapping profile.${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C356791 autotest item mapping profile.${getRandomPostfix()}`,
        materialType: `"${MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE}"`,
        noteType: '"Electronic bookplate"',
        note: '"Smith Family Foundation"',
        noteUI: 'Smith Family Foundation',
        staffOnly: 'Mark for all affected records',
        permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        status: ITEM_STATUS_NAMES.AVAILABLE },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C356791 autotest item action profile.${getRandomPostfix()}`,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];
  const collectionOfMatchProfiles = [
    {
      matchProfile: { profileName: `C356791 MARC-to-MARC 001 to 001.${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '001'
        },
        existingRecordFields: {
          field: '001'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC }
    },
    {
      matchProfile: { profileName: `C356791 MARC-to-Holdings 901h to Holdings HRID.${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '901',
          subfield: 'h'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
        holdingsOption: NewMatchProfile.optionsList.holdingsHrid }
    },
    {
      matchProfile: {
        profileName: `C356791 MARC-to-Item 902i to Item HRID.${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '902',
          subfield: 'i'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
        itemOption: NewMatchProfile.optionsList.itemHrid
      }
    }
  ];
  const jobProfileForUpdate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C356791 autotest job profile.${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC
  };

  before('create and login user', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.uiInventoryViewCreateEditInstances.gui,
      permissions.dataExportEnableApp.gui,
      permissions.dataExportEnableSettings.gui
    ])
      .then(userProperties => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  it('C356791 Check import summary table with "create + update" actions (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create mapping profiles
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfilesForCreate[0].mappingProfile);
      NewFieldMappingProfile.addFieldMappingsForMarc();
      NewFieldMappingProfile.fillModificationSectionWithAdd(collectionOfProfilesForCreate[0].mappingProfile.modifications);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfilesForCreate[0].mappingProfile.name);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfilesForCreate[0].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfilesForCreate[1].mappingProfile);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfilesForCreate[1].mappingProfile.name);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfilesForCreate[1].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfilesForCreate[2].mappingProfile);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfProfilesForCreate[2].mappingProfile.permanentLocation);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfilesForCreate[2].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfilesForCreate[3].mappingProfile);
      NewFieldMappingProfile.fillMaterialType(collectionOfProfilesForCreate[3].mappingProfile.materialType);
      NewFieldMappingProfile.fillPermanentLoanType(collectionOfProfilesForCreate[3].mappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(collectionOfProfilesForCreate[3].mappingProfile.status);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfilesForCreate[3].mappingProfile.name);

      // create action profiles
      collectionOfProfilesForCreate.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfileForCreate);
      collectionOfProfilesForCreate.forEach(profile =>{
        NewJobProfile.linkActionProfile(profile.actionProfile);
      });
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

      // upload the exported marc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.uploadFile(filePathForCreateInstance, fileNameForCreateInstance);
      JobProfiles.searchJobProfileForImport(jobProfileForCreate.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(fileNameForCreateInstance);
      Logs.openFileDetails(fileNameForCreateInstance);
      [FileDetails.columnNameInResultList.srsMarc,
        FileDetails.columnNameInResultList.instance,
        FileDetails.columnNameInResultList.holdings,
        FileDetails.columnNameInResultList.item
      ].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      // need to get Instance hrid for unique searching in Inventory
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        instanceHRID = initialInstanceHrId;

      // // create Field mapping profile for export
      // cy.visit(SettingsMenu.exportMappingProfilePath);
      // ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);

      // cy.visit(SettingsMenu.exportJobProfilePath);
      // ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

      // // download exported marc file
      // cy.visit(TopMenu.dataExportPath);
      // ExportFile.uploadFile(nameForCSVFile);
      // ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
      // ExportFile.downloadExportedMarcFile(nameMarcFileForImportUpdate);

      // cy.visit(TopMenu.inventoryPath);
      // InventorySearchAndFilter.searchByParameter('Subject', collectionOfProfilesForCreate[0].mappingProfile.modifications.data);
      // InventorySearchAndFilter.searchInstanceByHRID(instanceHRID);
      // InventorySearchAndFilter.saveUUIDs();
      // ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
      // FileManager.deleteFolder(Cypress.config('downloadsFolder'));
      });

      // // download exported marc file
      // cy.visit(TopMenu.dataExportPath);
      // ExportFile.uploadFile(nameForCSVFile);
      // ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
      // ExportFile.downloadExportedMarcFile(fileNameForUpdateInstance);
        
      // // step 21
      
      // // create mapping profiles
      // cy.visit(SettingsMenu.mappingProfilePath);
      // FieldMappingProfiles.openNewMappingProfileForm();
      // NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfilesForUpdate[0].mappingProfile);
      // NewFieldMappingProfile.fillInstanceStatusTerm(collectionOfProfilesForUpdate[0].mappingProfile.instanceStatusTerm);
      // NewFieldMappingProfile.addStatisticalCode(collectionOfProfilesForUpdate[0].mappingProfile.statisticalCode, 8);
      // FieldMappingProfiles.saveProfile();
      // FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfilesForUpdate[0].mappingProfile.name);
      // FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfilesForUpdate[0].mappingProfile.name);

      // FieldMappingProfiles.openNewMappingProfileForm();
      // NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfilesForUpdate[1].mappingProfile);
      // NewFieldMappingProfile.fillPermanentLocation(collectionOfProfilesForUpdate[1].mappingProfile.permanetLocation);
      // FieldMappingProfiles.saveProfile();
      // FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfilesForUpdate[1].mappingProfile.name);
      // FieldMappingProfiles.checkMappingProfilePresented(collectionOfProfilesForUpdate[1].mappingProfile.name);

      // FieldMappingProfiles.openNewMappingProfileForm();
      // NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfProfilesForUpdate[2].mappingProfile);
      // NewFieldMappingProfile.fillMaterialType(collectionOfProfilesForUpdate[2].mappingProfile.materialType);
      // NewFieldMappingProfile.addItemNotes(
      //   collectionOfProfilesForUpdate[2].mappingProfile.noteType,
      //   collectionOfProfilesForUpdate[2].mappingProfile.note,
      //   collectionOfProfilesForUpdate[2].mappingProfile.staffOnly
      // );
      // NewFieldMappingProfile.fillPermanentLoanType(collectionOfProfilesForUpdate[2].mappingProfile.permanentLoanType);
      // NewFieldMappingProfile.fillStatus(collectionOfProfilesForUpdate[2].mappingProfile.status);
      // FieldMappingProfiles.saveProfile();
      // FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfProfilesForUpdate[2].mappingProfile.name);

      // // create action profiles
      // collectionOfProfilesForUpdate.forEach(profile => {
      //   cy.visit(SettingsMenu.actionProfilePath);
      //   ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
      //   ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      // });

      // // create match profiles
      // cy.visit(SettingsMenu.matchProfilePath);
      // collectionOfMatchProfiles.forEach(profile => {
      // MatchProfiles.createMatchProfile(profile.matchProfile);
      // MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
      // });

      // // create job profile
      // cy.visit(SettingsMenu.jobProfilePath);
      // JobProfiles.createJobProfileWithLinkingProfilesForUpdate(jobProfileForUpdate);
      // NewJobProfile.linkMatchAndActionProfilesForInstance(collectionOfProfilesForUpdate[0].actionProfile.name, collectionOfMatchProfiles[0].matchProfile.profileName, 0);
      // NewJobProfile.linkMatchAndActionProfilesForHoldings(collectionOfProfilesForUpdate[1].actionProfile.name, collectionOfMatchProfiles[1].matchProfile.profileName, 2);
      // NewJobProfile.linkMatchAndActionProfilesForItem(collectionOfProfilesForUpdate[2].actionProfile.name, collectionOfMatchProfiles[2].matchProfile.profileName, 4);
      // NewJobProfile.saveAndClose();
      
      // // upload the exported marc file
      // cy.visit(TopMenu.dataImportPath);
      // // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      // DataImport.uploadFile(filePathForCreateInstance, fileNameForCreateInstance);
      // JobProfiles.searchJobProfileForImport(jobProfileForUpdate);
      // JobProfiles.runImportFile();
      // JobProfiles.waitFileIsImported(fileNameForCreateInstance);
      // Logs.openFileDetails(fileNameForCreateInstance);
      
  });
});
