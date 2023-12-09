import uuid from 'uuid';
import {
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Log details', () => {
    let user;
    const testData = {
      firstInstanceTitle: `C375109 firstAutotestInstance ${getRandomPostfix()}`,
      firstBarcode: uuid(),
      secondInstanceTitle: `C422064 secondAutotestInstance ${getRandomPostfix()}`,
      secondBarcode: uuid(),
    };
    const exportJobProfileName = `Testing titles for import.${getRandomPostfix()}`;
    const exportMappingProfile = {
      name: `Testing titles for import.${getRandomPostfix()}`,
      holdingsTransformation: 'Holdings - HRID',
      holdingsMarcField: '911',
      subfieldForHoldings: '$h',
      itemTransformation: 'Item - HRID',
      itemMarcField: '911',
      subfieldForItem: '$i',
    };

    before('create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            testData.instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then(
            (locations) => {
              testData.locationsId = locations.id;
            },
          );
          cy.getLoanTypes({ limit: 1 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1 }).then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          // create first instance
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.firstInstanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [
              {
                barcode: uuid(),
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            testData.firstInstanceId = specialInstanceIds.instanceId;

            cy.getInstanceById(specialInstanceIds.instanceId).then((res) => {
              testData.firstHrid = res.hrid;
            });
          });

          // create second instance
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instanceTypeId,
              title: testData.secondInstanceTitle,
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationsId,
              },
            ],
            items: [
              {
                barcode: testData.secondBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
              },
            ],
          }).then((specialInstanceIds) => {
            testData.secondInstanceId = specialInstanceIds.instanceId;

            cy.getInstanceById(specialInstanceIds.instanceId).then((res) => {
              testData.secondHrid = res.hrid;
            });
          });
        });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.dataExportEnableSettings.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
        // create Field mapping profile for export
        cy.visit(SettingsMenu.exportMappingProfilePath);
        ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);

        // create job profile for export
        cy.visit(SettingsMenu.exportJobProfilePath);
        ExportJobProfiles.createJobProfile(exportJobProfileName, exportMappingProfile.name);
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C375109 When MARC Bib job profile only involves holdings and items, verify that the record title is present in the log details WITH instance match item (folijet)',
      { tags: ['criticalPath', 'folijet', 'nonParallel'] },
      () => {
        const marcFileNameForUpdate = `C375109 firstmarcFile${getRandomPostfix()}.mrc`;
        const csvFileName = `C375109 firstautotestFile${getRandomPostfix()}.csv`;
        const quantityOfItems = '1';
        const collectionOfMappingAndActionProfiles = [
          {
            mappingProfile: {
              typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
              name: `C375109 WITH instance match holdings.${getRandomPostfix()}`,
              adminNoteAction: 'Add this to existing',
              adminNote:
                'Purchased with grant funds for Cajun folklore materials; see item record for additional details',
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
              name: `C375109 WITH instance match holdings.${getRandomPostfix()}`,
              action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
            },
          },
          {
            mappingProfile: {
              typeValue: FOLIO_RECORD_TYPE.ITEM,
              name: `C375109 WITH instance match item.${getRandomPostfix()}`,
              itemNote: 'Add this to existing',
              noteType: 'Provenance',
              note: 'Acquired in 2022 from the Arceneaux Trust for Cajun History',
              staffOnly: 'Unmark for all affected records',
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.ITEM,
              name: `C375109 WITH instance match item.${getRandomPostfix()}`,
              action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
            },
          },
        ];
        const collectionOfMatchProfiles = [
          {
            matchProfile: {
              profileName: `C375109 WITH instance match instance.${getRandomPostfix()}`,
              incomingRecordFields: {
                field: '001',
              },
              matchCriterion: 'Exactly matches',
              existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
              instanceOption: NewMatchProfile.optionsList.instanceHrid,
            },
          },
          {
            matchProfile: {
              profileName: `C375109 WITH instance match holdings.${getRandomPostfix()}`,
              incomingRecordFields: {
                field: '911',
                subfield: 'h',
              },
              matchCriterion: 'Exactly matches',
              existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
              holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
            },
          },
          {
            matchProfile: {
              profileName: `C375109 WITH instance match item.${getRandomPostfix()}`,
              incomingRecordFields: {
                field: '911',
                subfield: 'i',
              },
              matchCriterion: 'Exactly matches',
              existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
              itemOption: NewMatchProfile.optionsList.itemHrid,
            },
          },
        ];
        const jobProfileWithMatch = {
          ...NewJobProfile.defaultJobProfile,
          profileName: `C375109 WITH instance match.${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        };

        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addAdministrativeNote(
          collectionOfMappingAndActionProfiles[0].mappingProfile.adminNote,
          5,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.addItemNotes(
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.noteType}"`,
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.note}"`,
          collectionOfMappingAndActionProfiles[1].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[0].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[0].matchProfile.profileName,
        );
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[1].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[2].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileWithMatch);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
          2,
        );
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[2].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          4,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileWithMatch.profileName);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(testData.firstHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(csvFileName, 'SearchInstanceUUIDs*');

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(csvFileName);
        ExportFile.exportWithCreatedJobProfile(csvFileName, exportJobProfileName);
        ExportFile.downloadExportedMarcFile(marcFileNameForUpdate);

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(marcFileNameForUpdate);
        JobProfiles.search(jobProfileWithMatch.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForUpdate);
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 1);
        FileDetails.checkItemQuantityInSummaryTable(quantityOfItems, 1);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.DASH, columnName);
        });
        [
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.verifyTitle(
          testData.firstInstanceTitle,
          FileDetails.columnNameInResultList.title,
        );

        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
        HoldingsRecordView.checkAdministrativeNote(
          collectionOfMappingAndActionProfiles[0].mappingProfile.adminNote,
        );
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.openItemInInventory(RECORD_STATUSES.UPDATED);
        ItemRecordView.checkItemNote(
          collectionOfMappingAndActionProfiles[1].mappingProfile.note,
          'No',
          collectionOfMappingAndActionProfiles[1].mappingProfile.noteType,
        );

        FileManager.deleteFile(`cypress/fixtures/${marcFileNameForUpdate}`);
        FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          '*C375109 firstmarcFile*',
          '*SearchInstanceUUIDs*',
        );
        cy.getAdminToken().then(() => {
          JobProfiles.deleteJobProfile(jobProfileWithMatch.profileName);
          cy.wrap(collectionOfMatchProfiles).each((profile) => {
            MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
          });
          cy.wrap(collectionOfMappingAndActionProfiles).each((profile) => {
            ActionProfiles.deleteActionProfile(profile.actionProfile.name);
            FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
          });
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"hrid"=="${testData.firstHrid}"`,
          }).then((instance) => {
            cy.deleteItemViaApi(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          });
        });
      },
    );

    it(
      'C422064 When MARC Bib job profile only involves holdings and items, verify that the record title is present in the log details WITHOUT instance match item (folijet)',
      { tags: ['criticalPath', 'folijet', 'nonParallel'] },
      () => {
        const marcFileNameForUpdate = `C422064 firstmarcFile${getRandomPostfix()}.mrc`;
        const csvFileName = `C422064 firstautotestFile${getRandomPostfix()}.csv`;
        const quantityOfItems = '1';
        const collectionOfMappingAndActionProfiles = [
          {
            mappingProfile: {
              typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
              name: `C422064 WITHOUT instance match holdings.${getRandomPostfix()}`,
              adminNotes: 'Add this to existing',
              adminNote:
                'Purchased with grant funds for Cajun folklore materials; see item record for additional details',
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
              name: `C422064 WITHOUT instance match holdings.${getRandomPostfix()}`,
              action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
            },
          },
          {
            mappingProfile: {
              typeValue: FOLIO_RECORD_TYPE.ITEM,
              name: `C422064 WITHOUT instance match item.${getRandomPostfix()}`,
              itemNote: 'Add this to existing',
              noteType: 'Provenance',
              note: 'Acquired in 2022 from the Arceneaux Trust for Cajun History',
              staffOnly: 'Unmark for all affected records',
            },
            actionProfile: {
              typeValue: FOLIO_RECORD_TYPE.ITEM,
              name: `C422064 WITHOUT instance match item.${getRandomPostfix()}`,
              action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
            },
          },
        ];
        const collectionOfMatchProfiles = [
          {
            matchProfile: {
              profileName: `C422064 WITHOUT instance match holdings.${getRandomPostfix()}`,
              incomingRecordFields: {
                field: '911',
                subfield: 'h',
              },
              matchCriterion: 'Exactly matches',
              existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
              holdingsOption: NewMatchProfile.optionsList.holdingsHrid,
            },
          },
          {
            matchProfile: {
              profileName: `C422064 WITHOUT instance match item.${getRandomPostfix()}`,
              incomingRecordFields: {
                field: '911',
                subfield: 'i',
              },
              matchCriterion: 'Exactly matches',
              existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
              itemOption: NewMatchProfile.optionsList.itemHrid,
            },
          },
        ];
        const jobProfileWithoutMatch = {
          ...NewJobProfile.defaultJobProfile,
          profileName: `C422064 WITHOUT instance match.${getRandomPostfix()}`,
          acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
        };

        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addAdministrativeNote(
          collectionOfMappingAndActionProfiles[0].mappingProfile.adminNote,
          5,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.addItemNotes(
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.noteType}"`,
          `"${collectionOfMappingAndActionProfiles[1].mappingProfile.note}"`,
          collectionOfMappingAndActionProfiles[1].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        // create action profiles
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[0].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[0].matchProfile.profileName,
        );
        MatchProfiles.createMatchProfile(collectionOfMatchProfiles[1].matchProfile);
        MatchProfiles.checkMatchProfilePresented(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileWithoutMatch);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[0].actionProfile.name,
        );
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[1].matchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(
          collectionOfMappingAndActionProfiles[1].actionProfile.name,
          2,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileWithoutMatch.profileName);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchInstanceByHRID(testData.secondHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InventorySearchAndFilter.selectResultCheckboxes(1);
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(csvFileName, 'SearchInstanceUUIDs*');

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(csvFileName);
        ExportFile.exportWithCreatedJobProfile(csvFileName, exportJobProfileName);
        ExportFile.downloadExportedMarcFile(marcFileNameForUpdate);

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(marcFileNameForUpdate);
        JobProfiles.search(jobProfileWithoutMatch.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileNameForUpdate);
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfItems, 1);
        FileDetails.checkItemQuantityInSummaryTable(quantityOfItems, 1);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.DASH, columnName);
        });
        [
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.verifyTitle(
          testData.secondInstanceTitle,
          FileDetails.columnNameInResultList.title,
        );

        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
        HoldingsRecordView.checkAdministrativeNote(
          collectionOfMappingAndActionProfiles[0].mappingProfile.adminNote,
        );
        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.openItemInInventory(RECORD_STATUSES.UPDATED);
        ItemRecordView.checkItemNote(
          collectionOfMappingAndActionProfiles[1].mappingProfile.note,
          'No',
          collectionOfMappingAndActionProfiles[1].mappingProfile.noteType,
        );

        FileManager.deleteFile(`cypress/fixtures/${marcFileNameForUpdate}`);
        FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
        FileManager.deleteFileFromDownloadsByMask(
          '*C375109 firstmarcFile*',
          '*SearchInstanceUUIDs*',
        );
        cy.getAdminToken().then(() => {
          JobProfiles.deleteJobProfile(jobProfileWithoutMatch.profileName);
          cy.wrap(collectionOfMatchProfiles).each((profile) => {
            MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
          });
          cy.wrap(collectionOfMappingAndActionProfiles).each((profile) => {
            ActionProfiles.deleteActionProfile(profile.actionProfile.name);
            FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
          });
          cy.getInstance({
            limit: 1,
            expandAll: true,
            query: `"hrid"=="${testData.secondHrid}"`,
          }).then((instance) => {
            cy.deleteItemViaApi(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          });
        });
      },
    );
  });
});
