import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
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
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getLongDelay } from '../../../support/utils/cypressTools';
import DateTools from '../../../support/utils/dateTools';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let instanceId;
    let instanceHrid;
    const uniqueSubject = `Test update.${getRandomPostfix()}`;
    const filePathForCreate = 'marcBibFileForC430257.mrc';
    const filePathForUpdate = 'marcBibFileForC430257_1.mrc';
    const fileNameForCreate = `C430257 autotestFileForCreate${getRandomPostfix()}.mrc`;
    const fileNameForUpdate = `C430257 autotestFileForUpdate${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C430257 autotestFile${getRandomPostfix()}.csv`;
    const exportedFileName = `C430257 autotestExportedFileForUpdate${getRandomPostfix()}.mrc`;
    // profiles for creating instance, holdings, item
    const collectionOfProfilesForCreate = [
      {
        mappingProfile: {
          name: `C430257 create marcBib mapping profile ${getRandomPostfix()}`,
          updatingText: uniqueSubject,
          subfield: 'a',
          fieldNumber: '650',
          indicator2: '4',
        },
        actionProfile: {
          name: `C430257 autotest marcBib action profile.${getRandomPostfix()}`,
          action: 'MODIFY',
          folioRecordType: 'MARC_BIBLIOGRAPHIC',
        },
      },
      {
        mappingProfile: {
          name: `C430257 autotest instance mapping profile.${getRandomPostfix()}`,
        },
        actionProfile: {
          name: `C430257 autotest instance action profile.${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        mappingProfile: {
          name: `C430257 autotest holdings mapping profile.${getRandomPostfix()}`,
          permanentLocation: LOCATION_NAMES.MAIN_LIBRARY,
          pernanentLocationUI: LOCATION_NAMES.MAIN_LIBRARY_UI,
        },
        actionProfile: {
          name: `C430257 autotest holdings action profile.${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'HOLDINGS',
        },
      },
      {
        mappingProfile: {
          name: `C430257 autotest item mapping profile.${getRandomPostfix()}`,
          materialType: 'book',
          permanentLoanType: 'Can circulate',
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          name: `C430257 autotest item action profile.${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'ITEM',
        },
      },
    ];
    const jobProfileForCreate = {
      name: `C430257 autotest job profile for create.${getRandomPostfix()}`,
    };
    const exportMappingProfile = {
      name: `C430257 mapping profile ${getRandomPostfix()}`,
      holdingsTransformation: EXPORT_TRANSFORMATION_NAMES.HOLDINGS_HRID,
      holdingsMarcField: '901',
      subfieldForHoldings: '$h',
      itemTransformation: EXPORT_TRANSFORMATION_NAMES.ITEM_HRID,
      itemMarcField: '902',
      subfieldForItem: '$i',
    };
    const jobProfileNameForExport = `C430257 job profile.${getRandomPostfix()}`;
    // profiles for updating instance, holdings, item
    const collectionOfProfilesForUpdate = [
      {
        mappingProfile: {
          name: `C430257 update instance mapping profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          catalogedDate: '###TODAY###',
          catalogedDateUi: DateTools.getFormattedDate({ date: new Date() }),
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
        },
        actionProfile: {
          name: `C430257 update instance action profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C430257 update holdings mapping profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          permanentLocationUI: LOCATION_NAMES.ONLINE_UI,
          callNumberType: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
          callNumber: '050$a " " 050$b',
        },
        actionProfile: {
          name: `C430257 update holdings action profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C430257 update item mapping profile ${getRandomPostfix()}`,
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
          name: `C430257 update item action profile ${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C430257 MARC-to-MARC 001 to 001 match profile ${getRandomPostfix()}`,
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
          profileName: `C430257 MARC-to-Holdings 901h to Holdings HRID match profile ${getRandomPostfix()}`,
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
          profileName: `C430257 MARC-to-Item 902i to Item HRID match profile ${getRandomPostfix()}`,
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
      profileName: `C430257 autotest job profile for update.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test user and login', () => {
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
      DataImport.uploadFileViaApi(
        filePathForCreate,
        fileNameForCreate,
        jobProfileForCreate.name,
      ).then((response) => {
        instanceId = response[0].instance.id;
        instanceHrid = response[0].instance.hrid;
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiInventoryViewCreateEditInstances.gui,
        Permissions.dataExportEnableApp.gui,
        Permissions.dataExportEnableSettings.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password);
      });
    });

    after('Delete test data', () => {
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${fileNameForUpdate}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.name);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
        });
        collectionOfProfilesForUpdate.forEach((profile) => {
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
      'C430257 Check import summary table with "create + update" actions (folijet)',
      { tags: ['criticalPath', 'folijet'] },
      () => {
        cy.visit(TopMenu.inventoryPath);
        InventoryInstances.searchByTitle(instanceId);
        InstanceRecordView.verifyInstanceSource('MARC');
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(
          `${collectionOfProfilesForCreate[2].mappingProfile.pernanentLocationUI} >`,
        );
        InventoryInstance.openItemByBarcode('No barcode');

        cy.visit(SettingsMenu.exportMappingProfilePath);
        ExportFieldMappingProfiles.createMappingProfile(exportMappingProfile);

        cy.visit(SettingsMenu.exportJobProfilePath);
        ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

        // download .csv file
        cy.visit(TopMenu.inventoryPath);
        InventorySearchAndFilter.searchByParameter('Subject', uniqueSubject);
        InventorySearchAndFilter.saveUUIDs();
        // need to create a new file with instance UUID because tests are runing in multiple threads
        cy.intercept('/search/instances/ids**').as('getIds');
        cy.wait('@getIds', getLongDelay()).then((req) => {
          const expectedUUID = InventorySearchAndFilter.getUUIDsFromRequest(req);

          FileManager.createFile(`cypress/fixtures/${nameForCSVFile}`, expectedUUID[0]);
        });

        // download exported marc file
        cy.visit(TopMenu.dataExportPath);
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
        ExportFile.downloadExportedMarcFile(exportedFileName);

        // edit marc file to add one record
        DataImport.editMarcFileAddNewRecords(
          exportedFileName,
          fileNameForUpdate,
          filePathForUpdate,
        );

        // create mapping profiles
        cy.visit(SettingsMenu.mappingProfilePath);
        FieldMappingProfiles.createInstanceMappingProfile(
          collectionOfProfilesForUpdate[0].mappingProfile,
        );

        FieldMappingProfiles.createHoldingsMappingProfile(
          collectionOfProfilesForUpdate[1].mappingProfile,
        );

        FieldMappingProfiles.createItemMappingProfile(
          collectionOfProfilesForUpdate[2].mappingProfile,
        );

        // create action profiles
        collectionOfProfilesForUpdate.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        });

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        collectionOfMatchProfiles.forEach((profile) => {
          NewMatchProfile.createMatchProfileWithIncomingAndExistingMatchExpressionViaApi(
            profile.matchProfile,
          );
        });

        // create job profile
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

        // upload the exported marc file
        cy.visit(TopMenu.dataImportPath);
        DataImport.verifyUploadState();
        DataImport.uploadExportedFile(fileNameForUpdate);
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(fileNameForUpdate);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(fileNameForUpdate);
        FileDetails.checkItemsQuantityInSummaryTable(0, '1');
        FileDetails.checkItemsQuantityInSummaryTable(1, '1');
        FileDetails.checkItemsStatusesInResultList(0, [
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
          RECORD_STATUSES.UPDATED,
        ]);
        FileDetails.checkItemsStatusesInResultList(1, [
          RECORD_STATUSES.CREATED,
          RECORD_STATUSES.CREATED,
          RECORD_STATUSES.CREATED,
          RECORD_STATUSES.CREATED,
        ]);
        FileDetails.openJsonScreen('The Journal of ecclesiastical history.');
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.verifyTabsPresented();
        JsonScreenView.verifyContentInTab('The Journal of ecclesiastical history.');
        JsonScreenView.openMarcSrsTab();
        JsonScreenView.verifyContentInTab('"999"');

        cy.visit(TopMenu.dataImportPath);
        Logs.openFileDetails(fileNameForUpdate);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyCatalogedDate(
          collectionOfProfilesForUpdate[0].mappingProfile.catalogedDateUi,
        );
        InstanceRecordView.verifyInstanceStatusTerm(
          collectionOfProfilesForUpdate[0].mappingProfile.instanceStatusTerm,
        );
        InstanceRecordView.verifyStatisticalCode(
          collectionOfProfilesForUpdate[0].mappingProfile.statisticalCodeUI,
        );
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkPermanentLocation(
          collectionOfProfilesForUpdate[1].mappingProfile.permanentLocationUI,
        );
        HoldingsRecordView.checkCallNumberType(
          collectionOfProfilesForUpdate[1].mappingProfile.callNumberType,
        );
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(
          `${collectionOfProfilesForUpdate[1].mappingProfile.permanentLocationUI} >`,
        );
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.checkElectronicBookplateNote(
          collectionOfProfilesForUpdate[2].mappingProfile.noteUI,
        );
      },
    );
  });
});
