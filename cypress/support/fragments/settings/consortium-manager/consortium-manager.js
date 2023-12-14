import { Button, Modal, SelectionOption, including, HTML } from '../../../../../interactors';

export default {
  switchActiveAffiliation(tenantName) {
    cy.wait(8000);
    cy.do([
      Button({ ariaLabel: 'My profile' }).click(),
      Button('Switch active affiliation').click(),
      Modal('Select affiliation')
        .find(Button({ id: 'consortium-affiliations-select' }))
        .click(),
      SelectionOption(including(tenantName)).click(),
      Button({ id: 'save-active-affiliation' }).click(),
    ]);
    cy.wait(8000);
  },

  checkCurrentTenantInTopMenu(tenantName) {
    cy.expect(
      Button({ ariaLabel: 'My profile' })
        .find(HTML({ text: including(tenantName) }))
        .exists(),
    );
  },
};
