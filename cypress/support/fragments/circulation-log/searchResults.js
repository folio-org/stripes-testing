import { MultiColumnListCell, Link } from '../../../../interactors';

export default {
  clickOnCell(content, row) {
    cy.do(MultiColumnListCell({ content, row }).find(Link()).click());
  },
};
