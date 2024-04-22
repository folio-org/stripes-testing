import {
  ACQUISITION_METHOD_NAMES,
  ACTION_NAMES_IN_ACTION_PROFILE,
  EXISTING_RECORDS_NAMES,
  FOLIO_RECORD_TYPE,
  HOLDINGS_TYPE_NAMES,
  INSTANCE_STATUS_TERM_NAMES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  JOB_STATUS_NAMES,
  RECORD_STATUSES,
  ORDER_STATUSES,
  VENDOR_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import MatchProfiles from '../../../support/fragments/settings/dataImport/matchProfiles/matchProfiles';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import FileManager from '../../../support/utils/fileManager';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import getRandomPostfix, { randomFourDigitNumber } from '../../../support/utils/stringTools';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import Users from '../../../support/fragments/users/users';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
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
          currency: 'USD',
          locationName: '"Main Library (KU/CC/DI/M)"',
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
          materialType: `"${MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE}"`,
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
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.ELECTRONIC_RESOURCE,
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
          existingRecordType: EXISTING_RECORDS_NAMES.INSTANCE,
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
          existingRecordType: EXISTING_RECORDS_NAMES.HOLDINGS,
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
          existingRecordType: EXISTING_RECORDS_NAMES.ITEM,
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
      cy.loginAsAdmin({
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
      collectionOfProfilesForCreate.forEach((profile) => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
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
      cy.getAdminToken().then(() => {
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
      FileManager.deleteFile(`cypress/fixtures/${testData.editedMarcFileName}`);
    });

    it(
      'C451467 Check Import with 2 submatches for update Instance, Holdings, Item via VRN (folijet)',
      { tags: ['criticalPath', 'folijet'] },
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
        collectionOfProfilesForUpdate.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create match profiles
        cy.visit(SettingsMenu.matchProfilePath);
        collectionOfMatchProfiles.forEach((profile) => {
          MatchProfiles.createMatchProfile(profile.matchProfile);
          MatchProfiles.checkMatchProfilePresented(profile.matchProfile.profileName);
        });

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
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

        cy.visit(TopMenu.dataImportPath);
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
        InstanceRecordView.verifyInstanceStatusTerm(
          collectionOfProfilesForUpdate[0].mappingProfile.instanceStatusTerm,
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
