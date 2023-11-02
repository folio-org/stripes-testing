import { Button, Modal } from '../../../../../../interactors';

export default {
  selectServicePoint: (servicePoint) => {
    cy.do(Modal('Select service point').find(Button(servicePoint)).click());
    cy.expect(Modal('Select service point').absent());
  },
};
