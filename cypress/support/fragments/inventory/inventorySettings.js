import { Pane, NavListItem } from '../../../../interactors';

export default {
  checkAvailableOptions:() => {
    cy.expect(Pane('Inventory').find(NavListItem('Material types')).exists());
  },
};
