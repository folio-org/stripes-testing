import { Permissions } from '../../../support/dictionary';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Fiscal Year', () => {
    const firstFiscalYear = {
      ...FiscalYears.getDefaultFiscalYear(),
      name: `autotest_year_1_C451608_${getRandomPostfix()}`,
    };
    const secondFiscalYear = {
      ...FiscalYears.getDefaultFiscalYear(),
      name: `autotest_year_2_C451608_${getRandomPostfix()}`,
    };
    const testData = {
      expectedTitles: {
        default: 'Finance - FOLIO',
        afterSearch: (name) => `Finance - ${name} - Search - FOLIO`,
        afterSelectRecord: (name) => `Finance - ${name} - FOLIO`,
      },
    };

    before('Create test data', () => {
      cy.getAdminToken();
      FiscalYears.createViaApi(firstFiscalYear).then((response) => {
        firstFiscalYear.id = response.id;
      });
      FiscalYears.createViaApi(secondFiscalYear).then((response) => {
        secondFiscalYear.id = response.id;
      });

      cy.createTempUser([Permissions.uiFinanceViewFiscalYear.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.fiscalYearPath,
          waiter: FiscalYears.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      if (testData.user?.userId) Users.deleteViaApi(testData.user.userId);
      if (firstFiscalYear.id) FiscalYears.deleteFiscalYearViaApi(firstFiscalYear.id);
      if (secondFiscalYear.id) FiscalYears.deleteFiscalYearViaApi(secondFiscalYear.id);
    });

    it(
      'C451608 Correct page title when Fiscal Year details pane is opened ("Finance" app) (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C451608'] },
      () => {
        FiscalYears.checkPageTitle(testData.expectedTitles.default);

        FiscalYears.fillSearchField(firstFiscalYear.name);
        FiscalYears.checkPageTitle(testData.expectedTitles.default);

        FiscalYears.clickSearchButton();
        FiscalYears.checkSearchResults(firstFiscalYear.name);
        FiscalYears.checkPageTitle(testData.expectedTitles.afterSearch(firstFiscalYear.name));

        FiscalYears.selectFY(firstFiscalYear.name);
        FiscalYears.checkPageTitle(testData.expectedTitles.afterSelectRecord(firstFiscalYear.name));

        FiscalYears.closeThirdPane();
        FiscalYears.checkPageTitle(testData.expectedTitles.afterSearch(firstFiscalYear.name));

        FiscalYears.resetFilters();
        FiscalYears.checkPageTitle(testData.expectedTitles.default);

        FiscalYears.openAcquisitionAccordion();
        FiscalYears.selectAcquisitionUnitFilter('No acquisition unit');
        FiscalYears.checkPageTitle(testData.expectedTitles.default);

        FiscalYears.fillSearchField(firstFiscalYear.name);
        FiscalYears.clickSearchButton();
        FiscalYears.checkSearchResults(firstFiscalYear.name);
        FiscalYears.selectFY(firstFiscalYear.name);
        FiscalYears.checkPageTitle(testData.expectedTitles.afterSelectRecord(firstFiscalYear.name));

        FiscalYears.closeThirdPane();
        FiscalYears.resetFilters();
        FiscalYears.openAcquisitionAccordion();
        FiscalYears.selectAcquisitionUnitFilter('No acquisition unit');
        FiscalYears.fillSearchField(secondFiscalYear.name);
        FiscalYears.clickSearchButton();
        FiscalYears.checkSearchResults(secondFiscalYear.name);
        FiscalYears.selectFY(secondFiscalYear.name);
        FiscalYears.checkPageTitle(
          testData.expectedTitles.afterSelectRecord(secondFiscalYear.name),
        );
      },
    );
  });
});
