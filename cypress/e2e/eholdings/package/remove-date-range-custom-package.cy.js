import { Permissions } from '../../../support/dictionary';
import EHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      customPackageName: `C422013_package_${getRandomPostfix()}`,
      startDate: '01/01/2023',
      endDate: '12/31/2023',
      displayStartDate: '1/1/2023',
      displayEndDate: '12/31/2023',
    };
    let user;

    before('Create package via API and setup user', () => {
      cy.getAdminToken().then(() => {
        EHoldingsPackages.createPackageViaAPI({
          data: {
            type: 'packages',
            attributes: {
              name: testData.customPackageName,
              contentType: 'E-Book',
              customCoverage: {
                beginCoverage: '2023-01-01',
                endCoverage: '2023-12-31',
              },
            },
          },
        });
      });
      cy.createTempUser([
        Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
      });
    });

    after('Delete user and test data', () => {
      cy.getAdminToken();
      EHoldingsPackages.deletePackageViaAPI(testData.customPackageName);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C422013 Remove "Date range" under "Coverage settings" when editing Selected custom Package (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422013'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.customPackageName);
        cy.wait(3000);
        EHoldingsPackages.openPackage();
        EHoldingsPackageView.verifyPackageName(testData.customPackageName);
        EHoldingsPackageView.verifyCoverageDatesSet(
          testData.displayStartDate,
          testData.displayEndDate,
        );
        cy.wait(2000);
        EHoldingsPackageView.edit();

        EHoldingsNewCustomPackage.deleteDateRange();
        EHoldingsNewCustomPackage.verifyDateRangeFieldsAbsent();
        EHoldingsNewCustomPackage.verifyAddDateRangeButtonExists();

        EHoldingsNewCustomPackage.saveAndClose();

        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.customPackageName);
        EHoldingsPackageView.verifyNoCoveragesDatesSet();
      },
    );
  });
});
