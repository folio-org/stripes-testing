import { Button } from '../../../../interactors';

const newSerialsButton = Button({ id: 'clickable-new-serial' });

export default {
  waitLoading: () => {
    // checking button xpath since UI for serials doesn't have unique IDs for sections
    cy.expect(newSerialsButton.exists());
    cy.xpath("//div[@id='serials-management-module-display']").should('exist');
  },
};
