import {
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
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
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Log details', () => {
    let user;
    let instanceHrid;
    const filePathForUpload = 'oneMarcBib.mrc';
    const marcFileNameForCreate = `C350382 marcFileForCreate${getRandomPostfix()}.mrc`;
    const editedMarcFileName = `C350382 editedMarcFile${getRandomPostfix()}.mrc`;
    const marcFileNameForUpdate = `C350382 marcFileForUpdate${getRandomPostfix()}.mrc`;

    // field mapping profiles for Job profile 1 (Create Simple Instance, Holdings, Item)
    const instanceMappingProfileForCreate = {
      name: `C350382 Create simple instance.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      catalogedDate: '###TODAY###',
      instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
    };
    const holdingsMappingProfileForCreate = {
      name: `C350382 Create simple holdings.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      permanentLocation: `"${LOCATION_NAMES.MAIN_LIBRARY}"`,
      permanentLocationUI: LOCATION_NAMES.MAIN_LIBRARY_UI,
    };
    const itemMappingProfileForCreate = {
      name: `C350382 Create simple item.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ITEM,
      materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
      permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
      status: ITEM_STATUS_NAMES.AVAILABLE,
      permanentLocation: `"${LOCATION_NAMES.MAIN_LIBRARY}"`,
    };

    // field mapping profiles for Job profile 2 (Update Simple Holdings, Item)
    const holdingsMappingProfileForUpdate = {
      name: `C350382 Update simple holdings.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      temporaryLocation: `"${LOCATION_NAMES.ANNEX}"`,
      temporaryLocationUI: LOCATION_NAMES.ANNEX_UI,
    };
    const itemMappingProfileForUpdate = {
      name: `C350382 Update simple item.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ITEM,
      permanentLoanType: LOAN_TYPE_NAMES.COURSE_RESERVES,
    };

    // action profiles, one per mapping profile above
    const instanceActionProfileForCreate = {
      typeValue: FOLIO_RECORD_TYPE.INSTANCE,
      name: `C350382 Create Instance.${getRandomPostfix()}`,
    };
    const holdingsActionProfileForCreate = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C350382 Create Holdings.${getRandomPostfix()}`,
    };
    const itemActionProfileForCreate = {
      typeValue: FOLIO_RECORD_TYPE.ITEM,
      name: `C350382 Create Item.${getRandomPostfix()}`,
    };
    const holdingsActionProfileForUpdate = {
      typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
      name: `C350382 Update Holdings.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };
    const itemActionProfileForUpdate = {
      typeValue: FOLIO_RECORD_TYPE.ITEM,
      name: `C350382 Update Item.${getRandomPostfix()}`,
      action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
    };

    // match profiles: Instance anchor (no action of its own) with two sibling submatches
    const instanceMatchProfile = {
      profileName: `C350382 Instance match by HRID.${getRandomPostfix()}`,
      incomingRecordFields: { field: '001' },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      instanceOption: NewMatchProfile.optionsList.instanceHrid,
    };
    const holdingsMatchProfile = {
      profileName: `C350382 Holdings submatch by permanent location.${getRandomPostfix()}`,
      incomingStaticValue: LOCATION_NAMES.MAIN_LIBRARY,
      incomingStaticRecordValue: 'Text',
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
      existingRecordOption: NewMatchProfile.optionsList.holdingsPermLoc,
    };
    const itemMatchProfile = {
      profileName: `C350382 Item submatch by permanent location.${getRandomPostfix()}`,
      incomingStaticValue: LOCATION_NAMES.MAIN_LIBRARY,
      incomingStaticRecordValue: 'Text',
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORD_NAMES.ITEM,
      existingRecordOption: NewMatchProfile.optionsList.itemPermLoc,
    };

    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C350382 Create Simple Instance, Holdings, Item.${getRandomPostfix()}`,
    };
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C350382 Update Simple Holdings, Item.${getRandomPostfix()}`,
    };

    before('Create test user and login', () => {
      cy.createTempUser([
        Permissions.settingsDataImportEnabled.gui,
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      cy.getAdminToken(false).then(() => {
        Users.deleteViaApi(user.userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(instanceMatchProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(holdingsMatchProfile.profileName);
        SettingsMatchProfiles.deleteMatchProfileByNameViaApi(itemMatchProfile.profileName);
        [
          instanceActionProfileForCreate,
          holdingsActionProfileForCreate,
          itemActionProfileForCreate,
          holdingsActionProfileForUpdate,
          itemActionProfileForUpdate,
        ].forEach((profile) => {
          SettingsActionProfiles.deleteActionProfileByNameViaApi(profile.name);
        });
        [
          instanceMappingProfileForCreate,
          holdingsMappingProfileForCreate,
          itemMappingProfileForCreate,
          holdingsMappingProfileForUpdate,
          itemMappingProfileForUpdate,
        ].forEach((profile) => {
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(profile.name);
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
      'C350382 Display log hotlinks for Inventory Holdings and Items when the Instance is not Updated (promin)',
      { tags: ['extendedPath', 'promin', 'C350382'] },
      () => {
        // Steps 2-4: create field mapping profiles for Job profile 1 (instance, holdings, item)
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillInstanceMappingProfile(instanceMappingProfileForCreate);
        FieldMappingProfileView.closeViewMode(instanceMappingProfileForCreate.name);
        FieldMappingProfiles.checkMappingProfilePresented(instanceMappingProfileForCreate.name);

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfileForCreate);
        NewFieldMappingProfile.fillPermanentLocation(
          holdingsMappingProfileForCreate.permanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(holdingsMappingProfileForCreate.name);
        FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileForCreate.name);

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfileForCreate);
        NewFieldMappingProfile.fillMaterialType(itemMappingProfileForCreate.materialType);
        NewFieldMappingProfile.fillPermanentLoanType(itemMappingProfileForCreate.permanentLoanType);
        NewFieldMappingProfile.fillStatus(`"${itemMappingProfileForCreate.status}"`);
        NewFieldMappingProfile.fillPermanentLocation(itemMappingProfileForCreate.permanentLocation);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(itemMappingProfileForCreate.name);
        FieldMappingProfiles.checkMappingProfilePresented(itemMappingProfileForCreate.name);

        // Steps 5-6: create field mapping profiles for Job profile 2 (update holdings, item)
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfileForUpdate);
        NewFieldMappingProfile.fillTemporaryLocation(
          holdingsMappingProfileForUpdate.temporaryLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(holdingsMappingProfileForUpdate.name);
        FieldMappingProfiles.checkMappingProfilePresented(holdingsMappingProfileForUpdate.name);

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfileForUpdate);
        NewFieldMappingProfile.fillPermanentLoanType(itemMappingProfileForUpdate.permanentLoanType);
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(itemMappingProfileForUpdate.name);
        FieldMappingProfiles.checkMappingProfilePresented(itemMappingProfileForUpdate.name);

        // Step 7: create action profiles, one per mapping profile above
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        SettingsActionProfiles.create(
          instanceActionProfileForCreate,
          instanceMappingProfileForCreate.name,
        );
        SettingsActionProfiles.checkActionProfilePresented(instanceActionProfileForCreate.name);
        SettingsActionProfiles.create(
          holdingsActionProfileForCreate,
          holdingsMappingProfileForCreate.name,
        );
        SettingsActionProfiles.checkActionProfilePresented(holdingsActionProfileForCreate.name);
        SettingsActionProfiles.create(itemActionProfileForCreate, itemMappingProfileForCreate.name);
        SettingsActionProfiles.checkActionProfilePresented(itemActionProfileForCreate.name);
        SettingsActionProfiles.create(
          holdingsActionProfileForUpdate,
          holdingsMappingProfileForUpdate.name,
        );
        SettingsActionProfiles.checkActionProfilePresented(holdingsActionProfileForUpdate.name);
        SettingsActionProfiles.create(itemActionProfileForUpdate, itemMappingProfileForUpdate.name);
        SettingsActionProfiles.checkActionProfilePresented(itemActionProfileForUpdate.name);

        // Steps 8-10: create match profiles (Instance by HRID, Holdings/Item submatches by permanent location)
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.MATCH_PROFILES);
        MatchProfiles.createMatchProfile(instanceMatchProfile);
        MatchProfiles.checkMatchProfilePresented(instanceMatchProfile.profileName);
        MatchProfiles.createMatchProfileWithStaticValue(holdingsMatchProfile);
        MatchProfiles.checkMatchProfilePresented(holdingsMatchProfile.profileName);
        MatchProfiles.createMatchProfileWithStaticValue(itemMatchProfile);
        MatchProfiles.checkMatchProfilePresented(itemMatchProfile.profileName);

        // Step 11: Job profile 1 - Create Simple Instance, Holdings, Item (no match profile)
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfileForCreate);
        NewJobProfile.linkActionProfile(instanceActionProfileForCreate);
        NewJobProfile.linkActionProfile(holdingsActionProfileForCreate);
        NewJobProfile.linkActionProfile(itemActionProfileForCreate);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        // Step 12: Job profile 2 - Update Simple Holdings, Item.
        // The Instance match is only an anchor: it has no action of its own, so the Instance
        // itself is never updated, while the two sibling submatches (Holdings, Item) each
        // have their own Update action.
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchProfile(instanceMatchProfile.profileName);
        NewJobProfile.linkMatchProfileForMatches(holdingsMatchProfile.profileName);
        NewJobProfile.linkActionProfileForMatches(holdingsActionProfileForUpdate.name);
        NewJobProfile.linkMatchProfileForMatches(itemMatchProfile.profileName, 2);
        NewJobProfile.linkActionProfileForMatches(itemActionProfileForUpdate.name, 2);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        // Steps 13-14: upload the MARC file and run Job profile 1
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFileNameForCreate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForCreate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForCreate);
        Logs.checkJobStatus(marcFileNameForCreate, JOB_STATUS_NAMES.COMPLETED);

        // Step 15: Instance, Holdings, Item columns show "Created" hotlinks that open the
        // appropriate Inventory record
        Logs.openFileDetails(marcFileNameForCreate);
        [
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.CREATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((hrid) => {
          instanceHrid = hrid;
        });
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.CREATED);
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkPermanentLocation(
          holdingsMappingProfileForCreate.permanentLocationUI,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.openItemInInventory(RECORD_STATUSES.CREATED);
        ItemRecordView.verifyPermanentLoanType(itemMappingProfileForCreate.permanentLoanType);
        ItemRecordView.closeDetailView();

        // Step 16: edit the MARC file - remove existing 001/003, add 001 = Instance HRID
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.close();
        cy.then(() => {
          DataImport.editMarcFieldsInAllRecords(marcFileNameForCreate, editedMarcFileName, {
            removeTags: ['001', '003'],
            addFields: [{ tag: '001', content: instanceHrid }],
          });
        });

        // Steps 17-18: upload the edited MARC file and run Job profile 2
        DataImport.verifyUploadState();
        DataImport.uploadFile(editedMarcFileName, marcFileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileNameForUpdate);
        Logs.checkJobStatus(marcFileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);

        // Step 19: Holdings and Item columns show "Updated" hotlinks with the new values;
        // Instance is matched but not updated (no action was linked to its match)
        Logs.openFileDetails(marcFileNameForUpdate);
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.NO_ACTION,
          FileDetails.columnNameInResultList.instance,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.holdings,
        );
        FileDetails.checkStatusInColumn(
          RECORD_STATUSES.UPDATED,
          FileDetails.columnNameInResultList.item,
        );
        FileDetails.openHoldingsInInventory(RECORD_STATUSES.UPDATED);
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkTemporaryLocation(
          holdingsMappingProfileForUpdate.temporaryLocationUI,
        );
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        FileDetails.openItemInInventory(RECORD_STATUSES.UPDATED);
        ItemRecordView.verifyPermanentLoanType(itemMappingProfileForUpdate.permanentLoanType);
      },
    );
  });
});
