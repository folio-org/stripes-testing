import { Permissions } from '../../../support/dictionary';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      packageId: '19-160',
      packageName: 'Academic Search Premier',
      titleName: 'Acta Zoologica',
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: `${TopMenu.eholdingsPath}/packages/${testData.packageId}`,
          waiter: EHoldingsPackageView.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C1540 Package detail record: Browse titles AND scroll detail record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1540'] },
      () => {
        EHoldingsPackageView.verifyTitlesTableColumns([
          'Status',
          'Title',
          'Managed coverage',
          'Custom coverage',
          'Managed embargo period',
          'Tag(s)',
        ]);
        EHoldingsPackageView.verifyTitlesSearchElements();
        EHoldingsPackageView.findTitleInList(testData.titleName);

        EHoldingsPackageView.verifyPaginationButtonState('Previous', false);
        EHoldingsPackageView.verifyPaginationButtonState('Next', true);

        EHoldingsPackageView.clickNextPaginationButton();
        EHoldingsPackageView.verifyNextPageTitlesDisplayed();

        EHoldingsPackageView.verifyPaginationButtonState('Previous', true);
        EHoldingsPackageView.verifyPaginationButtonState('Next', true);
        EHoldingsPackageView.clickPreviousPaginationButton();
        EHoldingsPackageView.verifyFirstPageTitlesDisplayed();
        EHoldingsPackageView.verifyPaginationButtonState('Previous', false);
        EHoldingsPackageView.verifyPaginationButtonState('Next', true);
      },
    );
  });
});
