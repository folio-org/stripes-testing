import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXPORT_TRANSFORMATION_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  CALL_NUMBER_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
  HOLDINGS_TYPE_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewMatchProfile from '../../../support/fragments/data_import/match_profiles/newMatchProfile';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe.skip('data-import', () => {
  describe('Log details', () => {
    let user;
    let instanceHrids;
    const quantityOfUpdatedItems = '2';
    const quantityOfCreatedItems = '1';
    const filePathForCreateInstance = 'marcFileForC356791.mrc';
    const filePathWithUpdatedContent = 'marcFileForC356791_for_update.mrc';
    const fileNameForCreateInstance = `C356791 autotestFileForCreate.${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C356791autotestCsvFile.${getRandomPostfix()}.csv`;
    const exportedFileName = `C356791 autotestExportedFile.${getRandomPostfix()}.mrc`;
    const fileNameWithUpdatedContent = `C356791 autotestFileForUpdate.${getRandomPostfix()}.mrc`;
    const fileNameForUpdateInstance = `C356791 autotestFileForUpdate.${getRandomPostfix()}.mrc`;
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
          action: 'Modify (MARC Bibliographic record type only)',
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
      subfieldForHoldings: '$h',
      itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
      itemMarcField: '902',
      subfieldForItem: '$i',
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
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
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
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C356791 autotest item mapping profile.${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE}"`,
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
          action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C356791 MARC-to-MARC 001 to 001.${getRandomPostfix()}`,
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
          profileName: `C356791 MARC-to-Holdings 901h to Holdings HRID.${getRandomPostfix()}`,
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
          profileName: `C356791 MARC-to-Item 902i to Item HRID.${getRandomPostfix()}`,
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
      profileName: `C356791 autotest job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('create and login user', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.dataExportEnableApp.gui,
        Permissions.dataExportEnableSettings.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${exportedFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${fileNameWithUpdatedContent}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      JobProfiles.deleteJobProfile(jobProfileForCreate.profileName);
      JobProfiles.deleteJobProfile(jobProfileForUpdate.profileName);
      collectionOfMatchProfiles.forEach((profile) => {
        MatchProfiles.deleteMatchProfile(profile.matchProfile.profileName);
      });
      collectionOfProfilesForCreate.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      collectionOfProfilesForUpdate.forEach((profile) => {
        ActionProfiles.deleteActionProfile(profile.actionProfile.name);
        FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
      });
      Users.deleteViaApi(user.userId);
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

    it(
      'C356791 Check import summary table with "create + update" actions (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
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
        NewFieldMappingProfile.fillStatus(collectionOfProfilesForCreate[3].mappingProfile.status);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfilesForCreate[3].mappingProfile.name);

        // create action profiles for creating
        collectionOfProfilesForCreate.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile for creating
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfileForCreate);
        cy.wrap(collectionOfProfilesForCreate).each((profile) => {
          NewJobProfile.linkActionProfile(profile.actionProfile);
        });
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        // upload the marc file for creating
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.uploadFile(filePathForCreateInstance, fileNameForCreateInstance);
        JobProfiles.search(jobProfileForCreate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameForCreateInstance);
        Logs.openFileDetails(fileNameForCreateInstance);
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
        });

        // create Field mapping profile for export
        cy.visit(SettingsMenu.exportMappingProfilePath);
        ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);

        // create job profile for export
        cy.visit(SettingsMenu.exportJobProfilePath);
        ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchByParameter(
          'Subject',
          collectionOfProfilesForCreate[0].mappingProfile.modifications.data,
        );
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
        ExportFile.downloadExportedMarcFile(exportedFileName);

        // edit marc file to add one record
        DataImport.editMarcFileAddNewRecords(
          exportedFileName,
          fileNameWithUpdatedContent,
          filePathWithUpdatedContent,
        );

        // create mapping profiles for updating
        cy.visit(SettingsMenu.mappingProfilePath);
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
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfProfilesForUpdate[1].mappingProfile.permanetLocation,
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
          collectionOfProfilesForUpdate[2].mappingProfile.materialType,
        );
        NewFieldMappingProfile.addItemNotes(
          collectionOfProfilesForUpdate[2].mappingProfile.noteType,
          collectionOfProfilesForUpdate[2].mappingProfile.note,
          collectionOfProfilesForUpdate[2].mappingProfile.staffOnly,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfProfilesForUpdate[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(collectionOfProfilesForUpdate[2].mappingProfile.status);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(collectionOfProfilesForUpdate[2].mappingProfile.name);

        // create action profiles for updating
        collectionOfProfilesForUpdate.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles for updating
        cy.visit(SettingsMenu.matchProfilePath);
        collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
        });

        // create job profile for updating
        cy.visit(SettingsMenu.jobProfilePath);
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

        // upload the edited marc file
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.uploadFile(fileNameWithUpdatedContent, fileNameForUpdateInstance);
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(fileNameForUpdateInstance);
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
            FileDetails.status.updated,
            FileDetails.status.updated,
            FileDetails.status.updated,
            FileDetails.status.updated,
          ]);
          FileDetails.openInstanceInInventory('Updated', rowNumber);
          InstanceRecordView.verifyInstanceStatusTerm(
            collectionOfProfilesForUpdate[0].mappingProfile.statusTerm,
          );
          InstanceRecordView.verifyStatisticalCode(
            collectionOfProfilesForUpdate[0].mappingProfile.statisticalCodeUI,
          );
          InstanceRecordView.getAssignedHRID().then((initialInstanceHrId) => instanceHrids.push(initialInstanceHrId));
          cy.go('back');
          FileDetails.openHoldingsInInventory('Updated', rowNumber);
          HoldingsRecordView.checkPermanentLocation(
            collectionOfProfilesForUpdate[1].mappingProfile.permanetLocationUI,
          );
          HoldingsRecordView.checkCallNumberType(
            collectionOfProfilesForUpdate[1].mappingProfile.callNumberType,
          );
          cy.go('back');
          FileDetails.openItemInInventory('Updated', rowNumber);
          ItemRecordView.verifyMaterialType(
            collectionOfProfilesForUpdate[2].mappingProfile.materialType,
          );
          ItemRecordView.verifyPermanentLoanType(
            collectionOfProfilesForUpdate[2].mappingProfile.permanentLoanType,
          );
          ItemRecordView.verifyItemStatus(collectionOfProfilesForUpdate[2].mappingProfile.status);
          cy.go('back');
        });
        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(FileDetails.status.created, columnName, 2);
        });
        FileDetails.openInstanceInInventory('Created', 2);
        InventoryInstance.checkIsInstancePresented(
          addedInstanceTitle,
          collectionOfProfilesForCreate[2].mappingProfile.pernanentLocationUI,
          collectionOfProfilesForCreate[3].mappingProfile.status,
        );
      },
    );
  });
});
