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
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
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
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let instanceHrid;
    let user;
    const subject = `Test update${getRandomPostfix()}`;
    const instanceTitle = 'Das Kantatenwerk [sound recording] / Johann Sebastian Bach.';
    const filePath = 'marcBibFileNameC430253.mrc';
    const nameMarcFileForImportCreate = `C430253 autotestFileForCreate${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C430253 autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForImportUpdate = `C430253 autotestExportedFile${getRandomPostfix()}.mrc`;
    // profiles for creating instance, holdings, item
    const collectionOfProfilesForCreate = [
      {
        mappingProfile: {
          name: `C430253 marcBib mapping profile${getRandomPostfix()}`,
          updatingText: subject,
          subfield: 'a',
          fieldNumber: '650',
          indicator2: '4',
        },
        actionProfile: {
          name: `C430253 marcBib action profile${getRandomPostfix()}`,
          action: 'MODIFY',
          folioRecordType: 'MARC_BIBLIOGRAPHIC',
        },
      },
      {
        mappingProfile: {
          name: `C430253 instance mapping profile${getRandomPostfix()}`,
        },
        actionProfile: {
          name: `C430253 instance action profile${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        mappingProfile: {
          name: `C430253 holdings mapping profile${getRandomPostfix()}`,
          permanentLocation: LOCATION_NAMES.ANNEX,
          pernanentLocationUI: LOCATION_NAMES.ANNEX_UI,
        },
        actionProfile: {
          name: `C430253 holdings action profile${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'HOLDINGS',
        },
      },
      {
        mappingProfile: {
          name: `C430253 item mapping profile${getRandomPostfix()}`,
          materialType: 'book',
          permanentLoanType: 'Can circulate',
          status: 'Available',
        },
        actionProfile: {
          name: `C430253 item action profile${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'ITEM',
        },
      },
    ];
    const jobProfileForCreate = {
      name: `C430253 create job profile ${getRandomPostfix()}`,
    };
    const exportMappingProfile = {
      name: `C430253 mapping profile ${getRandomPostfix()}`,
      holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
      holdingsMarcField: '901',
      subfieldForHoldings: 'h',
      itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
      itemMarcField: '902',
      subfieldForItem: 'i',
    };
    const jobProfileNameForExport = `C430253 job profile.${getRandomPostfix()}`;
    // profiles for updating instance, holdings, item
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C430253 update instance mapping profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          catalogedDate: '###TODAY###',
          catalogedDateUi: DateTools.getFormattedDate({ date: new Date() }),
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
        },
        actionProfile: {
          name: `C430253 update instance action profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C430253 update holdings mapping profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          permanentLocationUI: LOCATION_NAMES.ONLINE_UI,
          callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          callNumber: '050$a " " 050$b',
          relationship: 'Resource',
          uri: '856$u',
        },
        actionProfile: {
          name: `C430253 update holdings action profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C430253 update item mapping profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          materialType: `"${MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE}"`,
          noteType: '"Electronic bookplate"',
          note: '"Smith Family Foundation"',
          noteUI: 'Smith Family Foundation',
          staffOnly: 'Mark for all affected records',
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          name: `C430253 update item action profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C430253 MARC-to-MARC 001 to 001 match profile ${getRandomPostfix()}`,
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
          profileName: `C430253 MARC-to-Holdings 901h to Holdings HRID match profile ${getRandomPostfix()}`,
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
          profileName: `C430253 MARC-to-Item 902i to Item HRID match profile ${getRandomPostfix()}`,
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
      profileName: `C430253 update job profile ${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      NewFieldMappingProfile.createModifyMarcBibMappingProfileViaApi(
        collectionOfProfilesForCreate[0].mappingProfile,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApi(
          collectionOfProfilesForCreate[0].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          collectionOfProfilesForCreate[0].actionProfile.id = actionProfileResponse.body.id;
        });
      });
      NewFieldMappingProfile.createInstanceMappingProfileViaApi(
        collectionOfProfilesForCreate[1].mappingProfile,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApi(
          collectionOfProfilesForCreate[1].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          collectionOfProfilesForCreate[1].actionProfile.id = actionProfileResponse.body.id;
        });
      });
      NewFieldMappingProfile.createHoldingsMappingProfileViaApi(
        collectionOfProfilesForCreate[2].mappingProfile,
      ).then((mappingProfileResponse) => {
        NewActionProfile.createActionProfileViaApi(
          collectionOfProfilesForCreate[2].actionProfile,
          mappingProfileResponse.body.id,
        ).then((actionProfileResponse) => {
          collectionOfProfilesForCreate[2].actionProfile.id = actionProfileResponse.body.id;
        });
      });
      NewFieldMappingProfile.createItemMappingProfileViaApi(
        collectionOfProfilesForCreate[3].mappingProfile,
      )
        .then((mappingProfileResponse) => {
          NewActionProfile.createActionProfileViaApi(
            collectionOfProfilesForCreate[3].actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            collectionOfProfilesForCreate[3].actionProfile.id = actionProfileResponse.body.id;
          });
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedFourActionProfilesViaApi(
            jobProfileForCreate,
            collectionOfProfilesForCreate[0].actionProfile.id,
            collectionOfProfilesForCreate[1].actionProfile.id,
            collectionOfProfilesForCreate[2].actionProfile.id,
            collectionOfProfilesForCreate[3].actionProfile.id,
          );
        });

      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.dataExportViewAddUpdateProfiles.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForImportUpdate}`);
      FileManager.deleteFileFromDownloadsByMask(nameMarcFileForImportUpdate);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFileFromDownloadsByMask(nameForCSVFile);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.name);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            profile.mappingProfile.name,
          );
        });
        collectionOfProfilesForCreate.forEach((profile) => {
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
      'C430253 Check import summary table with "Updated" actions for instance, holding and item (folijet)',
      { tags: ['criticalPath', 'folijet', 'C430253'] },
      () => {
        const columnNumbers = {
          summary: '1',
          srs: '2',
          instance: '3',
          holdings: '4',
          item: '5',
          authority: '6',
          order: '7',
          invoice: '8',
          error: '9',
        };

        // upload a marc file for creating of the new instance, holding and item
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePath, nameMarcFileForImportCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.name);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForImportCreate);
        Logs.checkJobStatus(nameMarcFileForImportCreate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForImportCreate);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((hrid) => {
          instanceHrid = hrid;
        });
        InstanceRecordView.verifyInstanceSource('MARC');
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ANNEX_UI} >`);
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.closeDetailView();

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
        ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
        ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);
        cy.wait(10000);

        ExportJobProfiles.goToJobProfilesTab();
        ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

        // download .csv file
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchByParameter('Subject', subject);
        cy.intercept('/inventory/instances/*').as('getId');
        cy.wait('@getId', getLongDelay()).then((req) => {
          InstanceRecordView.verifyInstancePaneExists();
          InventorySearchAndFilter.saveUUIDs();
          // need to create a new file with instance UUID because tests are runing in multiple threads
          const expectedUUID = InventorySearchAndFilter.getInstanceUUIDFromRequest(req);

          FileManager.createFile(`cypress/fixtures/${nameForCSVFile}`, expectedUUID);
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
        FieldMappingProfiles.createInstanceMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );

        FieldMappingProfiles.createHoldingsMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );

        FieldMappingProfiles.createItemMappingProfile(
          collectionOfMappingAndActionProfiles[2].mappingProfile,
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
        Logs.checkJobStatus(nameMarcFileForImportUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(nameMarcFileForImportUpdate);
        FileDetails.checkItemsStatusesInResultList(0, [
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
        ]);
        [
          columnNumbers.srs,
          columnNumbers.instance,
          columnNumbers.holdings,
          columnNumbers.item,
        ].forEach((column) => {
          FileDetails.verifyColumnValuesInSummaryTable(column, ['0', '1', '0', '0']);
        });
        FileDetails.verifyColumnValuesInSummaryTable(columnNumbers.error, [
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          RECORD_STATUSES.DASH,
          '0',
        ]);
        [columnNumbers.authority, columnNumbers.order, columnNumbers.invoice].forEach((column) => {
          FileDetails.verifyColumnValuesInSummaryTable(column, [
            RECORD_STATUSES.DASH,
            RECORD_STATUSES.DASH,
            RECORD_STATUSES.DASH,
            RECORD_STATUSES.DASH,
          ]);
        });
        FileDetails.openJsonScreen(instanceTitle);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyTabsPresented();
        JsonScreenView.verifyContentInTab(instanceTitle);
        JsonScreenView.openMarcSrsTab();
        JsonScreenView.verifyContentInTab('"999"');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        Logs.openFileDetails(nameMarcFileForImportUpdate);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyCatalogedDate(
          collectionOfMappingAndActionProfiles[0].mappingProfile.catalogedDateUi,
        );
        InstanceRecordView.verifyInstanceStatusTerm(
          collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatusTerm,
        );
        InstanceRecordView.verifyStatisticalCode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCodeUI,
        );
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocationUI,
        );
        HoldingsRecordView.checkCallNumberType(
          collectionOfMappingAndActionProfiles[1].mappingProfile.callNumberType,
        );
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ONLINE_UI} >`);
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.checkElectronicBookplateNote(
          collectionOfMappingAndActionProfiles[2].mappingProfile.noteUI,
        );
      },
    );
  });
});
