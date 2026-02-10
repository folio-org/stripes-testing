import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  EXISTING_RECORD_NAMES,
  EXPORT_TRANSFORMATION_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../../support/constants';
import ExportFile from '../../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportFieldMappingProfiles from '../../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { parseSanityParameters } from '../../../../support/utils/users';

const { user, memberTenant } = parseSanityParameters();

describe('Data Import', () => {
  describe('Log details', () => {
    const instanceHrids = [];
    const quantityOfUpdatedItems = '2';
    const quantityOfCreatedItems = '1';
    const filePathForCreateInstance = 'marcFileForC356791.mrc';
    const filePathWithUpdatedContent = 'marcFileForC356791_for_update.mrc';
    const fileNameForCreateInstance = `C356791 autotestFileForCreate${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C356791autotestCsvFile.${getRandomPostfix()}.csv`;
    const exportedFileName = `C356791 autotestExportedFile${getRandomPostfix()}.mrc`;
    const fileNameWithUpdatedContent = `C356791 autotestFileForUpdate${getRandomPostfix()}.mrc`;
    const fileNameForUpdateInstance = `C356791 autotestFileForUpdate${getRandomPostfix()}.mrc`;
    const jobProfileNameForExport = `C356791 autotest job profile.${getRandomPostfix()}`;
    const addedInstanceTitle = 'Minakata Kumagusu kinrui saishoku zufu hyakusen.';

    const collectionOfProfilesForCreate = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
          name: `C356791 autotest marcBib mapping profile.${getRandomPostfix()}`,
          modifications: {
            action: 'Add',
            field: '650',
            ind1: '',
            ind2: '4',
            subfield: 'a',
            data: `Test update.${getRandomPostfix()}`,
          },
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
          name: `C356791 autotest marcBib action profile.${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.MODIFY,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C356791 autotest instance mapping profile.${getRandomPostfix()}`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C356791 autotest instance action profile.${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356791 autotest holdings mapping profile.${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          pernanentLocationUI: LOCATION_NAMES.ONLINE_UI,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356791 autotest holdings action profile.${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356791 autotest item mapping profile.${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
          status: ITEM_STATUS_NAMES.AVAILABLE,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356791 autotest item action profile.${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C356791 autotest job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const exportMappingProfile = {
      name: `C356791 autotest mapping profile.${getRandomPostfix()}`,
      holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
      holdingsMarcField: '901',
      subfieldForHoldings: 'h',
      itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
      itemMarcField: '902',
      subfieldForItem: 'i',
    };
    const collectionOfProfilesForUpdate = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C356791 autotest instance mapping profile.${getRandomPostfix()}`,
          catalogingDate: '###TODAY###',
          statusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C356791 autotest instance action profile.${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356791 autotest holdings mapping profile.${getRandomPostfix()}`,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
          permanetLocation: `"${LOCATION_NAMES.ONLINE}"`,
          permanetLocationUI: LOCATION_NAMES.ONLINE_UI,
          callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          callNumber: '050$a " " 050$b',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C356791 autotest action mapping profile.${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356791 autotest item mapping profile.${getRandomPostfix()}`,
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
          name: `C356791 autotest item action profile.${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];

    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C356791 MARC-to-MARC 001 to 001.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '001',
            in1: '',
            in2: '',
            subfield: '',
          },
          existingRecordFields: {
            field: '001',
            in1: '',
            in2: '',
            subfield: '',
          },
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
        },
      },
      {
        matchProfile: {
          profileName: `C356791 MARC-to-Holdings 901h to Holdings HRID.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '901',
            in1: '',
            in2: '',
            subfield: 'h',
          },
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          existingMatchExpressionValue: 'holdingsrecord.hrid',
        },
      },
      {
        matchProfile: {
          profileName: `C356791 MARC-to-Item 902i to Item HRID.${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '902',
            in1: '',
            in2: '',
            subfield: 'i',
          },
          recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
          existingRecordType: EXISTING_RECORD_NAMES.ITEM,
          existingMatchExpressionValue: 'item.hrid',
        },
      },
    ];
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C356791 autotest job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password);

      cy.allure().logCommandSteps(false);
      cy.login(user.username, user.password, {
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      cy.allure().logCommandSteps(true);
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${fileNameWithUpdatedContent}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFileFromDownloadsByMask(`*${exportedFileName}`);
      FileManager.deleteFileFromDownloadsByMask(`*${nameForCSVFile}`);
      cy.setTenant(memberTenant.id);
      cy.getUserToken(user.username, user.password).then(() => {
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        collectionOfProfilesForCreate.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        collectionOfProfilesForUpdate.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        cy.wrap(instanceHrids).each((hrid) => {
          cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${hrid}"` }).then(
            (instance) => {
              cy.deleteItemViaApi(instance.items[0].id);
              cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
              InventoryInstance.deleteInstanceViaApi(instance.id);
            },
          );
        });
      });
    });

    it(
      'C356791 Check import summary table with "create + update" actions (folijet)',
      { tags: ['dryRun', 'folijet', 'C356791'] },
      () => {
        // create mapping profiles for creating
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfProfilesForCreate[0].mappingProfile,
        );
        NewFieldMappingProfile.addFieldMappingsForMarc();
        NewFieldMappingProfile.fillModificationSectionWithAdd(
          collectionOfProfilesForCreate[0].mappingProfile.modifications,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfilesForCreate[0].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForCreate[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfProfilesForCreate[1].mappingProfile,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfilesForCreate[1].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForCreate[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfProfilesForCreate[2].mappingProfile,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfProfilesForCreate[2].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfilesForCreate[2].mappingProfile.name);

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfProfilesForCreate[3].mappingProfile,
        );
        NewFieldMappingProfile.fillMaterialType(
          collectionOfProfilesForCreate[3].mappingProfile.materialType,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfProfilesForCreate[3].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          `"${collectionOfProfilesForCreate[3].mappingProfile.status}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfilesForCreate[3].mappingProfile.name);

        // create action profiles for creating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfProfilesForCreate.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile for creating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfileForCreate);
        cy.wrap(collectionOfProfilesForCreate).each((profile) => {
          NewJobProfile.linkActionProfile(profile.actionProfile);
        });
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        // upload the marc file for creating
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForCreateInstance, fileNameForCreateInstance);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForCreateInstance);
        Logs.openFileDetails(fileNameForCreateInstance);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });

        // create Field mapping profile for export
        TopMenuNavigation.openAppFromDropdown(
          APPLICATION_NAMES.SETTINGS,
          APPLICATION_NAMES.DATA_EXPORT,
        );
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);
        cy.wait(10000);

        // create job profile for export
        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

        // create mapping profiles for updating
        TopMenuNavigation.openAppFromDropdown(
          APPLICATION_NAMES.SETTINGS,
          APPLICATION_NAMES.DATA_IMPORT,
        );
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfProfilesForUpdate[0].mappingProfile,
        );
        NewFieldMappingProfile.fillInstanceStatusTerm(
          collectionOfProfilesForUpdate[0].mappingProfile.instanceStatusTerm,
        );
        NewFieldMappingProfile.addStatisticalCode(
          collectionOfProfilesForUpdate[0].mappingProfile.statisticalCode,
          8,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfilesForUpdate[0].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForUpdate[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfProfilesForUpdate[1].mappingProfile,
        );
        NewFieldMappingProfile.fillHoldingsType(
          collectionOfProfilesForUpdate[1].mappingProfile.holdingsType,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfProfilesForUpdate[1].mappingProfile.permanetLocation,
        );
        NewFieldMappingProfile.fillCallNumberType(
          `"${collectionOfProfilesForUpdate[1].mappingProfile.callNumberType}"`,
        );
        NewFieldMappingProfile.fillCallNumber(
          collectionOfProfilesForUpdate[1].mappingProfile.callNumber,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfilesForUpdate[1].mappingProfile.name);
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForUpdate[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfProfilesForUpdate[2].mappingProfile,
        );
        NewFieldMappingProfile.fillMaterialType(
          `"${collectionOfProfilesForUpdate[2].mappingProfile.materialType}"`,
        );
        NewFieldMappingProfile.addItemNotes(
          collectionOfProfilesForUpdate[2].mappingProfile.noteType,
          collectionOfProfilesForUpdate[2].mappingProfile.note,
          collectionOfProfilesForUpdate[2].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfProfilesForUpdate[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          `"${collectionOfProfilesForUpdate[2].mappingProfile.status}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfilesForUpdate[2].mappingProfile.name);

        // create action profiles for updating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfProfilesForUpdate.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles for updating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
          collectionOfMatchProfiles[0].matchProfile,
        );
        NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
          collectionOfMatchProfiles[1].matchProfile,
        );
        NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
          collectionOfMatchProfiles[2].matchProfile,
        );

        // create job profile for updating
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfilesForUpdate(jobProfileForUpdate);
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[0].matchProfile.profileName,
          collectionOfProfilesForUpdate[0].actionProfile.name,
        );
        NewJobProfile.linkActionProfileForNonMatches(
          collectionOfProfilesForCreate[1].actionProfile.name,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[1].matchProfile.profileName,
          collectionOfProfilesForUpdate[1].actionProfile.name,
          2,
        );
        NewJobProfile.linkActionProfileForNonMatches(
          collectionOfProfilesForCreate[2].actionProfile.name,
          3,
        );
        NewJobProfile.linkMatchAndActionProfiles(
          collectionOfMatchProfiles[2].matchProfile.profileName,
          collectionOfProfilesForUpdate[2].actionProfile.name,
          4,
        );
        NewJobProfile.linkActionProfileForNonMatches(
          collectionOfProfilesForCreate[3].actionProfile.name,
          5,
        );
        NewJobProfile.saveAndClose();

        TopMenuNavigation.openAppFromDropdown(APPLICATION_NAMES.INVENTORY);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        InventorySearchAndFilter.searchByParameter(
          'Subject',
          collectionOfProfilesForCreate[0].mappingProfile.modifications.data,
        );
        cy.wait(1500);
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');

        // download exported marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
        ExportFile.downloadExportedMarcFile(exportedFileName);

        // edit marc file to add one record
        DataImport.editMarcFileAddNewRecords(
          exportedFileName,
          fileNameWithUpdatedContent,
          filePathWithUpdatedContent,
        );

        // upload the edited marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.uploadFile(fileNameWithUpdatedContent, fileNameForUpdateInstance);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdateInstance);
        Logs.openFileDetails(fileNameForUpdateInstance);
        // check Created counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfCreatedItems);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfCreatedItems);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfCreatedItems);
        FileDetails.checkItemQuantityInSummaryTable(quantityOfCreatedItems);
        // check Updated counter in the Summary table
        FileDetails.checkSrsRecordQuantityInSummaryTable(quantityOfUpdatedItems, 1);
        FileDetails.checkInstanceQuantityInSummaryTable(quantityOfUpdatedItems, 1);
        FileDetails.checkHoldingsQuantityInSummaryTable(quantityOfUpdatedItems, 1);
        FileDetails.checkItemQuantityInSummaryTable(quantityOfUpdatedItems, 1);

        // check items is updated in Inventory
        cy.wrap([0, 1]).each((rowNumber) => {
          FileDetails.checkItemsStatusesInResultList(rowNumber, [
            RECORD_STATUSES.UPDATED,
            RECORD_STATUSES.UPDATED,
            RECORD_STATUSES.UPDATED,
            RECORD_STATUSES.UPDATED,
          ]);
          FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED, rowNumber);
          InventoryInstance.getAssignedHRID().then((hrid) => {
            instanceHrids.push(hrid);
          });
          InstanceRecordView.verifyInstanceStatusTerm(
            collectionOfProfilesForUpdate[0].mappingProfile.statusTerm,
          );
          InstanceRecordView.verifyStatisticalCode(
            collectionOfProfilesForUpdate[0].mappingProfile.statisticalCodeUI,
          );
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkPermanentLocation(
            collectionOfProfilesForUpdate[1].mappingProfile.permanetLocationUI,
          );
          HoldingsRecordView.checkCallNumberType(
            collectionOfProfilesForUpdate[1].mappingProfile.callNumberType,
          );
          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ONLINE_UI} >`);
          InventoryInstance.openItemByBarcode('No barcode');
          ItemRecordView.verifyMaterialType(
            collectionOfProfilesForUpdate[2].mappingProfile.materialType,
          );
          ItemRecordView.verifyPermanentLoanType(
            collectionOfProfilesForUpdate[2].mappingProfile.permanentLoanType,
          );
          ItemRecordView.verifyItemStatus(collectionOfProfilesForUpdate[2].mappingProfile.status);
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          Logs.openFileDetails(fileNameForUpdateInstance);
        });
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName, 2);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED, 2);
        InventoryInstance.getAssignedHRID().then((hrid) => {
          instanceHrids.push(hrid);
        });
        InventoryInstance.checkIsInstancePresented(
          addedInstanceTitle,
          collectionOfProfilesForCreate[2].mappingProfile.pernanentLocationUI,
          collectionOfProfilesForCreate[3].mappingProfile.status,
        );
      },
    );
  });
});
