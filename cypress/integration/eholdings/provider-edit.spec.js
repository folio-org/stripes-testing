import TopMenu from '../../support/fragments/topMenu';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import eHoldingsProviderView from '../../support/fragments/eholdings/eHoldingsProviderView';
import eHoldingsProviderEdit from '../../support/fragments/eholdings/eHoldingsProviderEdit';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';

describe('ui-eholdings: Provider manage', () => {
  let userId = '';

  beforeEach(() => {
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
      permissions.moduleeHoldingsEnabled.gui]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdingsPath);
    });
  });
  // TODO: https://issues.folio.org/browse/UIEH-1260
  it('C696 Edit proxy setting', { tags: [testTypes.smoke] }, () => {
    const specialProvider = 'Johns Hopkins University Press';
    eHoldingsProvidersSearch.byProvider(specialProvider);
    eHoldingsProviders.viewProvider();
    eHoldingsProviderView.edit(specialProvider);
    eHoldingsProviderEdit.waitLoading(specialProvider);
    eHoldingsProviderEdit.changeProxy().then(newProxy => {
      eHoldingsProviderEdit.saveAndClose();
      eHoldingsProviderView.checkProxy(newProxy);
    });
  });
  afterEach(() => {
    cy.deleteUser(userId);
  });
});
