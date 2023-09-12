import { not } from 'bigtest';
import { Button, Modal, Select, TextField } from '../../../../interactors';
import UsersCard from './usersCard';

const rootModal = Modal('New fee/fine');

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },
  fillRequiredFields: (ownerId, feeFineType, feeFineAmount) => {
    cy.do(rootModal.find(Select({ id: 'ownerId' })).choose(ownerId));
    cy.do(rootModal.find(Select({ id: 'feeFineType' })).choose(feeFineType));
    if (!feeFineAmount) {
      cy.expect(rootModal.find(TextField('Fee/fine amount*')).has({ text: not('') }));
    }
  },
  chargeOnly: () => {
    cy.do(rootModal.find(Button({ id: 'chargeOnly' })).click());
    UsersCard.waitLoading();
  },
};
