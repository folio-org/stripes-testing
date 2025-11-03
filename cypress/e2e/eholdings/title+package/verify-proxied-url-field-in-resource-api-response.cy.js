import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      packageName: 'Anthrosource (Wiley)',
      titleName: 'Annals of Anthropological Practice',
      selectedStatus: 'Selected',
    };

    before('Create user and login', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.moduleeHoldingsEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingSearch.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C387517 Verify that "proxiedUrl" field is displayed when at "Package+Title" ("Resource") record (response check) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C387517'] },
      () => {
        EHoldingSearch.switchToPackages();
        EHoldingsPackagesSearch.byName(testData.packageName);
        EHoldingsPackages.verifyListOfExistingPackagesIsDisplayed();

        EHoldingsPackagesSearch.bySelectionStatus(testData.selectedStatus);
        EHoldingsPackages.openPackageWithExpectedName(testData.packageName);
        EHoldingsPackage.waitLoading(testData.packageName);

        cy.intercept('GET', '**/eholdings/resources/*').as('getResource');

        EHoldingsPackage.openTitle(testData.titleName);

        cy.wait('@getResource').then((interception) => {
          const response = interception.response;

          expect(response.statusCode).to.eq(200);
          expect(response.body).to.have.property('data');
          expect(response.body.data).to.have.property('attributes');

          const attributes = response.body.data.attributes;

          expect(attributes).to.have.property('url');
          expect(attributes).to.have.property('proxy');
          expect(attributes.proxy).to.be.an('object');

          expect(attributes.proxy).to.have.property('proxiedUrl');

          expect(attributes.proxy.proxiedUrl).to.be.a('string');
        });
      },
    );
  });
});
