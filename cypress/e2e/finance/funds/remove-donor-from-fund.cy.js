import { Permissions } from '../../../support/dictionary';
import { FiscalYears, Funds, Ledgers } from '../../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FundEditForm from '../../../support/fragments/finance/funds/fundEditForm';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';

describe('Finance', () => {
  describe('Funds', () => {
    const organization = NewOrganization.getDefaultOrganization({
      isDonor: true,
      isVendor: false,
    });
    const fiscalYear = FiscalYears.getDefaultFiscalYear();
    const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYear.id };
    const fund = {
      ...Funds.getDefaultFund(),
      ledgerId: ledger.id,
      donorOrganizationIds: [organization.id],
    };
    const testData = {
      organization,
      fiscalYear,
      ledger,
      fund,
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        Organizations.createOrganizationViaApi(testData.organization);
        FiscalYears.createViaApi(testData.fiscalYear);
        Ledgers.createViaApi(testData.ledger);
        Funds.createViaApi(testData.fund);
      });

      cy.createTempUser([Permissions.uiFinanceViewEditCreateFundAndBudget.gui]).then(
        (userProperties) => {
          testData.user = userProperties;

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
            authRefresh: true,
          });
        },
      );
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Funds.deleteFundViaApi(testData.fund.id);
        Ledgers.deleteLedgerViaApi(testData.ledger.id);
        FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
        Organizations.deleteOrganizationViaApi(testData.organization.id);
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C422212 Remove donor from fund (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C422212'] },
      () => {
        // Open Fund from Preconditions
        Funds.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);

        // Click on "Actions" button, Select "Edit" option
        FundDetails.openFundEditForm();

        // Expand "Donor information" accordion
        FundEditForm.expandDonorInformationSection();
        FundEditForm.checkDonorInformationSectionContent({
          donors: [{ name: testData.organization.name, code: testData.organization.code }],
          hasViewPermissions: false,
        });

        // Click "X" button next to the donor record
        FundEditForm.unassignDonorFromFund(testData.organization.name);
        FundEditForm.checkDonorInformationSectionContent();

        // Click "Save & close" button on "<Fund name>" page
        FundEditForm.clickSaveAndCloseButton();

        // Click on "Actions" button, Select "Edit" option
        FundDetails.openFundEditForm();

        // Expand "Donor information" accordion
        FundEditForm.expandDonorInformationSection();
        FundEditForm.checkDonorInformationSectionContent();
      },
    );
  });
});
