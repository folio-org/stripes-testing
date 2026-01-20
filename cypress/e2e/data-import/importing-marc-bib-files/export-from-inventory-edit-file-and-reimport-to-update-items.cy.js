import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  LOCATION_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
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
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
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
import FileManager from '../../../support/utils/fileManager';
import GenerateIdentifierCode from '../../../support/utils/generateIdentifierCode';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let preconditionUserId;
    let instanceHrid;
    let userId;
    const mappingProfileIds = [];
    const actionProfileIds = [];
    const quantityOfItems = '1';
    const uniqSubject = `35678123678${GenerateIdentifierCode.getRandomIdentifierCode()}`;
    const filePathForUpload = 'marcFileForC11123.mrc';
    const instance = {
      instanceTitle: 'Love enough / Dionne Brand.',
      instanceSubject: uniqSubject,
      holdingsLocation: `${LOCATION_NAMES.MAIN_LIBRARY_UI} >`,
      itemStatus: ITEM_STATUS_NAMES.AVAILABLE,
    };
    const note = 'Test administrative note for item';
    // unique file name
    const editedMarcFileNameForCreate = `C11123 autotestFile${getRandomPostfix()}.mrc`;
    const marcFileForCreate = `C11123 autoTestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C11123 autotestFile${getRandomPostfix()}.csv`;
    const nameMarcFileForUpload = `C11123 autotestFile${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C11123 fileWithItemHrid${getRandomPostfix()}.mrc`;
    const nameMarcFileForUpdate = `C11123 autotestFileForUpdateItem${getRandomPostfix()}.mrc`;

    // profiles for creating instance, holdings, item
    const instanceMappingProfileForCreate = {
      name: `C11123 autotest_instance_mapping_profile_${getRandomPostfix()}`,
    };
    const holdingsMappingProfileForCreate = {
      name: `C11123 autotest_holdings_mapping_profile_${getRandomPostfix()}`,
      permanentLocation: 'Main Library (KU/CC/DI/M)',
    };
    const itemMappingProfileForCreate = {
      name: `C11123 autotest_item_mapping_profile_${getRandomPostfix()}`,
      materialType: 'book',
      permanentLoanType: 'Can circulate',
      status: 'Available',
    };
    const actionProfilesForCreate = [
      {
        actionProfile: {
          name: `C11123 autotest_instance_action_profile_${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'INSTANCE',
        },
      },
      {
        actionProfile: {
          name: `C11123 autotest_holdings_action_profile_${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'HOLDINGS',
        },
      },
      {
        actionProfile: {
          name: `C11123 autotest_item_action_profile_${getRandomPostfix()}`,
          action: 'CREATE',
          folioRecordType: 'ITEM',
        },
      },
    ];
    const jobProfileForCreate = {
      name: `C11123 autotest_job_profile_${getRandomPostfix()}`,
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
      existingRecordType: EXISTING_RECORD_NAMES.ITEM,
      itemOption: NewMatchProfile.optionsList.itemHrid,
    };
    const itemMappingProfileForUpdate = {
      name: `C11123 mapping profile update item.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ITEM,
    };
    const itemActionProfileForUpdate = {
      typeValue: FOLIO_RECORD_TYPE.ITEM,
      name: `C11123 action profile update item.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11123 job profile.${getRandomPostfix()}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        preconditionUserId = userProperties.userId;

        NewFieldMappingProfile.createInstanceMappingProfileViaApi(
          instanceMappingProfileForCreate,
        ).then((mappingProfileResponse) => {
          mappingProfileIds.push(mappingProfileResponse.body.id);

          NewActionProfile.createActionProfileViaApi(
            actionProfilesForCreate[0].actionProfile,
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
            actionProfilesForCreate[1].actionProfile,
            mappingProfileResponse.body.id,
          ).then((actionProfileResponse) => {
            actionProfileIds.push(actionProfileResponse.body.id);
          });
        });
        NewFieldMappingProfile.createItemMappingProfileViaApi(itemMappingProfileForCreate)
          .then((mappingProfileResponse) => {
            mappingProfileIds.push(mappingProfileResponse.body.id);

            NewActionProfile.createActionProfileViaApi(
              actionProfilesForCreate[2].actionProfile,
              mappingProfileResponse.body.id,
            ).then((actionProfileResponse) => {
              actionProfileIds.push(actionProfileResponse.body.id);
            });
          })
          .then(() => {
            NewJobProfile.createJobProfileWithLinkedThreeActionProfilesViaApi(
              jobProfileForCreate,
              actionProfileIds[0],
              actionProfileIds[1],
              actionProfileIds[2],
            );
          });

        // change file to add uniq subject
        DataImport.editMarcFile(
          filePathForUpload,
          editedMarcFileNameForCreate,
          ['35678123678'],
          [uniqSubject],
        );

        DataImport.uploadFileViaApi(
          editedMarcFileNameForCreate,
          marcFileForCreate,
          jobProfileForCreate.name,
        ).then((response) => {
          instanceHrid = response[0].instance.hrid;
        });
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${nameMarcFileForUpload}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(userId);
        Users.deleteViaApi(preconditionUserId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.name);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
        actionProfileIds.forEach((id) => {
          SettingsActionProfiles.deleteActionProfileViaApi(id);
        });
        SettingsActionProfiles.deleteActionProfileByNameViaApi(itemActionProfileForUpdate.name);
        mappingProfileIds.forEach((id) => {
          SettingsFieldMappingProfiles.deleteMappingProfileViaApi(id);
        });
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
          itemMappingProfileForUpdate.name,
        );
        cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` }).then(
          (initialInstance) => {
            cy.deleteItemViaApi(initialInstance.items[0].id);
            cy.deleteHoldingRecordViaApi(initialInstance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(initialInstance.id);
          },
        );
      });
    });

    it(
      'C11123 Export from Inventory, edit file, and re-import to update items (folijet)',
      { tags: ['criticalPath', 'folijet', 'C11123'] },
      () => {
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InventoryInstance.checkIsInstancePresented(
          instance.instanceTitle,
          instance.holdingsLocation,
          instance.itemStatus,
        );
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.getAssignedHRID().then((initialItemHrId) => {
          const itemHrid = initialItemHrId;

          ItemRecordView.closeDetailView();
          InventorySearchAndFilter.resetAll();
          InventorySearchAndFilter.searchByParameter('Subject', instance.instanceSubject);
          InventorySearchAndFilter.selectResultCheckboxes(1);
          cy.intercept('/inventory/instances/*').as('getId');
          cy.wait('@getId', getLongDelay()).then((req) => {
            InventorySearchAndFilter.saveUUIDs();
            // need to create a new file with instance UUID because tests are runing in multiple threads
            const expectedUUID = InventorySearchAndFilter.getInstanceUUIDFromRequest(req);

            FileManager.createFile(`cypress/fixtures/${nameForCSVFile}`, expectedUUID);
          });

          // download exported marc file
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_EXPORT);
          // cy.getAdminToken();
          ExportFile.uploadFile(nameForCSVFile);
          ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
          ExportFile.getRecordHridOfExportedFile(nameForCSVFile).then((req) => {
            const expectedRecordHrid = req;

            // download exported marc file
            ExportFile.downloadExportedMarcFileWithRecordHrid(
              expectedRecordHrid,
              nameMarcFileForUpload,
            );
            FileManager.deleteFileFromDownloadsByMask('QuickInstanceExport*');
          });

          // change file using item hrid for 945 field
          DataImport.editMarcFile(
            nameMarcFileForUpload,
            editedMarcFileName,
            ['testHrid'],
            [itemHrid],
          );
        });

        // create mapping profile for update
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, APPLICATION_NAMES.DATA_IMPORT);
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfileForUpdate);
        NewFieldMappingProfile.addAdministrativeNote(note, 7);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(itemMappingProfileForUpdate.name);
        FieldMappingProfiles.checkMappingProfilePresented(itemMappingProfileForUpdate.name);

        // create action profile for update
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(itemActionProfileForUpdate, itemMappingProfileForUpdate.name);
        SettingsActionProfiles.checkActionProfilePresented(itemActionProfileForUpdate.name);

        // create match profile for update
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(matchProfile);
        MatchProfiles.checkMatchProfilePresented(matchProfile.profileName);

        // create job profile for update
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfileWithLinkingProfiles(
          jobProfileForUpdate,
          itemActionProfileForUpdate.name,
          matchProfile.profileName,
        );
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        // upload a marc file for creating of the new instance, holding and item
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, nameMarcFileForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(nameMarcFileForUpdate);
        Logs.openFileDetails(nameMarcFileForUpdate);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.item,
        );
        FileDetails.checkItemQuantityInSummaryTable(quantityOfItems, 1);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
        InstanceRecordView.verifyInstancePaneExists();
        InventoryHoldings.checkIfExpanded(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`, true);
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.checkItemAdministrativeNote(note);
      },
    );
  });
});
