import { Button, Checkbox, Modal, MultiColumnListCell } from '../../../../interactors';

function getModalCheckboxByRow(row) {
  return Modal().find(MultiColumnListCell({ 'row': row, 'columnIndex': 0 })).find(Checkbox());
}

function buttonIsEnabled(name) {
  return cy.expect(Modal().find(Button(name)).is({ disabled: false }));
}

export default {
  verifySelectedRecords(elemCount) {
    for (let i = 0; i < elemCount; i++) {
      cy.expect(getModalCheckboxByRow(i).is({ disabled: false, checked: true }));
    }
  },

  verifySelectedRecordsCount(expectedCount) {
    cy.get('#selected-records-list [data-row-index]').then(elements => {
      expect(elements.length).to.eq(expectedCount);
    });
  },

  verifyButtons() {
    buttonIsEnabled('Cancel');
    buttonIsEnabled('Save & close');
  }
};
