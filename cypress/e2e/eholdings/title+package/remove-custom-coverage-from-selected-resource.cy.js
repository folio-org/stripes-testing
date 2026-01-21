import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import EHoldingsResourceView from '../../../support/fragments/eholdings/eHoldingsResourceView';
import EHoldingsResourceEdit from '../../../support/fragments/eholdings/eHoldingsResourceEdit';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import EHoldingsSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import { FILTER_STATUSES } from '../../../support/fragments/eholdings/eholdingsConstants';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      resourcePath: '/resources/38-467-103587',
      titleName: 'Fashion Theory',
      packageName: 'Taylor & Francis',
      coverageRange: {
        startDay: '01/01/2023',
        endDay: '12/31/2023',
      },
    };

    before('Create user, login as admin & set custom coverage', () => {
      cy.getAdminToken();
      EHoldingsTitle.changeResourceSelectionStatusViaApi({
        resourceId: testData.resourcePath.split('/').pop(),
        isSelected: true,
      });
      EHoldingsResourceEdit.updateResourceAttributesViaApi(testData.resourcePath.split('/').pop(), {
        customCoverages: [
          {
            beginCoverage: '2023-01-01',
            endCoverage: '2023-12-31',
          },
        ],
      });

      cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((user) => {
        testData.user = user;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
          authRefresh: true,
        });
        EHoldingsSearch.switchToTitles();
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C422015 Remove "Date range" under "Coverage settings" when editing Selected Resource (Title+Package) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422015'] },
      () => {
        EHoldingsTitle.searchTitle(testData.titleName);
        EHoldingsTitlesSearch.openTitle(testData.titleName);
        EHoldingsTitle.waitPackagesLoading();
        EHoldingsTitle.filterPackages(FILTER_STATUSES.SELECTED, testData.packageName);
        EHoldingsTitle.waitPackagesLoading();

        EHoldingsTitle.openResource();
        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.checkCustomPeriods([testData.coverageRange]);

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();
        EHoldingsResourceEdit.removeExistingCustomeCoverageDates();

        EHoldingsResourceView.waitLoading();
        EHoldingsResourceView.verifyNoCustomCoverageDates();
      },
    );
  });
});
