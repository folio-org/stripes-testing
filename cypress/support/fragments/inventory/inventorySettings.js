import { Pane, NavListItem } from '../../../../interactors';

export default {
  checkMaterialTypesMenuOptionIsPresent:() => {
    cy.expect(Pane('Inventory').find(NavListItem('Material types')).exists());
  },
};
