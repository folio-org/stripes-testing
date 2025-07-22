import {
  APPLICATION_NAMES,
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
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import SettingsDataImport, {
  SETTINGS_TABS,
} from '../../../support/fragments/settings/dataImport/settingsDataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    let userId;
    const marcFileName = `C11107 marcFile${getRandomPostfix()}.mrc`;
    const filePathForUpload = 'marcBibFileForC11107.mrc';
    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          name: `C11107 autotest instance mapping profile_${getRandomPostfix()}`,
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          suppressFromDiscavery: 'Mark for all affected records',
          staffSuppress: 'Mark for all affected records',
          previouslyHeld: 'Mark for all affected records',
          instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.BATCH_LOADED,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
          natureOfContent: 'bibliography',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C11107 autotest instance action profile_${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C11107 autotest holdings mapping profile_${getRandomPostfix()}`,
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
          permanentLocationUI: LOCATION_NAMES.ONLINE_UI,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C11107 autotest holdings action profile_${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C11107 autotest item mapping profile_${getRandomPostfix()}`,
          materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
          materialTypeUI: MATERIAL_TYPE_NAMES.BOOK,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
          missingPieces: '3',
          permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
          permanentLocationUI: LOCATION_NAMES.ANNEX_UI,
          formerIdentifier: `TV_${getRandomPostfix()}`,
          statisticalCode: 'ARL (Collection stats): emusic - Music scores, electronic',
          statisticalCodeUI: 'Music scores, electronic',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C11107 autotest item action profile_${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11107 job profile_${getRandomPostfix()}`,
    };

    before('Login', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userId = userProperties.userId;

        cy.login(userProperties.username, userProperties.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(userId);
        SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
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
      'C11107 Action and field mapping: Create an instance, holdings, and item (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet', 'C11107'] },
      () => {
        // create field mapping profiles
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addStaffSuppress(
          collectionOfMappingAndActionProfiles[0].mappingProfile.suppressFromDiscavery,
        );
        NewFieldMappingProfile.addSuppressFromDiscovery(
          collectionOfMappingAndActionProfiles[0].mappingProfile.suppressFromDiscavery,
        );
        NewFieldMappingProfile.addPreviouslyHeld(
          collectionOfMappingAndActionProfiles[0].mappingProfile.previouslyHeld,
        );
        NewFieldMappingProfile.fillInstanceStatusTerm(
          collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatusTerm,
        );
        NewFieldMappingProfile.addStatisticalCode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCode,
          8,
        );
        NewFieldMappingProfile.addNatureOfContentTerms(
          `"${collectionOfMappingAndActionProfiles[0].mappingProfile.natureOfContent}"`,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[0].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[1].mappingProfile,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation,
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
          collectionOfMappingAndActionProfiles[2].mappingProfile.materialType,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillStatus(
          `"${collectionOfMappingAndActionProfiles[2].mappingProfile.status}"`,
        );
        NewFieldMappingProfile.addStatisticalCode(
          collectionOfMappingAndActionProfiles[2].mappingProfile.statisticalCode,
          6,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.fillMissingPieces(
          `"${collectionOfMappingAndActionProfiles[2].mappingProfile.missingPieces}"`,
        );
        NewFieldMappingProfile.addFormerIdentifier(
          collectionOfMappingAndActionProfiles[2].mappingProfile.formerIdentifier,
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

        // create job profile
        SettingsDataImport.selectSettingsTab(SETTINGS_TABS.JOB_PROFILES);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        Logs.waitFileIsImported(marcFileName);
        Logs.checkJobStatus(marcFileName, JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.openInstanceInInventory(RECORD_STATUSES.CREATED);
        InventoryInstance.getAssignedHRID().then((initialInstanceHrId) => {
          instanceHrid = initialInstanceHrId;

          InstanceRecordView.waitLoading();
          InstanceRecordView.verifyInstanceRecordViewOpened();
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkHoldingRecordViewOpened();
          HoldingsRecordView.checkPermanentLocation(
            collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocationUI,
          );
          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(
            `${collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocationUI} >`,
          );
          InventoryInstance.openItemByBarcode('No barcode');
          ItemRecordView.waitLoading();
          ItemRecordView.verifyMaterialType(
            collectionOfMappingAndActionProfiles[2].mappingProfile.materialTypeUI,
          );
          ItemRecordView.verifyPermanentLoanType(
            collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType,
          );
          ItemRecordView.verifyItemStatus(
            collectionOfMappingAndActionProfiles[2].mappingProfile.status,
          );
          ItemRecordView.verifyFormerIdentifiers(
            collectionOfMappingAndActionProfiles[2].mappingProfile.formerIdentifier,
          );
          ItemRecordView.verifyItemPermanentLocation(
            collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLocationUI,
          );
          ItemRecordView.verifyNumberOfMissingPieces(
            collectionOfMappingAndActionProfiles[2].mappingProfile.missingPieces,
          );
          ItemRecordView.verifyStatisticalCode(
            collectionOfMappingAndActionProfiles[2].mappingProfile.statisticalCodeUI,
          );
        });
      },
    );
  });
});
