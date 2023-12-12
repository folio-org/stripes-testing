import {
  Button,
  Modal,
  NavListItem,
  Section,
  SelectionOption,
  including,
} from '../../../../../interactors';

export default {
  waitLoading() {
    cy.expect(Section({ id: 'app-settings-nav-pane' }).exists());
  },
  waitLoadingForAddresses() {
    cy.expect(Section({ id: 'app-settings-nav-pane' }).exists());
  },

  selectMembership() {
    cy.do(NavListItem('Membership').click());
  },

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
};
