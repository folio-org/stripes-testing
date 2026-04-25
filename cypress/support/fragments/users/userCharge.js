import { not } from '@interactors/html';
import { Button, Modal, Select, TextField } from '../../../../interactors';

const rootModal = Modal('New fee/fine');

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },
  fillRequiredFields: (ownerId, feeFineType, feeFineAmount) => {
    cy.wait(500);
    cy.do(rootModal.find(Select({ id: 'ownerId' })).choose(ownerId));
    cy.wait(500);
    cy.do(rootModal.find(Select({ id: 'feeFineType' })).choose(feeFineType));
    cy.wait(500);
    if (feeFineAmount) {
      cy.do(rootModal.find(TextField({ id: 'amount' })).fillIn(feeFineAmount));
      cy.wait(500);
    } else {
      cy.expect(rootModal.find(TextField('Fee/fine amount*')).has({ text: not('') }));
    }
  },
  chargeOnly: () => {
    cy.wait(500);
    cy.do(rootModal.find(Button({ id: 'chargeOnly' })).click());
  },
};
