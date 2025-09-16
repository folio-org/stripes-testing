import uuid from 'uuid';
import {
  DEFAULT_JOB_PROFILE_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import ItemRecordView from '../../../support/fragments/inventory/item/itemRecordView';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const randomLetters = getRandomLetters(8);
    const testData = {
      tag852: '852',
      headerTitle: /Create a new .*MARC Holdings record/,
      location: QuickMarcEditor.getExistingLocation(),
      updatedIndicator: '0',
      newTag852Content: `$b E $h call $i number ${randomLetters} $k prefix $l title $m suffix $t copy number`,
      itemBarcode: uuid(),
      itemMaterialType: MATERIAL_TYPE_NAMES.ELECTRONIC_RESOURCE,
      itemLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
    };
    const marcFile = {
      marc: 'oneMarcBib.mrc',
      fileName: `testMarcFileC375188${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
      propertyName: 'instance',
    };
    const callNumberValues = {
      copyNumber: 'copy number',
      callNumberType: 'Library of Congress classification',
      callNumberPrefix: 'prefix',
      callNumber: `call number ${randomLetters}`,
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
      cy.getAdminToken();
      DataImport.uploadFileViaApi(marcFile.marc, marcFile.fileName, marcFile.jobProfileToRun).then(
        (response) => {
          response.forEach((record) => {
            testData.instanceID = record[marcFile.propertyName].id;
          });
        },
      );

      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
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
      { tags: ['extendedPath', 'spitfire', 'C375188'] },
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
        ItemRecordView.verifyShelvingOrder('No value set-');
        ItemRecordView.verifyCallNumber('No value set-');
        ItemRecordView.closeDetailView();
        InventoryInstance.waitInventoryLoading();
        InventorySearchAndFilter.selectBrowseCallNumbers();
        BrowseCallNumber.waitForCallNumberToAppear(callNumberValues.callNumber, false);
        InventorySearchAndFilter.browseSearch(callNumberValues.callNumber);
        InventorySearchAndFilter.verifyCallNumbersResultsInBrowsePane(
          `${callNumberValues.callNumber}would be here`,
        );
      },
    );
  });
});
