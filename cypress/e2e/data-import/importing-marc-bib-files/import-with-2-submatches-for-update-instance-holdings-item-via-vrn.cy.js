import {
  ACQUISITION_METHOD_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ORDER_STATUSES,
  RECORD_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let preconditionUserId;
    let user;
    let instanceId;
    const testData = {
      filePath: 'marcBibFileForC451467.mrc',
      editedMarcFileName: `C451467 editedMarcFile${getRandomPostfix()}.mrc`,
      marcFileNameForCreate: `C451467 marcFile${getRandomPostfix()}.mrc`,
      marcFileNameForUpdate: `C451467 marcFile${getRandomPostfix()}.mrc`,
    };
    const collectionOfProfilesForCreate = [
      {
        mappingProfile: {
          name: `C451467 Create simple order${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ORDER,
          orderStatus: ORDER_STATUSES.OPEN,
          approved: true,
          title: '245$a',
          vendor: VENDOR_NAMES.GOBI,
          acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
          orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
          vendorReferenceNumber: '980$c',
          vendorReferenceType: 'Vendor order reference number',
          receivingWorkflow: 'Synchronized',
          physicalUnitPrice: '"20"',
          quantityPhysical: '"1"',
          materialType: MATERIAL_TYPE_NAMES.BOOK,
          currency: 'USD',
          locationName: `"${LOCATION_NAMES.ANNEX}"`,
          locationQuantityPhysical: '"1"',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ORDER,
          name: `C451467 Create simple order${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C451467 Create simple holdings ${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C451467 Create simple holdings${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C451467 Create simple item${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C451467 Create simple item${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfileForCreate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C451467 Create simple I H I with order${getRandomPostfix()}`,
    };
    const collectionOfProfilesForUpdate = [
      {
        mappingProfile: {
          name: `C451467 Update Instance via VRN${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C451467 Update Instance via VRN${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C451467 Update Holdings via VRN${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C451467 Update Holdings via VRN${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
      {
        mappingProfile: {
          name: `C451467 Update Item via VRN${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C451467 Update Item via VRN${getRandomPostfix()}`,
          action: ACTION_NAMES_IN_ACTION_PROFILE.UPDATE,
        },
      },
    ];
    const collectionOfMatchProfiles = [
      {
        matchProfile: {
          profileName: `C451467 VRN Instance match${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '980',
            subfield: 'c',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.INSTANCE,
          instanceOption: NewMatchProfile.optionsList.vrn,
        },
      },
      {
        matchProfile: {
          profileName: `C451467 VRN Holdings match${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '980',
            subfield: 'c',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
          holdingsOption: NewMatchProfile.optionsList.vrn,
        },
      },
      {
        matchProfile: {
          profileName: `C451467 VRN Item match${getRandomPostfix()}`,
          incomingRecordFields: {
            field: '980',
            subfield: 'c',
          },
          matchCriterion: 'Exactly matches',
          existingRecordType: EXISTING_RECORD_NAMES.ITEM,
          itemOption: NewMatchProfile.optionsList.vrn,
        },
      },
    ];
    const jobProfileForUpdate = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C451467 Update of IHI via VRN match${getRandomPostfix()}`,
    };

    before('create test data', () => {
      DataImport.editMarcFile(
        testData.filePath,
        testData.editedMarcFileName,
        ['c99994244552'],
        [`c9999424${randomFourDigitNumber()}`],
      );

      cy.getAdminToken();
      InstanceStatusTypes.getViaApi({ query: '"name"=="Electronic Resource"' }).then((type) => {
        if (type.length === 0) {
          NewInstanceStatusType.createViaApi().then((initialInstanceStatusType) => {
            testData.instanceStatusTypeId = initialInstanceStatusType.body.id;
          });
        }
      });
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
      ]).then((userProperties) => {
        preconditionUserId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
        // create mapping profiles
        FieldMappingProfiles.createOrderMappingProfile(
          collectionOfProfilesForCreate[0].mappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForCreate[0].mappingProfile.name,
        );

        FieldMappingProfiles.createHoldingsMappingProfile(
          collectionOfProfilesForCreate[1].mappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForCreate[1].mappingProfile.name,
        );

        FieldMappingProfiles.createItemMappingProfile(
          collectionOfProfilesForCreate[2].mappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForCreate[2].mappingProfile.name,
        );

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfProfilesForCreate.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
          cy.wait(3000);
        });

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfileForCreate);
        NewJobProfile.linkActionProfile(collectionOfProfilesForCreate[0].actionProfile);
        NewJobProfile.linkActionProfileByName('Default - Create instance');
        NewJobProfile.linkActionProfile(collectionOfProfilesForCreate[1].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfProfilesForCreate[2].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForCreate.profileName);

        DataImport.uploadFileViaApi(
          testData.editedMarcFileName,
          testData.marcFileNameForCreate,
          jobProfileForCreate.profileName,
        ).then((response) => {
          instanceId = response[0].instance.id;
        });
      });

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

    after('delete test data', () => {
      FileManager.deleteFile(`cypress/fixtures/${testData.editedMarcFileName}`);
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(preconditionUserId);
        InstanceStatusTypes.getViaApi({ query: '"name"=="Electronic Resource"' }).then((type) => {
          if (type.length !== 0) {
            InstanceStatusTypes.deleteViaApi(type[0].id);
          }
        });
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForCreate.profileName);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfileForUpdate.profileName);
        collectionOfMatchProfiles.forEach((profile) => {
          SettingsMatchProfiles.deleteMatchProfileByNameViaApi(profile.profileName);
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
        Users.deleteViaApi(user.userId);
        cy.getInstance({ limit: 1, expandAll: true, query: `"id"=="${instanceId}"` }).then(
          (instance) => {
            cy.deleteItemViaApi(instance.items[0].id);
            cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
            InventoryInstance.deleteInstanceViaApi(instance.id);
          },
        );
      });
    });

    it(
      'C451467 Check Import with 2 submatches for update Instance, Holdings, Item via VRN (folijet)',
      { tags: ['criticalPath', 'folijet', 'C451467'] },
      () => {
        // create mapping profiles
        FieldMappingProfiles.createInstanceMappingProfile(
          collectionOfProfilesForUpdate[0].mappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForUpdate[0].mappingProfile.name,
        );

        FieldMappingProfiles.createHoldingsMappingProfile(
          collectionOfProfilesForUpdate[1].mappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForUpdate[1].mappingProfile.name,
        );

        FieldMappingProfiles.createItemMappingProfile(
          collectionOfProfilesForUpdate[2].mappingProfile,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfProfilesForUpdate[2].mappingProfile.name,
        );

        // create action profiles
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.ACTION_PROFILES);
        collectionOfProfilesForUpdate.forEach((profile) => {
          SettingsActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          SettingsActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
          cy.wait(3000);
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
        JobProfiles.createJobProfile(jobProfileForUpdate);
        NewJobProfile.linkMatchProfile(collectionOfMatchProfiles[0].matchProfile.profileName);
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[1].matchProfile.profileName,
        );
        NewJobProfile.linkMatchProfileForMatches(
          collectionOfMatchProfiles[2].matchProfile.profileName,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfProfilesForUpdate[0].actionProfile.name,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfProfilesForUpdate[1].actionProfile.name,
        );
        NewJobProfile.linkActionProfileForMatches(
          collectionOfProfilesForUpdate[2].actionProfile.name,
        );
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfileForUpdate.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.checkIsLandingPageOpened();
        DataImport.uploadFile(testData.editedMarcFileName, testData.marcFileNameForUpdate);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfileForUpdate.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(testData.marcFileNameForUpdate);
        Logs.checkJobStatus(testData.marcFileNameForUpdate, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(testData.marcFileNameForUpdate);
        [
          FileDetails.columnNameInResultList.instance,
          FileDetails.columnNameInResultList.holdings,
          FileDetails.columnNameInResultList.item,
        ].forEach((columnName) => {
          FileDetails.checkStatusInColumn(RECORD_STATUSES.UPDATED, columnName);
        });
        FileDetails.openInstanceInInventory(RECORD_STATUSES.UPDATED);
        InstanceRecordView.verifyStatisticalCode(
          collectionOfProfilesForUpdate[0].mappingProfile.statisticalCodeUI,
        );
        InstanceRecordView.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkHoldingsType(
          collectionOfProfilesForUpdate[1].mappingProfile.holdingsType,
        );
        HoldingsRecordView.close();
        InventoryInstance.openHoldingsAccordion(`${LOCATION_NAMES.ANNEX_UI} >`);
        InventoryInstance.openItemByBarcode('No barcode');
        ItemRecordView.verifyStatisticalCode(
          collectionOfProfilesForUpdate[2].mappingProfile.statisticalCodeUI,
        );
      },
    );
  });
});
