import { Button } from '../../../../interactors';

const serialsFiltersButton = Button({ id: 'clickable-nav-serials' });
const pieceSetsFiltersButton = Button({ id: 'clickable-nav-piece-sets' });

export default {
  waitLoading() {
    // checking button xpath since UI for serials doesn't have unique IDs for sections
    cy.expect([serialsFiltersButton.exists(), pieceSetsFiltersButton.exists()]);
    cy.xpath("//div[@id='serials-management-module-display']").should('exist');
  },
};
