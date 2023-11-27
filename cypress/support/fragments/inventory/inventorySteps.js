import InventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';

export default {
  addMarcHoldingRecord: () => {
    InventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.getExistingLocation().then((locationSubfield) => {
      QuickMarcEditor.updateExistingField('852', locationSubfield);
      QuickMarcEditor.pressSaveAndClose();
    });
  },

  verifyHiddenFieldValueIn008(recordID, fieldLabel, expectedValue) {
    cy.getRecordDataInEditorViaApi(recordID).then((recordData) => {
      cy.expect(
        recordData.fields.filter((field) => field.tag === '008')[0].content[fieldLabel],
      ).equal(expectedValue);
    });
  },
};
