import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  MATERIAL_TYPE_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    let instanceHrid;
    const title = "101 things I wish I'd known when I started using hypnosis";
    const filePathToUpload = 'marcBibFileForC11090.mrc';
    const marcFileName = `C11090 autotestFileName_${getRandomPostfix()}`;

    const collectionOfMappingAndActionProfiles = [
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C11090 instanceMappingProf${getRandomPostfix()}`,
          statisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          statisticalCodeUI: 'Book, print (books)',
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.INSTANCE,
          name: `C11090 instanceActionProf${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C11090 holdingsMappingProf${getRandomPostfix()}`,
          firstStatisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          firstStatisticalCodeUI: 'Book, print (books)',
          secondStatisticalCode: 'ARL (Collection stats): mfiche - Microfiche (mfiche)',
          secondStatisticalCodeUI: 'Book, print (books)',
          permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
          name: `C11090 holdingsActionProf${getRandomPostfix()}`,
        },
      },
      {
        mappingProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C11090 itemMappingProf${getRandomPostfix()}`,
          firstStatisticalCode: 'ARL (Collection stats): music - Music scores, print (music)',
          firstStatisticalCodeUI: 'Book, print (books)',
          secondStatisticalCode: 'ARL (Collection stats): books - Book, print (books)',
          secondStatisticalCodeUI: 'Book, print (books)',
          materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
          permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
          status: ITEM_STATUS_NAMES.AVAILABLE,
        },
        actionProfile: {
          typeValue: FOLIO_RECORD_TYPE.ITEM,
          name: `C11090 itemActionProf${getRandomPostfix()}`,
        },
      },
    ];
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C11090 jobProf${getRandomPostfix()}`,
    };

    before('login', () => {
      cy.getAdminToken();
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
    });

    after('delete test data', () => {
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

    it(
      'C11090 Instance Holdings Item field mapping: Confirm the Statistical codes fields when Creating (folijet) (TaaS)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        // create mapping profiles
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[0].mappingProfile,
        );
        NewFieldMappingProfile.addStatisticalCode(
          collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCode,
          8,
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
        NewFieldMappingProfile.addStatisticalCodeWithSeveralCodes(
          collectionOfMappingAndActionProfiles[1].mappingProfile.firstStatisticalCode,
          collectionOfMappingAndActionProfiles[1].mappingProfile.secondStatisticalCode,
          4,
        );
        NewFieldMappingProfile.fillPermanentLocation(
          collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[1].mappingProfile.name,
        );

        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(
          collectionOfMappingAndActionProfiles[2].mappingProfile,
        );
        NewFieldMappingProfile.addStatisticalCodeWithSeveralCodes(
          collectionOfMappingAndActionProfiles[2].mappingProfile.firstStatisticalCode,
          collectionOfMappingAndActionProfiles[2].mappingProfile.secondStatisticalCode,
          6,
        );
        NewFieldMappingProfile.fillStatus(
          collectionOfMappingAndActionProfiles[2].mappingProfile.status,
        );
        NewFieldMappingProfile.fillPermanentLoanType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType,
        );
        NewFieldMappingProfile.fillMaterialType(
          collectionOfMappingAndActionProfiles[2].mappingProfile.materialType,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.closeViewMode(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );
        FieldMappingProfiles.checkMappingProfilePresented(
          collectionOfMappingAndActionProfiles[2].mappingProfile.name,
        );

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

        // upload a marc file for creating of the new instance, holding and item
        cy.visit(TopMenu.dataImportPath);
        // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
        DataImport.verifyUploadState();
        DataImport.uploadFile(filePathToUpload, marcFileName);
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(marcFileName);
        Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
        Logs.openFileDetails(marcFileName);
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.getInstanceHrid().then((hrid) => {
          instanceHrid = hrid;

          cy.visit(TopMenu.inventoryPath);
          InventorySearchAndFilter.searchInstanceByHRID(instanceHrid);
          InstanceRecordView.verifyInstancePaneExists();
          InstanceRecordView.verifyStatisticalCode(
            collectionOfMappingAndActionProfiles[0].mappingProfile.statisticalCodeUI,
          );
          InstanceRecordView.openHoldingView();
          HoldingsRecordView.checkStatisticalCode(
            collectionOfMappingAndActionProfiles[1].mappingProfile.firstStatisticalCodeUI,
          );
          HoldingsRecordView.checkStatisticalCode(
            collectionOfMappingAndActionProfiles[1].mappingProfile.secondStatisticalCodeUI,
          );
          HoldingsRecordView.checkPermanentLocation(LOCATION_NAMES.ONLINE_UI);
          HoldingsRecordView.close();
          InventoryInstance.openHoldingsAccordion(LOCATION_NAMES.ONLINE_UI);
          InventoryInstance.openItemByBarcode('No barcode');
          ItemRecordView.verifyStatisticalCode(
            collectionOfMappingAndActionProfiles[2].mappingProfile.firstStatisticalCodeUI,
          );
          ItemRecordView.verifyStatisticalCode(
            collectionOfMappingAndActionProfiles[2].mappingProfile.secondStatisticalCodeUI,
          );
          ItemRecordView.verifyMaterialType(MATERIAL_TYPE_NAMES.BOOK);
          ItemRecordView.verifyPermanentLoanType(
            collectionOfMappingAndActionProfiles[2].mappingProfile.permanentLoanType,
          );
          ItemRecordView.verifyItemStatus(
            collectionOfMappingAndActionProfiles[2].mappingProfile.status,
          );
        });
      },
    );
  });
});
