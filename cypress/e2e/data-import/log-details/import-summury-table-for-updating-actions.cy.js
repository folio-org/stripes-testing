import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Parallelization } from '../../../support/dictionary';
import {
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  EXPORT_TRANSFORMATION_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  PROFILE_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
  HOLDINGS_TYPE_NAMES,
} from '../../../support/constants';
import DateTools from '../../../support/utils/dateTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
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
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Log details', () => {
    let instanceHrid;
    const recordType = 'MARC_BIBLIOGRAPHIC';
    const holdingsPermanentLocation = 'Annex';
    const itemStatus = ITEM_STATUS_NAMES.AVAILABLE;
    const quantityOfItems = '1';
    const instanceTitle =
      'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)';
    // file names
    const nameMarcFileForImportCreate = `C356802autotestFile.${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C356802autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForImportUpdate = `C356802autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileNameForExport = `C356802 job profile.${getRandomPostfix()}`;
    // profiles for creating instance, holdings, item
    const marcBibMappingProfileForCreate = {
      profile: {
        id: '',
        name: `C356802 create marcBib mapping profile ${getRandomPostfix()}`,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
        mappingDetails: {
          name: 'holdings',
          recordType: 'MARC_BIBLIOGRAPHIC',
          marcMappingDetails: [
            {
              order: 0,
              action: 'ADD',
              field: {
                field: '650',
                indicator2: '4',
                subfields: [
                  {
                    subfield: 'a',
                    data: {
                      text: 'Test update',
                    },
                  },
                ],
              },
            },
          ],
          marcMappingOption: 'MODIFY',
        },
      },
    };
    const instanceMappingProfileForCreate = {
      profile: {
        id: '',
        name: `C356802 create instance mapping profile ${getRandomPostfix()}`,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      },
    };
    const holdingsMappingProfileForCreate = {
      profile: {
        id: '',
        name: `C356802 create holdings mapping profile ${getRandomPostfix()}`,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
        mappingDetails: {
          name: 'holdings',
          recordType: 'HOLDINGS',
          mappingFields: [
            {
              name: 'permanentLocationId',
              enabled: true,
              path: 'holdings.permanentLocationId',
              value: '"Annex (KU/CC/DI/A)"',
            },
          ],
        },
      },
    };
    const itemMappingProfileForCreate = {
      profile: {
        id: '',
        name: `C356802 create item mapping profile ${getRandomPostfix()}`,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
        mappingDetails: {
          name: 'item',
          recordType: 'ITEM',
          mappingFields: [
            {
              name: 'materialType.id',
              enabled: true,
              path: 'item.materialType.id',
              value: '"book"',
              acceptedValues: { '1a54b431-2e4f-452d-9cae-9cee66c9a892': 'book' },
            },
            {
              name: 'permanentLoanType.id',
              enabled: true,
              path: 'item.permanentLoanType.id',
              value: '"Can circulate"',
              acceptedValues: { '2b94c631-fca9-4892-a730-03ee529ffe27': 'Can circulate' },
            },
            { name: 'status.name', enabled: true, path: 'item.status.name', value: '"Available"' },
          ],
        },
      },
    };
    const marcBibActionProfileForCreate = {
      profile: {
        id: '',
        name: `C356802 create marcBib action profile ${getRandomPostfix()}`,
        action: 'MODIFY',
        folioRecord: recordType,
      },
      addedRelations: [
        {
          masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
          detailProfileId: '',
          detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
        },
      ],
      deletedRelations: [],
    };
    const instanceActionProfileForCreate = {
      profile: {
        id: '',
        name: `C356802 create instance action profile ${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecord: 'INSTANCE',
      },
      addedRelations: [
        {
          masterProfileId: null,
          masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
          detailProfileId: '',
          detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
        },
      ],
      deletedRelations: [],
    };
    const holdingsActionProfileForCreate = {
      profile: {
        id: '',
        name: `C356802 create holdings action profile ${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecord: 'HOLDINGS',
      },
      addedRelations: [
        {
          masterProfileId: null,
          masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
          detailProfileId: '',
          detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
        },
      ],
      deletedRelations: [],
    };
    const itemActionProfileForCreate = {
      profile: {
        id: '',
        name: `C356802 create item action profile ${getRandomPostfix()}`,
        action: 'CREATE',
        folioRecord: 'ITEM',
      },
      addedRelations: [
        {
          masterProfileId: null,
          masterProfileType: PROFILE_TYPE_NAMES.ACTION_PROFILE,
          detailProfileId: '',
          detailProfileType: PROFILE_TYPE_NAMES.MAPPING_PROFILE,
        },
      ],
      deletedRelations: [],
    };
    const jobProfileForCreate = {
      profile: {
        name: `C356802 create job profile ${getRandomPostfix()}`,
        dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      },
      addedRelations: [],
      deletedRelations: [],
    };
    // TODO redesine classes inherites
    const testData = [
      {
        mappingProfile: marcBibMappingProfileForCreate,
        actionProfile: marcBibActionProfileForCreate,
      },
      {
        mappingProfile: instanceMappingProfileForCreate,
        actionProfile: instanceActionProfileForCreate,
      },
      {
        mappingProfile: holdingsMappingProfileForCreate,
        actionProfile: holdingsActionProfileForCreate,
      },
      { mappingProfile: itemMappingProfileForCreate, actionProfile: itemActionProfileForCreate },
    ];
    // create Field mapping profile for export
    const exportMappingProfile = {
      name: `C356802 mapping profile ${getRandomPostfix()}`,
      holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
      holdingsMarcField: '901',
      subfieldForHoldings: '$h',
      itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
      itemMarcField: '902',
      subfieldForItem: '$i',
    };
    // profiles for updating instance, holdings, item
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C356802 update instance mapping profile ${getRandomPostfix()}`,
          catalogedDate: '###TODAY###',
          catalogedDateUi: DateTools.getFormattedDate({ date: new Date() }),
          instanceStatus: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C356802 update instance action profile ${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356802 update holdings mapping profile ${getRandomPostfix()}`,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          permanentLocationUI: LOCATION_NAMES.ONLINE_UI,
          callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          callNumber: '050$a " " 050$b',
          relationship: 'Resource',
          uri: '856$u',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356802 update holdings action profile ${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356802 update item mapping profile ${getRandomPostfix()}`,
          materialType: MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE,
          noteType: '"Electronic bookplate"',
          note: '"Smith Family Foundation"',
          noteUI: 'Smith Family Foundation',
          staffOnly: 'Mark for all affected records',
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356802 update item action profile ${getRandomPostfix()}`,
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C356802 MARC-to-MARC 001 to 001 match profile ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
          },
          existingRecordFields: {
            field: '001',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
        },
      },
      {
        matchProfile: {
          profileName: `C356802 MARC-to-Holdings 901h to Holdings HRID match profile ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '901',
            subfield: 'h',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
        },
      },
      {
        matchProfile: {
          profileName: `C356802 MARC-to-Item 902i to Item HRID match profile ${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '902',
            subfield: 'i',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.itemHrid,
        },
      },
    ];
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C356802 update job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForImportUpdate}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      JobProfiles.deleteJobProfile(jobProfileForCreate.profile.name);
      JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
      collectionOfMatchProfiles.forEach((profile) => {
        MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
      });
      ActionProfiles.deleteActionProfile(marcBibActionProfileForCreate.profile.name);
      ActionProfiles.deleteActionProfile(instanceActionProfileForCreate.profile.name);
      ActionProfiles.deleteActionProfile(holdingsActionProfileForCreate.profile.name);
      ActionProfiles.deleteActionProfile(itemActionProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(marcBibMappingProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(instanceMappingProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(holdingsMappingProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(itemMappingProfileForCreate.profile.name);
      collectionOfMappingAndActionProfiles.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (instance) => {
          cy.deleteItemViaApi(instance.items[0].id);
          cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(instance.id);
        },
      );
    });

    it(
      'C356802 Check import summary table with "Updated" actions for instance, holding and item (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet, Parallelization.parallel] },
      () => {
        // create profiles via API
        testData.jobProfileForCreate = jobProfileForCreate;

        testData.forEach((specialPair) => {
          cy.createOnePairMappingAndActionProfiles(
            specialPair.mappingProfile,
            specialPair.actionProfile,
          ).then((idActionProfile) => {
            cy.addJobProfileRelation(testData.jobProfileForCreate.addedRelations, idActionProfile);
          });
        });
        SettingsJobProfiles.createJobProfileApi(testData.jobProfileForCreate).then(
          (bodyWithjobProfile) => {
            testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
          },
        );

        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForImportCreate);
        JobProfiles.search(testData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForImportCreate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForImportCreate);

        // check the instance is created
        FileDetails.openInstanceInInventory(FileDetails.status.created);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InventoryInstance.checkIsInstancePresented(
            instanceTitle,
            holdingsPermanentLocation,
            itemStatus,
          );
          cy.wait(2000);
          cy.go('back');

          cy.visit(SettingsMenu.exportMappingProfilePath);
          ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);

          cy.visit(SettingsMenu.exportJobProfilePath);
          ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

          // download .csv file
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InventorySearchAndFilter.saveUUIDs();
          ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        });

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
        ExportFile.downloadExportedMarcFile(nameMarcFileForImportUpdate);

        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.fillCatalogedDate(
          collectionOfMappingAndActionProfiles[0].mappingProfile.catalogedDate,
        );
        NewFieldMappingProfile.fillInstanceStatusTerm(
          collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatus,
        );
        NewFieldMappingProfile.addStatisticalCode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCode,
          8,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.fillHoldingsType(
          collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsType,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.fillCallNumberType(
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.callNumberType}"`,
        );
        NewFieldMappingProfile.fillCallNumber(
          collectionOfMappingAndActionProfiles[1].mappingProfile.callNumber,
        );
        NewFieldMappingProfile.addElectronicAccess(
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.relationship}"`,
          collectionOfMappingAndActionProfiles[1].mappingProfile.uri,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[2].mappingProfile,
        );
        NewFieldMappingProfile.fillMaterialType(
          `"${collectionOfMappingAndActionProfiles[2].mappingProfile.materialType}"`,
        );
        NewFieldMappingProfile.addItemNotes(
          collectionOfMappingAndActionProfiles[2].mappingProfile.noteType,
          collectionOfMappingAndActionProfiles[2].mappingProfile.note,
          collectionOfMappingAndActionProfiles[2].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          collectionOfMappingAndActionProfiles[2].mappingProfile.status,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
        });

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfileWithLinkingProfilesForUpdate(jobProfileForUpdate);
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[0].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[1].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          2,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[2].matchProfile.profileName,
          collectionOfMappingAndActionProfiles[2].actionProfile.name,
          4,
        );
        NewJobProfile.saveAndClose();

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(nameMarcFileForImportUpdate);
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameMarcFileForImportUpdate);
        Logs.openFileDetails(nameMarcFileForImportUpdate);

        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.updated, columnName);
        });
        // check Created counter in the Summary table
        FileDetails.checkItemsQuantityInSummaryTable(0, '0');
        // check Updated counter in the Summary table
        FileDetails.checkItemsQuantityInSummaryTable(1, quantityOfItems);
        // check No action counter in the Summary table
        FileDetails.checkItemsQuantityInSummaryTable(2, '0');
        // check Error counter in the Summary table
        FileDetails.checkItemsQuantityInSummaryTable(3, '0');

        // check instance, holdings, item are updated
        FileDetails.openInstanceInInventory(FileDetails.status.updated);
        InstanceRecordView.verifyCatalogedDate(
          collectionOfMappingAndActionProfiles[0].mappingProfile.catalogedDateUi,
        );
        InstanceRecordView.verifyInstanceStatusTerm(
          collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatus,
        );
        InstanceRecordView.verifyStatisticalCode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCodeUI,
        );
        cy.wait(2000);
        cy.go('back');
        FileDetails.openHoldingsInInventory(FileDetails.status.updated);
        HoldingsRecordView.checkHoldingsType(
          collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsType,
        );
        HoldingsRecordView.checkPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocationUI,
        );
        HoldingsRecordView.checkCallNumberType(
          collectionOfMappingAndActionProfiles[1].mappingProfile.callNumberType,
        );
        HoldingsRecordView.checkCallNumber('-');
        HoldingsRecordView.openAccordion('Electronic access');
        HoldingsRecordView.checkElectronicAccess(
          collectionOfMappingAndActionProfiles[1].mappingProfile.relationship,
          'https://www.test.org/bro/10.230',
        );
        cy.wait(2000);
        cy.go('back');
        FileDetails.openItemInInventory(FileDetails.status.updated);
        ItemRecordView.verifyMaterialType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.materialType,
        );
        ItemRecordView.checkElectronicBookplateNote(
          collectionOfMappingAndActionProfiles[2].mappingProfile.noteUI,
        );
        ItemRecordView.verifyPermanentLoanType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType,
        );
        ItemRecordView.verifyItemStatus(
          collectionOfMappingAndActionProfiles[2].mappingProfile.status,
        );
      },
    );
  });
});
