import { MultiColumnList } from '../../../../interactors';

export default {
  waitLoading: () => {
    cy.xpath("//div[@id='sudoc-module-display']").should('be.visible');
  },

  checkTableDisplayed: () => {
    cy.expect(MultiColumnList().exists());
  },
};
