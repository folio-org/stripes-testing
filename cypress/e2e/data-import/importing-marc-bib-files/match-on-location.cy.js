import {
  ACCEPTED_DATA_TYPE_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
  LOCATION_NAMES,
  PROFILE_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
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
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe(
    'Importing MARC Bib files',
    {
      retries: {
        runMode: 2,
      },
    },
    () => {
      let preconditionUserId;
      let userId;
      const permanentLocation = 'Main Library (KU/CC/DI/M)';
      const recordType = 'MARC_BIBLIOGRAPHIC';
      const rowNumbers = [0, 1, 2];
      const instanceHrids = [];
      const instanceIds = [];
      const holdingsIds = [];
      const itemIds = [];
      // elements for update items
      const noteForHoldingsMappingProfile = 'This note for holdings mapping profile';
      const noteForItemMappingProfile = 'This note for item mapping profile';
      // unique file name
      const marcFileForCreate = `C17027 autoTestFile${getRandomPostfix()}.mrc`;
      const editedMarcFileName = `C17027 marcFileForMatchOnLocation${getRandomPostfix()}.mrc`;
      const fileNameAfterUpdate = `C17027 marcFileForMatchOnLocation${getRandomPostfix()}.mrc`;

      // profiles for creating instance, holdings, item
      const instanceMappingProfileForCreate = {
        profile: {
          name: `autotest_instance_mapping_profile_${getRandomPostfix()}`,
          incomingRecordType: recordType,
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
        },
      };
      const holdingsMappingProfileForCreate = {
        profile: {
          name: `autotest_holdings_mapping_profile_${getRandomPostfix()}`,
          incomingRecordType: recordType,
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
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
          existingRecordType: EXISTING_RECORD_NAMES.ITEM,
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
              {
                name: 'status.name',
                enabled: true,
                path: 'item.status.name',
                value: '"Available"',
              },
              {
                name: 'permanentLocation.id',
                enabled: 'true',
                path: 'item.permanentLocation.id',
                value: `"${permanentLocation}"`,
                // TODO redesign without hardcode
                acceptedValues: {
                  // redesigne withouthardcode
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
            existingRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
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
            existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
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
            existingRecordType: EXISTING_RECORD_NAMES.ITEM,
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
        action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      };
      const itemActionProfileForUpdate = {
        typeValue: FOLIO_RECORD_TYPE.ITEM,
        name: `C17027 action profile update item.${getRandomPostfix()}`,
        action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
      };
      const jobProfileForUpdate = {
        ...NewJobProfile.defaultJobProfile,
        profileName: `C17027 job profile.${getRandomPostfix()}`,
        acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
      };

      before('create test data', () => {
        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.settingsDataImportEnabled.gui,
        ]).then((userProperties) => {
          preconditionUserId = userProperties.userId;

          testData.jobProfileForCreate = jobProfileForCreate;

          testData.forEach((specialPair) => {
            cy.createOnePairMappingAndActionProfiles(
              specialPair.mappingProfile,
              specialPair.actionProfile,
            ).then((idActionProfile) => {
              cy.addJobProfileRelation(
                testData.jobProfileForCreate.addedRelations,
                idActionProfile,
              );
            });
          });
          SettingsJobProfiles.createJobProfileViaApi(testData.jobProfileForCreate).then(
            (bodyWithjobProfile) => {
              testData.jobProfileForCreate.id = bodyWithjobProfile.body.id;
            },
          );

          // upload a marc file for creating of the new instance, holding and item
          DataImport.uploadFileViaApi(
            'marcFileForC17027.mrc',
            marcFileForCreate,
            testData.jobProfileForCreate.profile.name,
          ).then((response) => {
            response.forEach((hrids) => instanceHrids.push(hrids.instance.hrid));
            response.forEach((ids) => {
              instanceIds.push(ids.instance.id);
              holdingsIds.push(ids.holding.id);
              itemIds.push(ids.item.id);
            });
          });
        });

        cy.createTempUser([
          Permissions.moduleDataImportEnabled.gui,
          Permissions.settingsDataImportEnabled.gui,
          Permissions.inventoryAll.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;

          cy.login(userProperties.username, userProperties.password);
        });
      });

      after('delete test data', () => {
        // delete created files
        FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
        FileManager.deleteFile(`cypress/fixtures/${fileNameAfterUpdate}`);
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(userId);
          Users.deleteViaApi(preconditionUserId);
          // delete profiles
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profile.name);
          SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
          collectionOfMatchProfiles.forEach((profile) => {
            SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.matchProfile.profileName);
          });
          SettingsActionProfiles.deleteActionProfileByNameViaApi(
            instanceActionProfileForCreate.profile.name,
          );
          SettingsActionProfiles.deleteActionProfileByNameViaApi(
            holdingsActionProfileForCreate.profile.name,
          );
          SettingsActionProfiles.deleteActionProfileByNameViaApi(
            itemActionProfileForCreate.profile.name,
          );
          SettingsActionProfiles.deleteActionProfileByNameViaApi(
            holdingsActionProfileForUpdate.name,
          );
          SettingsActionProfiles.deleteActionProfileByNameViaApi(itemActionProfileForUpdate.name);
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            instanceMappingProfileForCreate.profile.name,
          );
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            holdingsMappingProfileForCreate.profile.name,
          );
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            itemMappingProfileForCreate.profile.name,
          );
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            holdingsMappingProfileForUpdate.name,
          );
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(
            itemMappingProfileForUpdate.name,
          );
          itemIds.forEach((id) => cy.deleteItemViaApi(id));
          holdingsIds.forEach((id) => cy.deleteHoldingRecordViaApi(id));
          instanceIds.forEach((id) => InventoryInstance.deleteInstanceViaApi(id));
        });
      });

      it(
        'C17027 Match on location (folijet)',
        { tags: ['criticalPath', 'folijet', 'C17027'] },
        () => {
          // change Instance HRID in .mrc file
          DataImport.editMarcFile(
            'marcFileForC17027.mrc',
            editedMarcFileName,
            ['ocn933596084', 'ocn919480357', 'ocn919563272'],
            [instanceHrids[0], instanceHrids[1], instanceHrids[2]],
          );

          // create Match profile
          TopMenuNavigation.navigateToApp(
            APPLICATION_NAMES.SETTINGS,
            APPLICATION_NAMES.DATA_IMPORT,
          );
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
          collectionOfMatchProfiles.forEach((profile) => {
            MatchProfiles.createMatchProfile(profile.matchProfile);
            MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
            cy.wait(3000);
          });

          // create Field mapping profiles
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.FIELD_MAPPING_PROFILES);
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
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
          ActionProfiles.create(
            holdingsActionProfileForUpdate,
            holdingsMappingProfileForUpdate.name,
          );
          ActionProfiles.checkActionProfilePresented(holdingsActionProfileForUpdate.name);
          ActionProfiles.create(itemActionProfileForUpdate, itemMappingProfileForUpdate.name);
          ActionProfiles.checkActionProfilePresented(itemActionProfileForUpdate.name);

          // create Job profile
          SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
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
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
          DataImport.verifyUploadState();
          DataImport.uploadFile(editedMarcFileName, fileNameAfterUpdate);
          JobProfiles.waitFileIsUploaded();
          JobProfiles.search(jobProfileForUpdate.profileName);
          JobProfiles.runImportFile();
          Logs.waitFileIsImported(fileNameAfterUpdate);
          Logs.checkJobStatus(fileNameAfterUpdate, JOB_STATUS_NAMES.COMPLETED);
          Logs.openFileDetails(fileNameAfterUpdate);
          rowNumbers.forEach((rowNumber) => {
            FileDetails.checkStatusInColumn(
              RECORD_STATUSES.UPDATED,
              FileDetails.columnNameInResultList.holdings,
              rowNumber,
            );
            FileDetails.checkStatusInColumn(
              RECORD_STATUSES.UPDATED,
              FileDetails.columnNameInResultList.item,
              rowNumber,
            );
          });
          FileDetails.checkHoldingsQuantityInSummaryTable('3', 1);
          FileDetails.checkItemQuantityInSummaryTable('3', 1);

          // check updated items in Inventory
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
          cy.waitForAuthRefresh(() => {
            cy.reload();
          }, 20_000);
          instanceHrids.forEach((hrid) => {
            InventorySearchAndFilter.waitLoading();
            InventorySearchAndFilter.searchInstanceByHRID(hrid);
            InventoryInstance.openHoldingView();
            HoldingsRecordView.checkAdministrativeNote(noteForHoldingsMappingProfile);
            HoldingsRecordView.close();
            InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.MAIN_LIBRARY_UI} >`);
            InventoryInstance.openItemByBarcode('No barcode');
            ItemRecordView.checkItemAdministrativeNote(noteForItemMappingProfile);
            ItemRecordView.closeDetailView();
          });
        },
      );
    },
  );
});
