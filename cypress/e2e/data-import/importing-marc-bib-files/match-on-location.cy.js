/* eslint-disable cypress/no-unnecessary-waiting */
import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  PROFILE_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
} from '../../../support/constants';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import SettingsJobProfiles from '../../../support/fragments/settings/dataImport/settingsJobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import FileManager from '../../../support/utils/fileManager';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const permanentLocation = 'Main Library (KU/CC/DI/M)';
    const recordType = 'MARC_BIBLIOGRAPHIC';
    const rowNumbers = [0, 1, 2];
    const instanceHrids = [];
    // elements for update items
    const noteForHoldingsMappingProfile = 'This note for holdings mapping profile';
    const noteForItemMappingProfile = 'This note for item mapping profile';
    // unique file name
    const marcFileForCreate = `C17027 autoTestFile.${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;
    const fileNameAfterUpdate = `C17027 marcFileForMatchOnLocation.${getRandomPostfix()}.mrc`;

    // profiles for creating instance, holdings, item
    const instanceMappingProfileForCreate = {
      profile: {
        name: `autotest_instance_mapping_profile_${getRandomPostfix()}`,
        incomingRecordType: recordType,
        existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
      },
    };
    const holdingsMappingProfileForCreate = {
      profile: {
        name: `autotest_holdings_mapping_profile_${getRandomPostfix()}`,
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
        name: `autotest_item_mapping_profile_${getRandomPostfix()}`,
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
        name: `autotest_instance_action_profile_${getRandomPostfix()}`,
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
        name: `autotest_holdings_action_profile_${getRandomPostfix()}`,
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
        name: `autotest_item_action_profile_${getRandomPostfix()}`,
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
        name: `autotest_job_profile_${getRandomPostfix()}`,
        dataType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      },
      addedRelations: [],
      deletedRelations: [],
    };

    // profiles for updating instance, holdings, item
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C17027 match profile Instance HRID or UUID.${getRandomPostfix()}`,
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
          profileName: `C17027 match profile Holdings Permanent location.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '960',
            subfield: 'a',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.holdingsPermLoc,
        },
      },
      {
        matchProfile: {
          profileName: `C17027 match profile Item Permanent location.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '960',
            subfield: 'b',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.itemPermLoc,
        },
      },
    ];
    const holdingsMappingProfileForUpdate = {
      name: `C17027 mapping profile update holdings.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
    };
    const itemMappingProfileForUpdate = {
      name: `C17027 mapping profile update item.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ITEM,
    };
    const holdingsActionProfileForUpdate = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C17027 action profile update holdings.${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const itemActionProfileForUpdate = {
      typeValue: FOLIO_RECORD_TYPE.ITEM,
      name: `C17027 action profile update item.${getRandomPostfix()}`,
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C17027 job profile.${getRandomPostfix()}`,
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

        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile('marcFileForC17027.mrc', marcFileForCreate);
        JobProfiles.search(testData.jobProfileForCreate.profile.name);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileForCreate);
        Logs.openFileDetails(marcFileForCreate);
        rowNumbers.forEach((rowNumber) => {
          FileDetails.checkStatusInColumn(
            FileDetails.status.created,
            FileDetails.columnNameInResultList.srsMarc,
            rowNumber,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.created,
            FileDetails.columnNameInResultList.instance,
            rowNumber,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.created,
            FileDetails.columnNameInResultList.holdings,
            rowNumber,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.created,
            FileDetails.columnNameInResultList.item,
            rowNumber,
          );
        });
        FileDetails.checkItemsQuantityInSummaryTable(0, '3');
        // collect instance hrids
        rowNumbers.forEach((rowNumber) => {
          // need to wait until page will be opened in loop
          cy.wait(3000);
          cy.visit(TopMenu.dataImportPath);
          Logs.openFileDetails(marcFileForCreate);
          FileDetails.openInstanceInInventory('Created', rowNumber);
          InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
            instanceHrids.push(initialInstanceHrId);
          });
        });
      });
    });

    after('delete test data', () => {
      // delete profiles
      JobProfiles.deleteJobProfile(jobProfileForCreate.profile.name);
      JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
      collectionOfMatchProfiles.forEach((profile) => {
        MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
      });
      ActionProfiles.deleteActionProfile(instanceActionProfileForCreate.profile.name);
      ActionProfiles.deleteActionProfile(holdingsActionProfileForCreate.profile.name);
      ActionProfiles.deleteActionProfile(itemActionProfileForCreate.profile.name);
      ActionProfiles.deleteActionProfile(holdingsActionProfileForUpdate.name);
      ActionProfiles.deleteActionProfile(itemActionProfileForUpdate.name);
      FieldMappingProfileView.deleteViaApi(instanceMappingProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(holdingsMappingProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(itemMappingProfileForCreate.profile.name);
      FieldMappingProfileView.deleteViaApi(holdingsMappingProfileForUpdate.name);
      FieldMappingProfileView.deleteViaApi(itemMappingProfileForUpdate.name);
      // delete created files
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${fileNameAfterUpdate}`);
      instanceHrids.forEach((hrid) => {
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
          (instance) => {
            cy.deleteItemViaApi(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C17027 Match on location (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // change Instance HRID in .mrc file
        DataImport.editMarcFile(
          'marcFileForC17027.mrc',
          editedMarcFileName,
          ['ocn933596084', 'ocn919480357', 'ocn919563272'],
          [instanceHrids[0], instanceHrids[1], instanceHrids[2]],
        );

        // create Match profile
        cy.visit(SettingsMenu.matchProfilePath);
        collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
        });

        // create Field mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfileForUpdate);
        NewFieldMappingProfile.addAdministrativeNote(noteForHoldingsMappingProfile, 5);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(holdingsMappingProfileForUpdate.name);
        FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileForUpdate.name);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfileForUpdate);
        NewFieldMappingProfile.addAdministrativeNote(noteForItemMappingProfile, 7);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(itemMappingProfileForUpdate.name);
        FieldMappingProfiles.checkMappingProfilePresented(itemMappingProfileForUpdate.name);

        // create Action profiles
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(holdingsActionProfileForUpdate, holdingsMappingProfileForUpdate.name);
        ActionProfiles.checkActionProfilePresented(holdingsActionProfileForUpdate.name);
        ActionProfiles.create(itemActionProfileForUpdate, itemMappingProfileForUpdate.name);
        ActionProfiles.checkActionProfilePresented(itemActionProfileForUpdate.name);

        // create Job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );
        NewJobProfile.linkActionProfileForMatches(holdingsActionProfileForUpdate.name);
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[2].matchProfile.profileName,
          2,
        );
        NewJobProfile.linkActionProfileForMatches(itemActionProfileForUpdate.name, 2);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        // upload a marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, fileNameAfterUpdate);
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameAfterUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameAfterUpdate);
        rowNumbers.forEach((rowNumber) => {
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.holdings,
            rowNumber,
          );
          FileDetails.checkStatusInColumn(
            FileDetails.status.updated,
            FileDetails.columnNameInResultList.item,
            rowNumber,
          );
        });
        FileDetails.checkHoldingsQuantityInSummaryTable('3', 1);
        FileDetails.checkItemQuantityInSummaryTable('3', 1);

        // check updated items in Inventory
        instanceHrids.forEach((hrid) => {
          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(hrid);
          InventoryInstance.openHoldingView();
          HoldingsRecordView.checkAdministrativeNote(noteForHoldingsMappingProfile);
          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
          InventoryInstance.openItemByBarcode('No barcode');
          ItemRecordView.checkItemAdministrativeNote(noteForItemMappingProfile);
        });
      },
    );
  });
});
