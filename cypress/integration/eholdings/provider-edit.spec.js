import { Accordion, Button, HTML, including, Link, matching, Page, PaneHeader, Select } from '../../../interactors';

describe('ui-eholdings: Provider Edit', () => {
  before('logs in and navigates to eHoldings', () => {
    cy.visit('/');
    cy.login('diku_admin', 'admin');
    cy.do(Link('eHoldings').click());
  });

  after(() => {
    cy.logout();
  });

  describe('visiting Provider Edit page', () => {
    before('searching and opening provider', () => {
      cy.search('EBSCO');
      cy.do(Link(including('EBSCO\n')).click());
    });

    describe('changing provider proxy', () => {
      before(() => {
        cy.do([
          PaneHeader('EBSCO').find(Button('Edit')).click(),
          Select('Proxy').choose('MJProxy'), // FIXME: Tests depend on previous runs so it might happen that proxy already is 'MJProxy' so 'Save & close' button stats disabled
          Button('Save & close').click(),
        ]);
        cy.reload();
      });

      it('should open Provider Show page', () => {
        cy.expect(Page.has({ url: matching(/\/eholdings\/providers\/\d+/) }));
      });

      it('should show correct proxy value', () => {
        cy.expect(Accordion('Provider settings').find(HTML(including('MJProxy'))).exists());
      });
    });
  });
});
