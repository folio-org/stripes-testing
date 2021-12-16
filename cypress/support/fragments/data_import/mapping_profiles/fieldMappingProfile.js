import { Button } from '@interactors/html';

export default {
  clickActionButton() {
    cy.do(Button('Actions')
      .click());
  },

  deleteMappingProfile() {
    cy.get('[class="DropdownMenu---x9lIp"]')
      .contains('Delete')
      .click();
  }
};
