import TopMenu from '../../support/fragments/topMenu';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import eHoldingsProviderView from '../../support/fragments/eholdings/eHoldingsProviderView';
import eHoldingsProviderEdit from '../../support/fragments/eholdings/eHoldingsProviderEdit';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import users from '../../support/fragments/users/users';
import devTeams from '../../support/dictionary/devTeams';

describe('ui-eholdings: Provider manage', () => {
  let userId;

  beforeEach(() => {
    cy.createTempUser([permissions.uieHoldingsRecordsEdit.gui,
    permissions.moduleeHoldingsEnabled.gui]).then(userProperties => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password);
      cy.visit(TopMenu.eholdingsPath);
    });
  });
  it('C696 Edit proxy setting (spitfire)', { tags: [testTypes.smoke, devTeams.spitfire, testTypes.broken] }, () => {
    const specialProvider = 'Johns Hopkins University Press';
    eHoldingsProvidersSearch.byProvider(specialProvider);
    eHoldingsProviders.viewProvider();
    eHoldingsProviderView.edit(specialProvider);
    eHoldingsProviderEdit.waitLoading(specialProvider);
    eHoldingsProviderEdit.changeProxy().then(newProxy => {
      eHoldingsProviderEdit.saveAndClose();
      // additional delay related with update of proxy information in ebsco services
      cy.wait(1000);
      cy.reload();
      eHoldingsProviderView.checkProxy(newProxy);
    });
  });
  afterEach(() => {
    users.deleteViaApi(userId);
  });
});
