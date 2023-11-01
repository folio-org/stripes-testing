import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  ACCEPTED_DATA_TYPE_NAMES,
  PROFILE_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  LOCATION_NAMES,
} from '../../../support/constants';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/settingsJobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import FileManager from '../../../support/utils/fileManager';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import GenerateIdentifierCode from '../../../support/utils/generateIdentifierCode';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    const quantityOfItems = '1';
    const uniqSubject = `35678123678${GenerateIdentifierCode.getRandomIdentifierCode()}`;
    const filePathForUpload = 'marcFileForC11123.mrc';
    const instance = {
      instanceTitle: 'Love enough / Dionne Brand.',
      instanceSubject: uniqSubject,
      holdingsLocation: `${LOCATION_NAMES.MAIN_LIBRARY_UI} >`,
      itemStatus: ITEM_STATUS_NAMES.AVAILABLE,
    };
    const permanentLocation = LOCATION_NAMES.MAIN_LIBRARY;
    const recordType = 'MARC_BIBLIOGRAPHIC';
    const note = 'Test administrative note for item';
    // unique file name
    const editedMarcFileNameForCreate = `C11123 autotestFile.${getRandomPostfix()}.mrc`;
    const marcFileForCreate = `C11123 autoTestFile.${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C11123 autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForUpload = `C11123 autotestFile.${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C11123 fileWithItemHrid.${getRandomPostfix()}.mrc`;
    const nameMarcFileForUpdate = `C11123 autotestFileForUpdateItem.${getRandomPostfix()}.mrc`;
    // unique profile names for creating
    const instanceMappingProfileNameForCreate = `C11123 autotest_instance_mapping_profile_${getRandomPostfix()}`;
    const holdingsMappingProfileNameForCreate = `C11123 autotest_holdings_mapping_profile_${getRandomPostfix()}`;
    const itemMappingProfileNameForCreate = `C11123 autotest_item_mapping_profile_${getRandomPostfix()}`;
    const instanceActionProfileNameForCreate = `C11123 autotest_instance_action_profile_${getRandomPostfix()}`;
    const holdingsActionProfileNameForCreate = `C11123 autotest_holdings_action_profile_${getRandomPostfix()}`;
    const itemActionProfileNameForCreate = `C11123 autotest_item_action_profile_${getRandomPostfix()}`;
    const jobProfileNameForCreate = `C11123 autotest_job_profile_${getRandomPostfix()}`;

    // profiles for creating instance, holdings, item
    const instanceMappingProfileForCreate = {
      profile: {
        name: instanceMappingProfileNameForCreate,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      },
    };
    const holdingsMappingProfileForCreate = {
      profile: {
        name: holdingsMappingProfileNameForCreate,
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
              value: `"${permanentLocation}"`,
            },
          ],
        },
      },
    };
    const itemMappingProfileForCreate = {
      profile: {
        name: itemMappingProfileNameForCreate,
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
            {
              name: 'permanentLocation.id',
              enabled: 'true',
              path: 'item.permanentLocation.id',
              value: `"${permanentLocation}"`,
              acceptedValues: {
                'fcd64ce1-6995-48f0-840e-89ffa2288371': 'Main Library (KU/CC/DI/M)',
              },
            },
          ],
        },
      },
    };
    const instanceActionProfileForCreate = {
      profile: {
        name: instanceActionProfileNameForCreate,
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
        name: holdingsActionProfileNameForCreate,
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
        name: itemActionProfileNameForCreate,
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
    const testData = [
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
    const jobProfileForCreate = {
      profile: {
        name: jobProfileNameForCreate,
        dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      },
      addedRelations: [],
      deletedRelations: [],
    };
    // profiles for updating item
    const matchProfile = {
      profileName: `C11123 match profile.${getRandomPostfix()}`,
      incomingRecordFields: {
        field: '945',
        in1: '*',
        in2: '*',
        subfield: 'a',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
      itemOption: NewMatchProfile.optionsList.itemHrid,
    };
    const itemMappingProfileForUpdate = {
      name: `C11123 mapping profile update item.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ITEM,
    };
    const itemActionProfileForUpdate = {
      typeValue: FOLIO_RECORD_TYPE.ITEM,
      name: `C11123 action profile update item.${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11123 job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create test data', () => {
      cy.loginAsAdmin();
      cy.getAdminToken().then(() => {
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

        // change file to add uniq subject
        DataImport.editMarcFile(
          filePathForUpload,
          editedMarcFileNameForCreate,
          ['35678123678'],
          [uniqSubject],
        );

        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileNameForCreate, marcFileForCreate);
        JobProfiles.search(testData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileForCreate);
        Logs.openFileDetails(marcFileForCreate);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, quantityOfItems);
      });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForUpload}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      JobProfiles.deleteJobProfile(jobProfileForCreate.profile.name);
      JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(instanceActionProfileForCreate.profile.name);
      ActionProfiles.deleteActionProfile(holdingsActionProfileForCreate.profile.name);
      ActionProfiles.deleteActionProfile(itemActionProfileForCreate.profile.name);
      ActionProfiles.deleteActionProfile(itemActionProfileForUpdate.name);
      FieldMappingProfileView.deleteViaApi(instanceMappingProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(holdingsMappingProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(itemMappingProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(itemMappingProfileForUpdate.name);
      cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
        (initialInstance) => {
          cy.deleteItemViaApi(initialInstance.items[0].id);
          cy.deleteHoldingRecordViaApi(initialInstance.holdings[0].id);
          InventoryInstance.deleteInstanceViaApi(initialInstance.id);
        },
      );
    });

    it(
      'C11123 Export from Inventory, edit file, and re-import to update items (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        FileDetails.openInstanceInInventory('Created');
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InventoryInstance.checkIsInstancePresented(
            instance.instanceTitle,
            instance.holdingsLocation,
            instance.itemStatus,
          );
          InventoryInstance.openItemByBarcode('No barcode');
          ItemRecordView.getAssignedHRID().then((initialItemHrId) => {
            const itemHrid = initialItemHrId;

            ItemRecordView.closeDetailView();
            InventorySearchAndFilter.searchByParameter('Subject', instance.instanceSubject);
            InventorySearchAndFilter.selectResultCheckboxes(1);
            InventorySearchAndFilter.saveUUIDs();
            ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');

            // download exported marc file
            cy.visit(TopMenu.dataExportPath);
            ExportFile.uploadFile(nameForCSVFile);
            ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
            ExportFile.downloadExportedMarcFile(nameMarcFileForUpload);

            // change file using item hrid for 945 field
            DataImport.editMarcFile(
              nameMarcFileForUpload,
              editedMarcFileName,
              ['testHrid'],
              [itemHrid],
            );
          });

          // create mapping profile for update
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.openNewMappingProfileForm();
          NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfileForUpdate);
          NewFieldMappingProfile.addAdministrativeNote(note, 7);
          NewFieldMappingProfile.save();
          FieldMappingProfileView.closeViewMode(itemMappingProfileForUpdate.name);
          FieldMappingProfiles.checkMappingProfilePresented(itemMappingProfileForUpdate.name);

          // create action profile for update
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(itemActionProfileForUpdate, itemMappingProfileForUpdate.name);
          ActionProfiles.checkActionProfilePresented(itemActionProfileForUpdate.name);

          // create match profile for update
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfile(matchProfile);
          MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

          // create job profile for update
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.createJobProfileWithLinkingProfiles(
            jobProfileForUpdate,
            itemActionProfileForUpdate.name,
            matchProfile.profileName,
          );
          JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

          // upload a marc file for creating of the new instance, holding and item
          cy.visit(TopMenu.dataImportPath);
          // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName, nameMarcFileForUpdate);
          JobProfiles.search(jobProfileForUpdate.profileName);
          JobProfiles.runImportFile();
          JobProfiles.waitFileIsImported(nameMarcFileForUpdate);
          Logs.openFileDetails(nameMarcFileForUpdate);
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.item,
          );
          FileDetails.checkItemQuantityInSummaryTable(quantityOfItems, 1);

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
          InventoryInstance.openItemByBarcode('No barcode');
          ItemRecordView.checkItemAdministrativeNote(note);
        });
      },
    );
  });
});
