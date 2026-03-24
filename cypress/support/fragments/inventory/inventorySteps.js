import InventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';

export default {
  addMarcHoldingRecord: () => {
    InventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.getExistingLocation().then((location) => {
      QuickMarcEditor.updateExistingField('852', location);
    });
    cy.intercept('POST', '/records-editor/records').as('getStatus');
    QuickMarcEditor.pressSaveAndCloseButton();
    cy.wait('@getStatus', { timeout: 5_000 }).its('response.statusCode').should('eq', 201);
  },

  verifyHiddenFieldValueIn008(recordID, fieldLabel, expectedValue) {
    cy.getRecordDataInEditorViaApi(recordID).then((recordData) => {
      cy.expect(
        recordData.fields.filter((field) => field.tag === '008')[0].content[fieldLabel],
      ).equal(expectedValue);
    });
  },
};
