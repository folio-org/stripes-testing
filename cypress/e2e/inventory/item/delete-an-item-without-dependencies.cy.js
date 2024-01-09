import uuid from 'uuid';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';
import { JOB_STATUS_NAMES, LOAN_TYPE_NAMES, MATERIAL_TYPE_NAMES } from '../../../support/constants';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryItems from '../../../support/fragments/inventory/item/inventoryItems';

describe('Importing MARC Bib files', () => {
  const testData = {
    tag852: '852',
    headerTitle: 'Create a new MARC Holdings record',
    location: QuickMarcEditor.getExistingLocation(),
    updatedIndicator: '0',
    newTag852Content: '$b E $h call $i number $k prefix $l title $m suffix $t copy number',
    itemBarcode: uuid(),
    itemMaterialType: MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE,
    itemLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
  };
  const marcFile = {
    marc: 'oneMarcBib.mrc',
    fileName: `testMarcFileC715${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };
  const recordIDs = [];

  before('create test data and login', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(() => {
      DataImport.verifyUploadState();
      DataImport.uploadFileAndRetry(marcFile.marc, marcFile.fileName);
      JobProfiles.waitLoadingList();
      JobProfiles.search(marcFile.jobProfileToRun);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFile.fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(marcFile.fileName);
      Logs.getCreatedItemsID().then((link) => {
        recordIDs.push(link.split('/')[5]);
      });
      cy.visit(TopMenu.inventoryPath).then(() => {
        InventoryInstances.searchByTitle(recordIDs[0]);
        InventoryInstances.selectInstance();
      });
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.updateExistingField(testData.tag852, testData.location);
      QuickMarcEditor.updateIndicatorValue(testData.tag852, testData.updatedIndicator);
      QuickMarcEditor.updateExistingField(testData.tag852, testData.newTag852Content);
      QuickMarcEditor.pressSaveAndClose();
      HoldingsRecordView.close();
      InventoryInstance.addItem();
      ItemRecordNew.fillItemRecordFields({
        barcode: testData.itemBarcode,
        materialType: testData.itemMaterialType,
        loanType: testData.itemLoanType,
      });
      ItemRecordNew.saveAndClose();
    });
  });

  after('delete test data', () => {
    cy.getAdminToken().then(() => {
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(recordIDs[0]);
    });
  });

  it(
    'C715 Delete an item without dependencies (folijet) (TaaS)',
    { tags: ['extendedPath', 'folijet'] },
    () => {
      InventoryInstance.clickHoldingAccordion();
      InventoryInstance.clickItemBarcodeLink(testData.itemBarcode);
      InventoryItems.deleteItemBarCode();
      InventoryInstance.clickHoldingAccordion();
      InventoryItems.verifyThereAreNoItemInHoldings();
    },
  );
});
