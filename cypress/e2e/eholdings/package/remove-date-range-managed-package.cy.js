import { Permissions } from '../../../support/dictionary';
import EHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      managedPackageName: 'Books 24x7 Leadership Development Channel - Spanish',
      startDate: '01/01/2023',
      endDate: '12/31/2023',
      displayStartDate: '1/1/2023',
      displayEndDate: '12/31/2023',
    };
    let user;

    before('Setup managed package as admin and create user', () => {
      cy.getAdminToken()
        .then(() => {
          cy.loginAsAdmin({
            path: TopMenu.eholdingsPath,
            waiter: EHoldingSearch.waitLoading,
          });
          EHoldingSearch.switchToPackages();
          cy.wait(3000);
          EHoldingsPackagesSearch.byName(testData.managedPackageName);
          EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();
          EHoldingsPackages.openPackage();

          EHoldingsPackageView.verifyPackageName(testData.managedPackageName);
          cy.wait(3000);
          EHoldingsPackageView.edit();

          EHoldingsNewCustomPackage.fillDateRange(testData.startDate, testData.endDate);
          EHoldingsNewCustomPackage.verifyDateRangeValues(testData.startDate, testData.endDate);
          EHoldingsNewCustomPackage.verifySaveButtonEnabled();
          EHoldingsNewCustomPackage.saveAndClose();
          EHoldingsNewCustomPackage.checkPackageUpdatedCallout();
          cy.wait(3000);
          cy.logout();
        })
        .then(() => {
          cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
            user = userProperties;
            cy.login(user.username, user.password, {
              path: TopMenu.eholdingsPath,
              waiter: EHoldingsTitlesSearch.waitLoading,
            });
          });
          EHoldingSearch.switchToPackages();
          cy.wait(3000);
        });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      if (user && user.userId) {
        Users.deleteViaApi(user.userId);
      }
    });

    it(
      'C422014 Remove "Date range" under "Coverage settings" when editing Selected managed Package (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422014'] },
      () => {
        EHoldingsPackagesSearch.byName(testData.managedPackageName);
        EHoldingsPackages.openPackageWithExpectedName(testData.managedPackageName);

        EHoldingsPackageView.verifyPackageName(testData.managedPackageName);
        EHoldingsPackageView.verifyCoverageDatesSet(
          testData.displayStartDate,
          testData.displayEndDate,
        );
        cy.wait(3000);
        EHoldingsPackageView.edit();

        EHoldingsNewCustomPackage.deleteDateRange();
        EHoldingsNewCustomPackage.verifyNoCoverageDatesMessage();

        EHoldingsNewCustomPackage.saveAndClose();
        EHoldingsNewCustomPackage.checkPackageUpdatedCallout();

        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.managedPackageName);
        EHoldingsPackageView.verifyNoCoveragesDatesSet();
      },
    );
  });
});
