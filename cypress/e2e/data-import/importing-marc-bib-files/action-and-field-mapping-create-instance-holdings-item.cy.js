import {
  FOLIO_RECORD_TYPE,
  INSTANCE_STATUS_TERM_NAMES,
  ITEM_STATUS_NAMES,
  JOB_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
  RECORD_STATUSES,
} from '../../../support/constants';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
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
          name: `C11107 autotest holdings action profile_${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11107 job profile_${getRandomPostfix()}`,
    };

    before('login', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        JobProfiles.deleteJobProfile(jobProfile.profileName);
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          ActionProfiles.deleteActionProfile(profile.actionProfile.name);
          FieldMappingProfileView.deleteViaApi(profile.mappingProfile.name);
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
      { tags: ['extendedPath', 'folijet'] },
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
          collectionOfMappingAndActionProfiles[0].mappingProfile.natureOfContent,
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
        collectionOfMappingAndActionProfiles.forEach((profile) => {
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
        });

        // create job profile
        cy.visit(SettingsMenu.jobProfilePath);
        JobProfiles.createJobProfile(jobProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[0].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[1].actionProfile);
        NewJobProfile.linkActionProfile(collectionOfMappingAndActionProfiles[2].actionProfile);
        NewJobProfile.saveAndClose();
        JobProfiles.checkJobProfilePresented(jobProfile.profileName);

        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathForUpload, marcFileName);
        JobProfiles.waitFileIsUploaded();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
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
