import { not } from '@interactors/html';
import { Button, Modal, Select, TextField } from '../../../../interactors';
import UsersCard from './usersCard';

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
    if (!feeFineAmount) {
      cy.expect(rootModal.find(TextField('Fee/fine amount*')).has({ text: not('') }));
    }
  },
  chargeOnly: () => {
    cy.wait(500);
    cy.do(rootModal.find(Button({ id: 'chargeOnly' })).click());
    UsersCard.waitLoading();
  },
};
