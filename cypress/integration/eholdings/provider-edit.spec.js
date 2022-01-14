import TopMenu from '../../support/fragments/topMenu';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import eHoldingsProviderView from '../../support/fragments/eholdings/eHoldingsProviderView';
import eHoldingsProviderEdit from '../../support/fragments/eholdings/eHoldingsProviderEdit';
import testTypes from '../../support/dictionary/testTypes';

describe('ui-eholdings: Provider manage', () => {
  before(() => {
    // TODO: add support of special permissions in special account
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
    cy.visit(TopMenu.eholdings);
  });
  it('C696 Edit proxy setting', { tags: [testTypes.smoke] }, () => {
    const specialProvider = 'Johns Hopkins University Press';
    eHoldingsProvidersSearch.byProvider(specialProvider);
    eHoldingsProviders.viewProvider();
    eHoldingsProviderView.edit(specialProvider);
    eHoldingsProviderEdit.changeProxy().then(newProxy => {
      eHoldingsProviderEdit.saveAndClose();
      eHoldingsProviderView.checkProxy(newProxy);
    });
  });
});
