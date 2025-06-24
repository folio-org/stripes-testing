import InventoryInstance from './inventoryInstance';
import QuickMarcEditor from '../quickMarcEditor';

export default {
  addMarcHoldingRecord: () => {
    InventoryInstance.goToMarcHoldingRecordAdding();
    QuickMarcEditor.waitLoading();
    QuickMarcEditor.updateExistingField('852', QuickMarcEditor.getExistingLocation());
    cy.intercept('POST', '/records-editor/records').as('getStatus');
    QuickMarcEditor.pressSaveAndClose();
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
