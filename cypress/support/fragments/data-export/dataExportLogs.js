import { MultiColumnListCell, Button } from '../../../../interactors';

export default {
  saveMarcFileForImport:() => {
    cy.do(MultiColumnListCell({ 'row': 0, 'columnIndex': 0 })
      .find(Button())
      .click());
  },
};
