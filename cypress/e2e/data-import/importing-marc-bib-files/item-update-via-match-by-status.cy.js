/* eslint-disable cypress/no-unnecessary-waiting */
import {
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
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
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import StatisticalCodes from '../../../support/fragments/settings/inventory/instance-holdings-item/statisticalCodes';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe(
    'Importing MARC Bib files',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let user;
      let statisticalCode;
      let statisticalCodeId;
      const titlesItemsStatusChanged = [
        'Making the news popular : mobilizing U.S. news audiences / Anthony M. Nadler.',
        'Genius : the game / Leopoldo Gout.',
        'Animal philosophy : essential readings in continental thought / edited by Matthew Calarco and Peter Atterton.',
      ];
      const titlesItemStatusNotChanged = [
        'Political communication in the age of dissemination.',
        'Language, borders and identity / edited by Dominic Watt and Carmen Llamas.',
      ];
      const itemNote = 'THIS WAS UPDATED!';
      const jobProfileNameForExport = `C357552 Bibs with Item HRIDs ${getRandomPostfix()}`;
      // file names
      const nameMarcFileForImportCreate = `C357552 autotestFile${getRandomPostfix()}.mrc`;
      const nameForCSVFile = `C357552 autotestFile${getRandomPostfix()}.csv`;
      const nameMarcFileForUpdate = `C357552 autotestFile${getRandomPostfix()}.mrc`;

      const collectionOfMappingAndActionProfiles = [
        {
          mappingProfile: {
            typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
            name: `C357552 Create simple holdings ${getRandomPostfix()}`,
            permanentLocation: LOCATION_NAMES.ONLINE,
          },
          actionProfile: {
            typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
            name: `C357552 Create simple holdings ${getRandomPostfix()}`,
          },
        },
        {
          mappingProfile: {
            typeValue: FOLIO_RECORD_TYPE.ITEM,
            name: `C357552 Create simple items ${getRandomPostfix()}`,
            status: ITEM_STATUS_NAMES.AVAILABLE,
            permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
            materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
          },
          actionProfile: {
            typeValue: FOLIO_RECORD_TYPE.ITEM,
            name: `C357552 Create simple items ${getRandomPostfix()}`,
          },
        },
        {
          mappingProfile: {
            typeValue: FOLIO_RECORD_TYPE.ITEM,
            name: `C357552 Update Item by POL match ${getRandomPostfix()}`,
            status: ITEM_STATUS_NAMES.AVAILABLE,
            permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          },
          actionProfile: {
            typeValue: FOLIO_RECORD_TYPE.ITEM,
            name: `C357552 Update simple items ${getRandomPostfix()}`,
            action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
          },
        },
      ];

      const matchProfileItemHrid = {
        profileName: `C357552 Match 902$a to Item HRID ${getRandomPostfix()}`,
        incomingRecordFields: {
          field: '902',
          in1: '*',
          in2: '*',
          subfield: 'a',
        },
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORD_NAMES.ITEM,
        itemOption: NewMatchProfile.optionsList.itemHrid,
      };

      const matchProfileItemStatus = {
        profileName: `C357552 Item status = Available ${getRandomPostfix()}`,
        incomingStaticValue: ITEM_STATUS_NAMES.AVAILABLE,
        incomingStaticRecordValue: 'Text',
        matchCriterion: 'Exactly matches',
        existingRecordType: EXISTING_RECORD_NAMES.ITEM,
        existingRecordOption: NewMatchProfile.optionsList.status,
      };

      const createJobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C357552 Create simple instance, holdings, items ${getRandomPostfix()}`,
      };

      const updateJobProfile = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C357552 Update item based on HRID and Status ${getRandomPostfix()}`,
      };

      const exportMappingProfile = {
        name: `C357552 Item HRID ${getRandomPostfix()}`,
      };

      beforeEach('Create test data and login', () => {
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.settingsDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiInventoryMarcItemInProcess.gui,
          Permissions.uiInventoryMarcItemIntellectual.gui,
          Permissions.uiInventoryMarcItemLongMissing.gui,
          Permissions.uiInventoryMarcItemRestricted.gui,
          Permissions.uiInventoryMarcItemUnavailable.gui,
          Permissions.uiInventoryMarcItemUnknow.gui,
          Permissions.uiInventoryMarkItemsWithdrawn.gui,
          Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          Permissions.settingsDataImportEnabled.gui,
          Permissions.dataExportViewAddUpdateProfiles.gui,
        ]).then((userProperties) => {
          user = userProperties;

          StatisticalCodes.createViaApi().then((resp) => {
            statisticalCode = `ARL (Collection stats): ${resp.code} - ${resp.name}`;
          });
          cy.login(user.username, user.password, {
            path: SettingsMenu.mappingProfilePath,
            waiter: FieldMappingProfiles.waitLoading,
          });
        });
      });

      afterEach('Delete test data', () => {
        // delete created files in fixtures
        FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForUpdate}`);
        FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(user.userId);
          // delete generated profiles
          SettingsJobProfiles.deleteJobProfileByNameViaApi(createJobProfile.profileName);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(updateJobProfile.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfileItemHrid.profileName);
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfileItemStatus.profileName);
          collectionOfMappingAndActionProfiles.forEach((profile) => {
            SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.actionProfile.name);
            SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
              profile.mappingProfile.name,
            );
          });
          StatisticalCodes.deleteViaApi(statisticalCodeId);
        });
      });

      const mappingProfileForCreateHoldings = (holdingsMappingProfile) => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
        NewFieldMappingProfile.addStatisticalCode(statisticalCode, 4);
        NewFieldMappingProfile.fillPermanentLocation(
          `"${holdingsMappingProfile.permanentLocation}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(holdingsMappingProfile.name);
      };

      const mappingProfileForCreateItem = (itemMappingProfile) => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
        NewFieldMappingProfile.fillMaterialType(itemMappingProfile.materialType);
        NewFieldMappingProfile.addStatisticalCode(statisticalCode, 6);
        NewFieldMappingProfile.fillPermanentLoanType(itemMappingProfile.permanentLoanType);
        NewFieldMappingProfile.fillStatus(`"${itemMappingProfile.status}"`);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(itemMappingProfile.name);
      };

      const mappingProfileForUpdateItem = (itemMappingProfile) => {
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
        NewFieldMappingProfile.addItemNotes(
          '"Note"',
          `"${itemNote}"`,
          'Mark for all affected records',
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(itemMappingProfile.name);
      };

      it(
        'C357552 Check item update via match by status (folijet)',
        { tags: ['criticalPath', 'folijet', 'C357552'] },
        () => {
          mappingProfileForCreateHoldings(collectionOfMappingAndActionProfiles[0].mappingProfile);
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfMappingAndActionProfiles[0].mappingProfile.name,
          );
          mappingProfileForCreateItem(collectionOfMappingAndActionProfiles[1].mappingProfile);
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfMappingAndActionProfiles[1].mappingProfile.name,
          );
          mappingProfileForUpdateItem(collectionOfMappingAndActionProfiles[2].mappingProfile);
          FieldMappingProfiles.checkMappingProfilePresented(
            collectionOfMappingAndActionProfiles[2].mappingProfile.name,
          );

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          collectionOfMappingAndActionProfiles.forEach((profile) => {
            SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
            SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
          });

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          MatchProfiles.createMatchProfile(matchProfileItemHrid);
          MatchProfiles.checkMatchProfilePresented(matchProfileItemHrid.profileName);
          cy.wait(1000);
          MatchProfiles.createMatchProfileWithStaticValue(matchProfileItemStatus);
          MatchProfiles.checkMatchProfilePresented(matchProfileItemStatus.profileName);

          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
          JobProfiles.createJobProfile(createJobProfile);
          NewJobProfile.linkActionProfileByName('Default - Create instance');
          NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
          NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(createJobProfile.profileName);

          // need to wait until the first job profile will be created
          cy.wait(2500);
          JobProfiles.createJobProfile(updateJobProfile);
          NewJobProfile.linkMatchProfile(matchProfileItemHrid.profileName);
          NewJobProfile.linkMatchAndActionProfilesForSubMatches(
            matchProfileItemStatus.profileName,
            collectionOfMappingAndActionProfiles[2].actionProfile.name,
          );
          NewJobProfile.saveAndClose();
          JobProfiles.checkJobProfilePresented(updateJobProfile.profileName);

          // create Field mapping profile for export
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS);
          ExportFieldMappingProfiles.goToFieldMappingProfilesTab();
          ExportFieldMappingProfiles.createMappingProfileForItemHrid(exportMappingProfile.name);
          cy.wait(10000);
          ExportJobProfiles.goToJobProfilesTab();
          ExportJobProfiles.createJobProfile(jobProfileNameForExport, exportMappingProfile.name);

          // upload a marc file for creating of the new instance, holding and item
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile('marcFileForC357552.mrc', nameMarcFileForImportCreate);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(createJobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(nameMarcFileForImportCreate);
          Logs.openFileDetails(nameMarcFileForImportCreate);
          for (let i = 0; i < 9; i++) {
            [
              FileDetails.columnNameInResultList.srsMarc,
              FileDetails.columnNameInResultList.instance,
              FileDetails.columnNameInResultList.holdings,
              FileDetails.columnNameInResultList.item,
            ].forEach((columnName) => {
              FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName, i);
            });
          }
          [
            {
              lineNumber: 0,
              markFunction: InventoryItems.markAsWithdrawn,
              status: 'Withdrawn',
            },
            {
              lineNumber: 3,
              markFunction: InventoryItems.markAsInProcess,
              status: 'In process (non-requestable)',
            },
            {
              lineNumber: 7,
              markFunction: InventoryItems.markAsUnknown,
              status: 'Unknown',
            },
          ].forEach((marker) => {
            Logs.clickOnHotLink(marker.lineNumber, 5, RECORD_STATUSES.CREATED);
            ItemRecordView.waitLoading();
            marker.markFunction();
            ItemRecordView.verifyItemStatusInPane(marker.status);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
            FileDetails.close();
            Logs.openFileDetails(nameMarcFileForImportCreate);
          });

          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.switchToItem();
          InventorySearchAndFilter.filterItemByStatisticalCode(statisticalCode);
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));
          InventorySearchAndFilter.saveUUIDs();
          ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
          FileManager.deleteFolder(Cypress.config('downloadsFolder'));

          // download exported marc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          ExportFile.uploadFile(nameForCSVFile);
          ExportFile.exportWithCreatedJobProfile(nameForCSVFile, jobProfileNameForExport);
          ExportFile.downloadExportedMarcFile(nameMarcFileForUpdate);

          // upload the exported marc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          FileDetails.close();
          DataImport.verifyUploadState();
          DataImport.uploadExportedFile(nameMarcFileForUpdate);
          JobProfiles.search(updateJobProfile.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(nameMarcFileForUpdate);
          Logs.openFileDetails(nameMarcFileForUpdate);
          FileDetails.checkItemQuantityInSummaryTable('7', 1);
          FileDetails.checkItemQuantityInSummaryTable('3', 2);
          // check items what statuses were not changed have Updated status
          titlesItemStatusNotChanged.forEach((title) => {
            FileDetails.openItemInInventoryByTitle(title, 5);
            ItemRecordView.waitLoading();
            ItemRecordView.checkItemNote(itemNote);
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
            FileDetails.close();
            Logs.openFileDetails(nameMarcFileForUpdate);
          });
          // check items what statuses were changed have No action status
          titlesItemsStatusChanged.forEach((title) => {
            FileDetails.checkStatusByTitle(title, RECORD_STATUSES.NO_ACTION);
          });
        },
      );
    },
  );
});
