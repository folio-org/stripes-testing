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
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import ExportJobProfiles from '../../../support/fragments/data-export/exportJobProfile/exportJobProfiles';
import ExportFieldMappingProfiles from '../../../support/fragments/data-export/exportMappingProfile/exportFieldMappingProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let instanceHrid = null;
    let user = null;
    const mappingProfileIds = [];
    const actionProfileIds = [];
    const quantityOfItems = '1';
    const instanceTitle =
      'Anglo-Saxon manuscripts in microfiche facsimile Volume 25 Corpus Christi College, Cambridge II, MSS 12, 144, 162, 178, 188, 198, 265, 285, 322, 326, 449 microform A. N. Doane (editor and director), Matthew T. Hussey (associate editor), Phillip Pulsiano (founding editor)';
    // file names
    const nameMarcFileForImportCreate = `C356802 autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C356802 autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForImportUpdate = `C356802 autotestFile${getRandomPostfix()}.mrc`;
    const jobProfileNameForExport = `C356802 job profile.${getRandomPostfix()}`;
    // profiles for creating instance, holdings, item
    const marcBibMappingProfileForCreate = {
      name: `C356802 create marcBib mapping profile ${getRandomPostfix()}`,
      updatingText: `Test update ${getRandomPostfix()}`,
      subfield: 'a',
      fieldNumber: '650',
      indicator2: '4',
    };
    const instanceMappingProfileForCreate = {
      name: `C356802 create instance mapping profile ${getRandomPostfix()}`,
    };
    const holdingsMappingProfileForCreate = {
      name: `C356802 create holdings mapping profile ${getRandomPostfix()}`,
      permanentLocation: 'Main Library (KU/CC/DI/M)',
    };
    const itemMappingProfileForCreate = {
      name: `C356802 create item mapping profile ${getRandomPostfix()}`,
      materialType: 'book',
      permanentLoanType: 'Can circulate',
      status: ITEM_STATUS_NAMES.AVAILABLE,
    };
    const actionProfilesForCreate = [
      {
        actionProfile: {
          name: `C356802 create marcBib action profile ${getRandomPostfix()}`,
          action: 'MODIFY',
          folioRecordType: 'MARC_BIBLIOGRAPHIC',
        },
      },
      {
        actionProfile: {
          name: `C356802 create instance action profile ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        actionProfile: {
          name: `C356802 create holdings action profile ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'HOLDINGS',
        },
      },
      {
        actionProfile: {
          name: `C356802 create item action profile ${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'ITEM',
        },
      },
    ];
    const jobProfileForCreate = {
      name: `C356802 create job profile ${getRandomPostfix()}`,
    };
    // create Field mapping profile for export
    const exportMappingProfile = {
      name: `C356802 mapping profile ${getRandomPostfix()}`,
      holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
      holdingsMarcField: '901',
      subfieldForHoldings: 'h',
      itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
      itemMarcField: '902',
      subfieldForItem: 'i',
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
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
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
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
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
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
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
          existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
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
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
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
          existingRecordType: EXISTING_RECORD_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.itemHrid,
        },
      },
    ];
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C356802 update job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create user and login', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForImportUpdate}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.name);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        actionProfileIds.forEach((id) => {
          SettingsActionProfiles.deleteActionProfileViaApi(id);
        });
        mappingProfileIds.forEach((id) => {
          SettingsFieldMappingProfiles.deleteMappingProfileViaApi(id);
        });
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (instance) => {
            cy.deleteItemViaApi(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C356802 Check import summary table with "Updated" actions for instance, holding and item (folijet)',
      { tags: ['criticalPath', 'folijet', 'C356802'] },
      () => {
        NewFieldMappingProfile.createModifyMarcBibMappingProfileViaApi(
          marcBibMappingProfileForCreate,
        ).then((mappingProfileResponse) => {
          mappingProfileIds.push(mappingProfileResponse.body.id);

          NewActionProfile.createActionProfileViaApi(
            actionProfilesForCreate[0].actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfileIds.push(actionProfileResponse.body.id);
          });
        });
        NewFieldMappingProfile.createInstanceMappingProfileViaApi(
          instanceMappingProfileForCreate,
        ).then((mappingProfileResponse) => {
          mappingProfileIds.push(mappingProfileResponse.body.id);

          NewActionProfile.createActionProfileViaApi(
            actionProfilesForCreate[1].actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfileIds.push(actionProfileResponse.body.id);
          });
        });
        NewFieldMappingProfile.createHoldingsMappingProfileViaApi(
          holdingsMappingProfileForCreate,
        ).then((mappingProfileResponse) => {
          mappingProfileIds.push(mappingProfileResponse.body.id);

          NewActionProfile.createActionProfileViaApi(
            actionProfilesForCreate[2].actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfileIds.push(actionProfileResponse.body.id);
          });
        });
        NewFieldMappingProfile.createItemMappingProfileViaApi(itemMappingProfileForCreate)
          .then((mappingProfileResponse) => {
            mappingProfileIds.push(mappingProfileResponse.body.id);

            NewActionProfile.createActionProfileViaApi(
              actionProfilesForCreate[3].actionProfile,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              actionProfileIds.push(actionProfileResponse.body.id);
            });
          })
          .then(() => {
            NewJobProfile.createJobProfileWithLinkedFourActionProfilesViaApi(
              jobProfileForCreate,
              actionProfileIds[0],
              actionProfileIds[1],
              actionProfileIds[2],
              actionProfileIds[3],
            );
          });

        // upload a marc file for creating of the new instance, holding and item
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile('oneMarcBib.mrc', nameMarcFileForImportCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForImportCreate);
        Logs.checkJobStatus(nameMarcFileForImportCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForImportCreate);

        // check the instance is created
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InventoryInstance.checkIsInstancePresented(
            instanceTitle,
            LOCATION_NAMES.MAIN_LIBRARY_UI,
            ITEM_STATUS_NAMES.AVAILABLE,
          );

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
          ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);
          cy.wait(10000);

          ExportJobProfiles.goToJobProfilesTab();
          ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

          // download .csv file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          cy.intercept('/inventory/instances/*').as('getId');
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          cy.wait('@getId', getLongDelay()).then((req) => {
            InstanceRecordView.verifyInstancePaneExists();
            InventorySearchAndFilter.saveUUIDs();
            // need to create a new file with instance UUID because tests are runing in multiple threads
            const expectedUUID = InventorySearchAndFilter.getInstanceUUIDFromRequest(req);

            FileManager.createFile(`cypress/fixtures/${nameForCSVFile}`, expectedUUID);
          });
        });

        // download exported marc file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
        cy.getAdminToken().then(() => {
          ExportFile.uploadFile(nameForCSVFile);
          ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
          ExportFile.downloadExportedMarcFile(nameMarcFileForImportUpdate);
        });

        // create mapping profiles
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
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
          collectionOfMappingAndActionProfiles[1].mappingProfile.typeValue,
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
          `"${collectionOfMappingAndActionProfiles[2].mappingProfile.status}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
          cy.wait(3000);
        });

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
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
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(nameMarcFileForImportUpdate);
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForImportUpdate);
        Logs.openFileDetails(nameMarcFileForImportUpdate);

        [
          FileDetails.columnNameInResultList.srsMarc,
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
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
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyCatalogedDate(
          collectionOfMappingAndActionProfiles[0].mappingProfile.catalogedDateUi,
        );
        InstanceRecordView.verifyInstanceStatusTerm(
          collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatus,
        );
        InstanceRecordView.verifyStatisticalCode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCodeUI,
        );

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        Logs.openFileDetails(nameMarcFileForImportUpdate);
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
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

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        Logs.openFileDetails(nameMarcFileForImportUpdate);
        FileDetails.openItemInInventory(RECORD_STATUSES.UPDATED);
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
