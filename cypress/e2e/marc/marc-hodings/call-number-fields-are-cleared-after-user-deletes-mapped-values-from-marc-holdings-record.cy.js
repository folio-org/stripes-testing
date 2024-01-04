import uuid from 'uuid';
import { LOAN_TYPE_NAMES, MATERIAL_TYPE_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC -> MARC Holdings', () => {
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
    fileName: `testMarcFileC375188${getRandomPostfix()}.mrc`,
    jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
  };
  const callNumberValues = {
    copyNumber: 'copy number',
    callNumberType: 'Library of Congress classification',
    callNumberPrefix: 'prefix',
    callNumber: 'call number',
    callNumberSuffix: 'suffix',
  };
  const callNumberValuesAfterDeletingSubfields = {
    copyNumber: '-',
    callNumberType: '-',
    callNumberPrefix: '-',
    callNumber: '-',
    callNumberSuffix: '-',
  };

  before('create test data and login', () => {
    cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading });
    // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
    DataImport.verifyUploadState();
    // upload a marc file for creating new instance
    DataImport.uploadFile(marcFile.marc, marcFile.fileName);
    JobProfiles.waitFileIsUploaded();
    JobProfiles.search(marcFile.jobProfileToRun);
    JobProfiles.runImportFile();
    JobProfiles.waitFileIsImported(marcFile.fileName);
    Logs.openFileDetails(marcFile.fileName);
    Logs.getCreatedItemsID(0).then((link) => {
      testData.instanceID = link.split('/')[5];
    });
    cy.logout();

    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
      InventoryInstances.searchByTitle(testData.instanceID);
      InventoryInstances.selectInstance();
    });
  });

  after('delete test data', () => {
    cy.getAdminToken().then(() => {
      InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  it(
    'C375188 Verify that "Call number" fields are cleared after user deletes mapped values from "MARC Holdings" record. (spitfire) (TaaS)',
    { tags: ['extendedPath', 'spitfire'] },
    () => {
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.goToMarcHoldingRecordAdding();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.checkPaneheaderContains(testData.headerTitle);
      QuickMarcEditor.checkFieldsExist([testData.tag852]);
      QuickMarcEditor.updateExistingField(testData.tag852, testData.location);
      QuickMarcEditor.updateIndicatorValue(testData.tag852, testData.updatedIndicator);
      QuickMarcEditor.updateExistingField(testData.tag852, testData.newTag852Content);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveHoldings();
      HoldingsRecordView.checkHoldingsCallNumber(callNumberValues);
      HoldingsRecordView.close();
      InventoryInstance.addItem();
      ItemRecordNew.fillItemRecordFields({
        barcode: testData.itemBarcode,
        materialType: testData.itemMaterialType,
        loanType: testData.itemLoanType,
      });
      ItemRecordNew.saveAndClose();
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.openHoldingView();
      HoldingsRecordView.editInQuickMarc();
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.updateIndicatorValue(testData.tag852, '');
      QuickMarcEditor.updateExistingField(testData.tag852, testData.location);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.checkAfterSaveHoldings();
      HoldingsRecordView.checkHoldingsCallNumber(callNumberValuesAfterDeletingSubfields);
      HoldingsRecordView.close();
      InventoryInstance.waitInventoryLoading();
      InventoryInstance.openHoldings(['']);
      InventoryInstance.openItemByBarcode(testData.itemBarcode);
      ItemRecordView.waitLoading();
      ItemRecordView.verifyShelvingOrder('-');
      ItemRecordView.verifyCallNumber('-');
      ItemRecordView.closeDetailView();
      InventoryInstance.waitInventoryLoading();
      InventorySearchAndFilter.selectBrowseCallNumbers();
      InventorySearchAndFilter.browseSearch(callNumberValues.callNumber);
      InventorySearchAndFilter.verifyCallNumbersResultsInBrowsePane('call numberwould be here');
    },
  );
});
