import { Permissions } from '../../../support/dictionary';
import EHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      customPackageName: `C422012_package_${getRandomPostfix()}`,
      startDate: '01/01/2023',
      endDate: '12/31/2023',
    };
    let user;

    before('Create user and login', () => {
      cy.createTempUser([
        Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
      });
    });

    after('Delete user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      EHoldingsPackages.getPackageViaApi(testData.customPackageName).then(({ body }) => {
        if (body.data && body.data[0]) {
          EHoldingsPackages.deletePackageViaAPI(testData.customPackageName);
        }
      });
    });

    it(
      'C422012 Remove "Date range" under "Coverage settings" when creating a new custom Package (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422012'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackages.createNewPackage();
        EHoldingsNewCustomPackage.waitLoading();

        EHoldingsNewCustomPackage.fillInRequiredProperties(testData.customPackageName);

        EHoldingsNewCustomPackage.verifySaveButtonEnabled();
        EHoldingsNewCustomPackage.addDateRange();
        EHoldingsNewCustomPackage.verifyDateRangeFieldsExist();

        EHoldingsNewCustomPackage.fillDateRange(testData.startDate, testData.endDate);
        EHoldingsNewCustomPackage.verifyDateRangeValues(testData.startDate, testData.endDate);

        EHoldingsNewCustomPackage.deleteDateRange();
        EHoldingsNewCustomPackage.verifyDateRangeFieldsAbsent();
        EHoldingsNewCustomPackage.verifyAddDateRangeButtonExists();
        EHoldingsNewCustomPackage.saveAndClose();
        EHoldingsNewCustomPackage.checkPackageCreatedCallout();

        EHoldingsPackageView.waitLoading();
        EHoldingsPackageView.verifyPackageName(testData.customPackageName);
        EHoldingsPackageView.verifyNoCoveragesDatesSet();
      },
    );
  });
});
