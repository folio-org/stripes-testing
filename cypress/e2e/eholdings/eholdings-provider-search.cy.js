import TopMenu from '../../support/fragments/topMenu';
import eHoldingsProvidersSearch from '../../support/fragments/eholdings/eHoldingsProvidersSearch';
import eHoldingsProviders from '../../support/fragments/eholdings/eHoldingsProviders';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import users from '../../support/fragments/users/users';
import devTeams from '../../support/dictionary/devTeams';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';

describe('eHoldings -> Provider', () => {
  let userId;

  before(() => {
    cy.createTempUser([
      permissions.uieHoldingsRecordsEdit.gui,
      permissions.moduleeHoldingsEnabled.gui,
    ]).then((userProperties) => {
      userId = userProperties.userId;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.eholdingsPath,
        waiter: eHoldingsPackages.waitLoading,
      });
    });
  });

  after(() => {
    users.deleteViaApi(userId);
  });

  it(
    'C694 Search providers for [Gale | Cengage]. Then Search list of packages on Provider detail record for all selected packages (spitfire)',
    { tags: [testTypes.criticalPath, devTeams.spitfire] },
    () => {
      eHoldingsProvidersSearch.byProvider('Gale Cengage');
      eHoldingsProviders.viewProvider();
      eHoldingsProviders.clickSearchIcon();
      eHoldingsProviders.bySelectionStatusOpen('Selected');
      eHoldingsProviders.checkOnlySelectedPackagesInResults();
    },
  );
});
