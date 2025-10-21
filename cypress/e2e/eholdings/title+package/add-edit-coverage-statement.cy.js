import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsPackages,
  EHoldingsNewCustomTitle,
  EHoldingsResourceEdit,
  EHoldingsResourceView,
  EHoldingsSearch,
  EHoldingsTitle,
  EHoldingsTitlesSearch,
} from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { FILTER_STATUSES } from '../../../support/fragments/eholdings/eholdingsConstants';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: `AT_C701_Package_${getRandomPostfix()}`,
      titleName: `AT_C701_Title_${getRandomPostfix()}`,
      coverageStatement: `Test coverage statement ${getRandomPostfix()}`,
    };

    before('Create user, package, and title', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;
        EHoldingsPackages.createPackageViaAPI({
          data: {
            type: 'packages',
            attributes: {
              name: testData.packageName,
              contentType: 'E-Book',
            },
          },
        })
          .then(() => {
            cy.loginAsAdmin({
              path: TopMenu.eholdingsPath,
              waiter: EHoldingsTitlesSearch.waitLoading,
            });

            EHoldingsSearch.switchToTitles();
            EHoldingsNewCustomTitle.createNewTitle();
            EHoldingsNewCustomTitle.waitLoading();
            EHoldingsNewCustomTitle.fillInRequiredProperties(
              testData.packageName,
              testData.titleName,
            );
            EHoldingsNewCustomTitle.saveAndClose();
            cy.wait(2000);
            EHoldingsNewCustomTitle.checkCreationOfNewCustomTitle();
          })
          .then(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.eholdingsPath,
              waiter: EHoldingsTitlesSearch.waitLoading,
            });
          });
      });
    });

    after('Delete user and package', () => {
      cy.getAdminToken();
      EHoldingsPackages.deletePackageViaAPI(testData.packageName, true);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C701 Add or edit coverage statement (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C701'] },
      () => {
        EHoldingsSearch.switchToTitles();

        EHoldingsTitlesSearch.byTitle(testData.titleName);
        EHoldingsTitlesSearch.bySelectionStatus(FILTER_STATUSES.SELECTED);
        EHoldingsTitlesSearch.openTitle(testData.titleName);
        EHoldingsTitle.waitPackagesLoading();

        EHoldingsTitle.filterPackages(FILTER_STATUSES.SELECTED, testData.packageName);
        EHoldingsTitle.waitPackagesLoading();

        EHoldingsTitle.openResource();
        EHoldingsResourceView.waitLoading();

        EHoldingsResourceView.goToEdit();
        EHoldingsResourceEdit.waitLoading();

        EHoldingsResourceEdit.chooseCoverageStatement();

        EHoldingsResourceEdit.fillCoverageStatement(testData.coverageStatement);

        EHoldingsResourceEdit.saveAndClose();
        EHoldingsResourceView.waitLoading();

        EHoldingsResourceView.verifyCoverageStatement(testData.coverageStatement);
      },
    );
  });
});
