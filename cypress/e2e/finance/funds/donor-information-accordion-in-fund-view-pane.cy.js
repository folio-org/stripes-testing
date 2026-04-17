import { Permissions } from '../../../support/dictionary';
import { FiscalYears, Funds, Ledgers } from '../../../support/fragments/finance';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import FundEditForm from '../../../support/fragments/finance/funds/fundEditForm';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Funds', () => {
    const organizations = [
      NewOrganization.getDefaultOrganization({ isDonor: true, isVendor: false }),
      NewOrganization.getDefaultOrganization({ isDonor: true, isVendor: false }),
      NewOrganization.getDefaultOrganization({ isDonor: true, isVendor: false }),
    ];
    const fiscalYear = FiscalYears.getDefaultFiscalYear();
    const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYear.id };
    const fund = {
      ...Funds.getDefaultFund(),
      ledgerId: ledger.id,
    };
    const testData = {
      organizations,
      fiscalYear,
      ledger,
      fund,
      user: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        testData.organizations.forEach((org) => {
          Organizations.createOrganizationViaApi(org);
        });
        FiscalYears.createViaApi(testData.fiscalYear);
        Ledgers.createViaApi(testData.ledger);
        Funds.createViaApi(testData.fund);
      });

      cy.createTempUser([Permissions.uiFinanceViewEditFundAndBudget.gui]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        Funds.deleteFundViaApi(testData.fund.id);
        Ledgers.deleteLedgerViaApi(testData.ledger.id);
        FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
        testData.organizations.forEach((org) => {
          Organizations.deleteOrganizationViaApi(org.id);
        });
        Users.deleteViaApi(testData.user.userId);
      });
    });

    it(
      'C805750 Donor Information accordion appears in Fund view pane (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C805750'] },
      () => {
        Funds.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);
        FundDetails.checkDonorInformationSection({ visible: false });

        FundDetails.openFundEditForm();
        FundEditForm.checkSectionsConditions([
          { sectionName: 'Donor information', conditions: { expanded: false } },
        ]);

        FundEditForm.expandDonorInformationSection();
        FundEditForm.checkDonorInformationSectionContent();

        FundEditForm.fillDonorInfoSectionFields({
          donorName: testData.organizations[0].name,
          shouldExpand: false,
        });
        FundEditForm.checkDonorInformationSectionContent({
          donors: [
            {
              name: testData.organizations[0].name,
              code: testData.organizations[0].code,
            },
          ],
          hasViewPermissions: false,
        });
        FundEditForm.checkButtonsConditions([
          { label: 'Add donor', conditions: { disabled: false } },
        ]);

        FundEditForm.clickSaveAndCloseButton();
        FundDetails.checkDonorInformationSection({
          donors: [
            {
              name: testData.organizations[0].name,
              code: testData.organizations[0].code,
            },
          ],
        });

        FundDetails.openFundEditForm();
        FundEditForm.expandDonorInformationSection();

        FundEditForm.fillDonorInfoSectionFields({
          donorName: testData.organizations[1].name,
          shouldExpand: false,
        });
        FundEditForm.fillDonorInfoSectionFields({
          donorName: testData.organizations[2].name,
          shouldExpand: false,
        });
        const allThreeDonors = [...testData.organizations]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ name, code }) => ({ name, code }));
        FundEditForm.checkDonorInformationSectionContent({
          donors: allThreeDonors,
          hasViewPermissions: false,
        });
        FundEditForm.checkButtonsConditions([
          { label: 'Add donor', conditions: { disabled: false } },
        ]);

        FundEditForm.unassignDonorFromFund(testData.organizations[0].name);
        const remainingTwoDonors = [testData.organizations[1], testData.organizations[2]]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ name, code }) => ({ name, code }));
        FundEditForm.checkDonorInformationSectionContent({
          donors: remainingTwoDonors,
          hasViewPermissions: false,
        });

        FundEditForm.clickSaveAndCloseButton();
        FundDetails.checkDonorInformationSection({
          donors: remainingTwoDonors,
        });

        FundDetails.openFundEditForm();
        FundEditForm.expandDonorInformationSection();
        FundEditForm.unassignDonorFromFund(testData.organizations[1].name);
        FundEditForm.unassignDonorFromFund(testData.organizations[2].name);
        FundEditForm.checkDonorInformationSectionContent();

        FundEditForm.clickSaveAndCloseButton();
        FundDetails.checkDonorInformationSection({ visible: false });
      },
    );
  });
});
