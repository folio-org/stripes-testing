import { Permissions } from '../../../support/dictionary';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Titles', () => {
    const specChars = '_,\'%^{}()[]@$#&+-=;.!?"|/\\*~№';
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiTagsPermissionAll.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
        EHoldingSearch.switchToTitles();
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C387488 Enter special characters into "Packages" facet single select element (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C387488'] },
      () => {
        EHoldingsTitlesSearch.byTitle('Wiley');
        EHoldingsTitlesSearch.waitLoading();
        EHoldingsTitlesSearch.checkRecordCounter();
        EHoldingsTitlesSearch.verifyPackagesAccordionShown();

        EHoldingsTitlesSearch.openPackagesDropdown();

        for (const char of specChars) {
          EHoldingsTitlesSearch.fillInPackagesDropdownInput(char);
          cy.wait(20); // to avoid input processing issues
          EHoldingsTitlesSearch.fillInPackagesDropdownInput('');
          cy.wait(20); // to avoid input processing issues
        }
      },
    );
  });
});
