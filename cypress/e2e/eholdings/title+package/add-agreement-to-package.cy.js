import { Permissions } from '../../../support/dictionary';
import { EHoldingsTitles, EHoldingsTitlesSearch } from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Title+Package', () => {
    const testData = {
      agreement: 'Default Agreement',
      title: 'Fish Biology',
      titleId: '',
      titleName: '',
      titlePackages: [],
      user: {},
    };

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.uiAgreementsAgreementsEdit.gui,
        Permissions.uiAgreementsSearchAndView.gui,
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uiSettingsEHoldingsViewAccessStatusTypes.gui,
        Permissions.uiSettingsEHoldingsViewCustomLabel.gui,
        Permissions.uiSettingsEHoldingsViewSettings.gui,
        Permissions.uiAgreementsSearch.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        EHoldingsTitles.getEHoldingsTitlesByTitleNameViaApi({ titleName: testData.title }).then(
          (response) => {
            const title = response.data[0];

            testData.titleId = title.id;
            testData.titleName = title.attributes.name;
            testData.titlePackages = title.included.map(({ attributes }) => ({
              packageId: attributes.packageId,
              packageName: attributes.packageName,
            }));
          },
        );

        cy.login(testData.user.username, testData.user.password, {
          path: `${TopMenu.eholdingsPath}?searchType=titles`,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C752 Add an "Agreement" and attach a title in a package (spitfire) (TaaS)',
      { tags: ['extendedPath', 'spitfire'] },
      () => {
        // Fill in the search box with the title of any "Title" record, Click on the "Search" button.
        EHoldingsTitlesSearch.byTitle(testData.title);
        EHoldingsTitles.verifyListOfExistingPackagesIsDisplayed();

        // Open any "Title" record by clicking on it in the result list
        const EHoldingsTitle = EHoldingsTitles.openTitlePackagesView({
          titleId: testData.titleId,
          titleName: testData.titleName,
        });
        EHoldingsTitle.checkPackagesSectionContent({ packages: testData.titlePackages });

        // Click on the "magnifying glass" icon placed on the "Packages" accordion.
        const FilterPackagesModal = EHoldingsTitle.openFilterPackagesModal();

        // Enter the title of any "Package" in the input, Click on the "Search button.
        const packageName = testData.titlePackages[0].packageName;
        FilterPackagesModal.selectPackageName(packageName);
        FilterPackagesModal.clickSearchButton();
        EHoldingsTitle.checkPackagesSectionContent({ packages: [{ packageName }] });

        // Click on the "Package" record which is displayed under the "Packages" accordion.
        const EHoldingsResourceView = EHoldingsTitle.openPackage({
          packageName,
          titleName: testData.titleName,
        });

        // Go to "Agreements" accordion and click on the "Add" button.
        const SelectAgreementModal = EHoldingsResourceView.openSelectAgreementModal();

        // Select any "Agreement" record in the appeared modal.
        SelectAgreementModal.searchByName(testData.agreement);
        SelectAgreementModal.selectAgreement({ name: testData.agreement });
        EHoldingsResourceView.checkAgreementsTableContent({
          records: [{ status: 'Active', name: testData.agreement }],
        });

        // Go to the "Settings >> eHoldings" by using the navigation bar.
        TopMenuNavigation.navigateToApp('Settings', 'eHoldings');

        // Go back to the "eHoldings" app by using the navigation bar.
        TopMenuNavigation.navigateToApp('eHoldings');
        EHoldingsResourceView.checkNames(packageName, testData.titleName);

        //  Close the detail view of "Title+Package" record by clicking on the "X" icon.
        EHoldingsResourceView.closeHoldingsResourceView();
        EHoldingsTitle.waitLoading(testData.titleName);

        // Close the detail view of "Title" record by clicking on the "X" icon.
        EHoldingsTitle.closeHoldingsTitleView();
      },
    );
  });
});
