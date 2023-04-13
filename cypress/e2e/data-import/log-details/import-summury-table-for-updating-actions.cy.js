import getRandomPostfix from '../../../support/utils/stringTools';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/settingsJobProfiles';
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
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import itemRecordView from '../../../support/fragments/inventory/itemRecordView';

describe('ui-data-import', () => {
  let instanceHrid;
  const recordType = 'MARC_BIBLIOGRAPHIC';
  const holdingsPermanentLocation = 'Annex';
  const itemStatus = 'Available';
  const quantityOfItems = '1';
  const instanceTitle = 'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)';
  // file names
  const nameMarcFileForImportCreate = `C356802autotestFile.${getRandomPostfix()}.mrc`;
  const nameForCSVFile = `C356802autotestFile${getRandomPostfix()}.csv`;
  const nameMarcFileForImportUpdate = `C356802autotestFile${getRandomPostfix()}.mrc`;
  // unique profile names
  const marcBibMappingProfileNameForCreate = `C356802 create marcBib mapping profile ${Helper.getRandomBarcode()}`;
  const instanceMappingProfileNameForCreate = `C356802 create instance mapping profile ${Helper.getRandomBarcode()}`;
  const holdingsMappingProfileNameForCreate = `C356802 create holdings mapping profile ${Helper.getRandomBarcode()}`;
  const itemMappingProfileNameForCreate = `C356802 create item mapping profile ${Helper.getRandomBarcode()}`;
  const marcBibActionProfileNameForCreate = `C356802 create marcBib action profile ${Helper.getRandomBarcode()}`;
  const instanceActionProfileNameForCreate = `C356802 create instance action profile ${Helper.getRandomBarcode()}`;
  const holdingsActionProfileNameForCreate = `C356802 create holdings action profile ${Helper.getRandomBarcode()}`;
  const itemActionProfileNameForCreate = `C356802 create item action profile ${Helper.getRandomBarcode()}`;
  const jobProfileNameForCreate = `C356802 create job profile ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForExport = `C356802 mapping profile ${Helper.getRandomBarcode()}`;
  const jobProfileNameForExport = `C356802 job profile.${getRandomPostfix()}`;
  const instanceMappingProfileNameForUpdate = `C356802 update instance mapping profile ${Helper.getRandomBarcode()}`;
  const holdingsMappingProfileNameForUpdate = `C356802 update holdings mapping profile ${Helper.getRandomBarcode()}`;
  const itemMappingProfileNameForUpdate = `C356802 update item mapping profile ${Helper.getRandomBarcode()}`;
  const instanceActionProfileNameForUpdate = `C356802 update instance action profile ${Helper.getRandomBarcode()}`;
  const holdingsActionProfileNameForUpdate = `C356802 update holdings action profile ${Helper.getRandomBarcode()}`;
  const itemActionProfileNameForUpdate = `C356802 update item action profile ${Helper.getRandomBarcode()}`;
  const matchProfileNameForInstance = `C356802 MARC-to-MARC 001 to 001 match profile ${Helper.getRandomBarcode()}`;
  const matchProfileNameForHoldings = `C356802 MARC-to-Holdings 901h to Holdings HRID match profile ${Helper.getRandomBarcode()}`;
  const matchProfileNameForItem = `C356802 MARC-to-Item 902i to Item HRID match profile ${Helper.getRandomBarcode()}`;
  const jobProfileNameForUpdate = `C356802 update job profile ${Helper.getRandomBarcode()}`;

  // profiles for creating instance, holdings, item
  const marcBibMappingProfileForCreate = {
    profile:{
      id: '',
      name: marcBibMappingProfileNameForCreate,
      incomingRecordType: recordType,
      existingRecordType: recordType,
      mappingDetails: { name: 'holdings',
        recordType: 'MARC_BIBLIOGRAPHIC',
        marcMappingDetails: [{
          order: 0,
          action: 'ADD',
          field: {
            field: '650',
            indicator2: '4',
            subfields: [{
              subfield: 'a',
              data: {
                text: 'Test update'
              }
            }]
          }
        }],
        marcMappingOption: 'MODIFY' }
    }
  };
  const instanceMappingProfileForCreate = {
    profile:{
      id: '',
      name: instanceMappingProfileNameForCreate,
      incomingRecordType: recordType,
      existingRecordType: 'INSTANCE',
    }
  };
  const holdingsMappingProfileForCreate = {
    profile:{
      id: '',
      name: holdingsMappingProfileNameForCreate,
      incomingRecordType: recordType,
      existingRecordType: 'HOLDINGS',
      mappingDetails: { name: 'holdings',
        recordType: 'HOLDINGS',
        mappingFields: [
          { name: 'permanentLocationId',
            enabled: true,
            path: 'holdings.permanentLocationId',
            value: '"Annex (KU/CC/DI/A)"' }] }
    }
  };
  const itemMappingProfileForCreate = {
    profile:{
      id: '',
      name: itemMappingProfileNameForCreate,
      incomingRecordType: recordType,
      existingRecordType: 'ITEM',
      mappingDetails: { name: 'item',
        recordType: 'ITEM',
        mappingFields: [
          { name: 'materialType.id',
            enabled: true,
            path: 'item.materialType.id',
            value: '"book"',
            acceptedValues: { '1a54b431-2e4f-452d-9cae-9cee66c9a892': 'book' } },
          { name: 'permanentLoanType.id',
            enabled: true,
            path: 'item.permanentLoanType.id',
            value: '"Can circulate"',
            acceptedValues: { '2b94c631-fca9-4892-a730-03ee529ffe27': 'Can circulate' } },
          { name: 'status.name',
            enabled: true,
            path: 'item.status.name',
            value: '"Available"' }] }
    }
  };
  const marcBibActionProfileForCreate = {
    profile: {
      id: '',
      name: marcBibActionProfileNameForCreate,
      action: 'MODIFY',
      folioRecord: recordType
    },
    addedRelations: [
      {
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: []
  };
  const instanceActionProfileForCreate = {
    profile: {
      id: '',
      name: instanceActionProfileNameForCreate,
      action: 'CREATE',
      folioRecord: 'INSTANCE'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: []
  };
  const holdingsActionProfileForCreate = {
    profile: {
      id: '',
      name: holdingsActionProfileNameForCreate,
      action: 'CREATE',
      folioRecord: 'HOLDINGS'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: []
  };
  const itemActionProfileForCreate = {
    profile: {
      id: '',
      name: itemActionProfileNameForCreate,
      action: 'CREATE',
      folioRecord: 'ITEM'
    },
    addedRelations: [
      {
        masterProfileId: null,
        masterProfileType: 'ACTION_PROFILE',
        detailProfileId: '',
        detailProfileType: 'MAPPING_PROFILE'
      }
    ],
    deletedRelations: []
  };
  const jobProfileForCreate = {
    profile: {
      name: jobProfileNameForCreate,
      dataType: 'MARC'
    },
    addedRelations: [],
    deletedRelations: []
  };
  // TODO redesine classes inherites
  const testData = [
    { mappingProfile: marcBibMappingProfileForCreate,
      actionProfile: marcBibActionProfileForCreate },
    { mappingProfile: instanceMappingProfileForCreate,
      actionProfile: instanceActionProfileForCreate },
    { mappingProfile: holdingsMappingProfileForCreate,
      actionProfile: holdingsActionProfileForCreate },
    { mappingProfile: itemMappingProfileForCreate,
      actionProfile: itemActionProfileForCreate },
  ];
  // create Field mapping profile for export
  const exportMappingProfile = {
    name: mappingProfileNameForExport,
    holdingsMarcField: '901',
    subfieldForHoldings:'$h',
    itemMarcField:'902',
    subfieldForItem:'$i'
  };
  // profiles for updating instance, holdings, item
  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance,
        name: instanceMappingProfileNameForUpdate,
        catalogedDate: '###TODAY###',
        instanceStatus: 'Batch Loaded',
        statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
        statisticalCodeUI: 'Book, print (books)' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: instanceActionProfileNameForUpdate,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings,
        name: holdingsMappingProfileNameForUpdate,
        holdingsType: 'Electronic',
        permanentLocation: '"Online (E)"',
        callNumberType: 'Library of Congress classification',
        callNumber: '050$a " " 050$b',
        relationship: 'Resource',
        uri: '856$u' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: holdingsActionProfileNameForUpdate,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue : NewFieldMappingProfile.folioRecordTypeValue.item,
        name: itemMappingProfileNameForUpdate,
        materialType: 'electronic resource',
        noteType: '"Electronic bookplate"',
        note: '"Smith Family Foundation"',
        staffOnly: 'Mark for all affected records',
        permanentLoanType: 'Can circulate',
        status: 'Available' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: itemActionProfileNameForUpdate,
        action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];
  const collectionOfMatchProfiles = [
    {
      matchProfile: { profileName: matchProfileNameForInstance,
        incomingRecordFields: {
          field: '001'
        },
        existingRecordFields: {
          field: '001'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'MARC_BIBLIOGRAPHIC' }
    },
    {
      matchProfile: { profileName: matchProfileNameForHoldings,
        incomingRecordFields: {
          field: '901',
          subfield: 'h'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'HOLDINGS',
        holdingsOption: NewMatchProfile.optionsList.holdingsHrid }
    },
    {
      matchProfile: {
        profileName: matchProfileNameForItem,
        incomingRecordFields: {
          field: '902',
          subfield: 'i'
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: 'ITEM',
        itemOption: NewMatchProfile.optionsList.itemHrid
      }
    }
  ];
  const jobProfileForUpdate = {
    ...NewJobProfile.defaultJobProfile,
    profileName: jobProfileNameForUpdate,
    acceptedType: NewJobProfile.acceptedDataType.marc
  };

  before('login', () => {
    cy.getAdminToken();
    cy.loginAsAdmin({ path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
  });

  it('C356802 Check import summary table with "Updated" actions for instance, holding and item (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create profiles via API
      testData.jobProfileForCreate = jobProfileForCreate;

      testData.forEach(specialPair => {
        cy.createOnePairMappingAndActionProfiles(specialPair.mappingProfile, specialPair.actionProfile).then(idActionProfile => {
          cy.addJobProfileRelation(testData.jobProfileForCreate.addedRelations, idActionProfile);
        });
      });
      SettingsJobProfiles.createJobProfileApi(testData.jobProfileForCreate)
        .then((bodyWithjobProfile) => {
          testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
        });

      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      // upload a marc file for creating of the new instance, holding and item
      DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForImportCreate);
      JobProfiles.searchJobProfileForImport(testData.jobProfileForCreate.profile.name);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForImportCreate);
      Logs.checkStatusOfJobProfile('Completed');
      Logs.openFileDetails(nameMarcFileForImportCreate);
      // check the instance is created
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then(initialInstanceHrId => {
        instanceHrid = initialInstanceHrId;

        InventoryInstance.checkIsInstancePresented(instanceTitle, holdingsPermanentLocation, itemStatus);
        cy.go('back');

        cy.visit(SettingsMenu.exportMappingProfilePath);
        ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile.name);

        cy.visit(SettingsMenu.exportJobProfilePath);
        ExportJobProfiles.createJobProfile(jobProfileNameForExport, mappingProfileNameForExport);

        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
        ExportFile.downloadExportedMarcFile(nameMarcFileForImportUpdate);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));

        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
        NewFieldMappingProfile.fillCatalogedDate(collectionOfMappingAndActionProfiles[0].mappingProfile.catalogedDate);
        NewFieldMappingProfile.fillInstanceStatusTerm(collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatus);
        NewFieldMappingProfile.addStatisticalCode(collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCode, 8);
        FieldMappingProfiles.saveProfile();
        FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfileNameForUpdate);

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
        NewFieldMappingProfile.fillHoldingsType(collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsType);
        NewFieldMappingProfile.fillPermanentLocation(collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation);
        NewFieldMappingProfile.fillCallNumberType(collectionOfMappingAndActionProfiles[1].mappingProfile.callNumberType);
        NewFieldMappingProfile.fillCallNumber(collectionOfMappingAndActionProfiles[1].mappingProfile.callNumber);
        NewFieldMappingProfile.addElectronicAccess(collectionOfMappingAndActionProfiles[1].mappingProfile.relationship, collectionOfMappingAndActionProfiles[1].mappingProfile.uri);
        FieldMappingProfiles.saveProfile();
        FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfileNameForUpdate);
      });

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
      NewFieldMappingProfile.fillMaterialType(collectionOfMappingAndActionProfiles[2].mappingProfile.materialType);
      NewFieldMappingProfile.addItemNotes(
        collectionOfMappingAndActionProfiles[2].mappingProfile.noteType,
        collectionOfMappingAndActionProfiles[2].mappingProfile.note,
        collectionOfMappingAndActionProfiles[2].mappingProfile.staffOnly
      );
      NewFieldMappingProfile.fillPermanentLoanType(collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType);
      NewFieldMappingProfile.fillStatus(collectionOfMappingAndActionProfiles[2].mappingProfile.status);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfileNameForUpdate);

      // create action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create match profiles
      cy.visit(SettingsMenu.matchProfilePath);
      collectionOfMatchProfiles.forEach(profile => {
        MatchProfiles.createMatchProfile(profile.matchProfile);
        MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfileWithLinkingProfilesForUpdate(jobProfileForUpdate);
      NewJobProfile.linkMatchAndActionProfilesForInstance(instanceActionProfileNameForUpdate, matchProfileNameForInstance, 0);
      NewJobProfile.linkMatchAndActionProfilesForHoldings(holdingsActionProfileNameForUpdate, matchProfileNameForHoldings, 2);
      NewJobProfile.linkMatchAndActionProfilesForItem(itemActionProfileNameForUpdate, matchProfileNameForItem, 4);
      NewJobProfile.saveAndClose();

      // upload the exported marc file
      cy.visit(TopMenu.dataImportPath);
      // TODO delete reload after fix https://issues.folio.org/browse/MODDATAIMP-691
      cy.reload();
      DataImport.uploadExportedFile(nameMarcFileForImportUpdate);
      JobProfiles.searchJobProfileForImport(jobProfileForUpdate.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(nameMarcFileForImportUpdate);
      Logs.openFileDetails(nameMarcFileForImportUpdate);
      [FileDetails.columnName.srsMarc,
        FileDetails.columnName.instance,
        FileDetails.columnName.holdings,
        FileDetails.columnName.item].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
      });
      // check Created counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(0, '0');
      // check Updated counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(1, quantityOfItems);
      // check Discarded counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(2, '0');
      // check Error counter in the Summary table
      FileDetails.checkItemsQuantityInSummaryTable(3, '0');

      // check instance, holdings, item are updated
      FileDetails.openInstanceInInventory('Updated');
      InstanceRecordView.verifyCatalogedDate(new Date().toISOString());
      InstanceRecordView.verifyInstanceStatusTerm(collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatus);
      InstanceRecordView.verifyStatisticalCode(collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCodeUI);
      InstanceRecordView.openHoldingView();
      HoldingsRecordView.checkHoldingsType(collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsType);
      HoldingsRecordView.checkPermanentLocation(collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation);
      HoldingsRecordView.checkCallNumberType(collectionOfMappingAndActionProfiles[1].mappingProfile.callNumberType);
      HoldingsRecordView.checkCallNumber(collectionOfMappingAndActionProfiles[1].mappingProfile.callNumber);
      HoldingsRecordView.checkElectronicAccess(collectionOfMappingAndActionProfiles[1].mappingProfile.relationship, collectionOfMappingAndActionProfiles[1].mappingProfile.uri);
      HoldingsRecordView.close();
      InventoryInstance.openHoldingsAccordion(collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation);
      itemRecordView.verifyMaterialType(collectionOfMappingAndActionProfiles[2].mappingProfile.materialType);
      itemRecordView.verifyNote(collectionOfMappingAndActionProfiles[2].mappingProfile.note, collectionOfMappingAndActionProfiles[2].mappingProfile.staffOnly);
      itemRecordView.verifyPermanentLoanType(collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType);
      itemRecordView.verifyItemStatus(collectionOfMappingAndActionProfiles[2].mappingProfile.status);

      // noteType: '"Electronic bookplate"',
    });
});
