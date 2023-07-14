import InventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';

export default {
  addMarcHoldingRecord:() => {
    InventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
    QuickMarcEditor.pressSaveAndClose();
  },

  verifyHiddenFieldValueInHoldings008(holdingsID, fieldLabel, expectedValue) {
    cy.getHoldingsDataInEditorViaApi(holdingsID).then(holdingsData => {
      cy.expect(holdingsData.fields[2].content[fieldLabel]).equal(expectedValue);
    });
  }
};
