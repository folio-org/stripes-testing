import { Permissions } from '../../../support/dictionary';
import { FiscalYears, Funds, Ledgers } from '../../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FundEditForm from '../../../support/fragments/finance/funds/fundEditForm';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';

describe('Finance', () => {
  const fiscalYear = FiscalYears.getDefaultFiscalYear();
  const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYear.id };
  const testData = {
    organization: NewOrganization.getDefaultOrganization({
      isDonor: true,
      isVendor: false,
    }),
    fiscalYear,
    ledger,
    user: {},
  };

  before('Create test data', () => {
    cy.getAdminToken().then(() => {
      Organizations.createOrganizationViaApi(testData.organization);
      FiscalYears.createViaApi(testData.fiscalYear);
      Ledgers.createViaApi(testData.ledger);
    });

    cy.createTempUser([
      Permissions.uiFinanceViewEditCreateFundAndBudget.gui,
      Permissions.uiOrganizationsView.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Ledgers.deleteLedgerViaApi(testData.ledger.id);
      FiscalYears.deleteFiscalYearViaApi(testData.fiscalYear.id);
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });
  });

  describe('Funds', () => {
    testData.fund = { ...Funds.getDefaultFund(), ledgerId: ledger.id };

    before('Login', () => {
      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
        authRefresh: true,
      });
    });

    after('Delete test Fund', () => {
      cy.getAdminToken().then(() => {
        Funds.deleteFundsByLedgerIdViaApi(testData.ledger.id);
      });
    });

    it(
      'C422161 Add donor information to a new Fund (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C422161'] },
      () => {
        // On "Fund" page of "Finance" app click on "New" button
        Funds.clickCreateNewFundButton();

        // Fill all mandatory fields in "Fund information" accordion
        FundEditForm.fillFundFields({
          fundInfo: {
            ...testData.fund,
            ledger: testData.ledger.name,
          },
        });
        FundEditForm.checkButtonsConditions([
          { label: 'Save & close', conditions: { disabled: false } },
        ]);

        // Expand "Donor information" accordion by clicking on it
        FundEditForm.expandDonorInformationSection();
        FundEditForm.checkButtonsConditions([
          { label: 'Add donor', conditions: { disabled: false } },
        ]);

        // Click on "Add donor" button
        const AddDonorsModal = FundEditForm.clickAddDonnorsButton();

        // Check the checkbox next to a donor organization
        AddDonorsModal.searchByName(testData.organization.name);
        AddDonorsModal.selectCheckboxFromResultsList([testData.organization.name]);

        // Click "Close" button on "Add donors" modal
        AddDonorsModal.clickCloseButton();
        FundEditForm.checkDonorInformationSectionContent();

        // Click on "Add donor" button, Check the checkbox next to a donor organization, Click "Save" button
        FundEditForm.fillDonorInfoSectionFields({
          donorName: testData.organization.name,
          shouldExpand: false,
        });
        FundEditForm.checkDonorInformationSectionContent({
          donors: [{ name: testData.organization.name, code: testData.organization.code }],
        });

        // Click on "Save & close" button on "Create fund" page
        FundEditForm.clickSaveAndCloseButton();
      },
    );
  });

  describe('Funds', () => {
    testData.fund = { ...Funds.getDefaultFund(), ledgerId: ledger.id };

    before('Create test Fund', () => {
      cy.getAdminToken().then(() => {
        Funds.createViaApi(testData.fund);
      });

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
        authRefresh: true,
      });
    });

    after('Delete test Fund', () => {
      cy.getAdminToken().then(() => {
        Funds.deleteFundViaApi(testData.fund.id);
      });
    });

    it(
      'C422162 Add donor information to an existing fund (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C422162'] },
      () => {
        // Open Fund from Preconditions
        Funds.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);

        // Click on "Actions" button, Select "Edit" option
        FundDetails.openFundEditForm();

        // Click on "Add donor" button, Check the checkbox next to a donor organization, Click "Save" button
        FundEditForm.fillDonorInfoSectionFields({ donorName: testData.organization.name });
        FundEditForm.checkDonorInformationSectionContent({
          donors: [{ name: testData.organization.name, code: testData.organization.code }],
        });

        // Click on "Save & close" button on "Create fund" page
        FundEditForm.clickSaveAndCloseButton();
      },
    );
  });

  describe('Funds', () => {
    testData.fund = { ...Funds.getDefaultFund(), ledgerId: ledger.id };

    before('Create test Fund', () => {
      cy.getAdminToken().then(() => {
        Funds.createViaApi(testData.fund);
      });

      cy.createTempUser([Permissions.uiFinanceViewEditCreateFundAndBudget.gui]).then(
        (userProperties) => {
          testData.userWoPermissions = userProperties;

          cy.login(testData.userWoPermissions.username, testData.userWoPermissions.password, {
            path: TopMenu.fundPath,
            waiter: Funds.waitLoading,
            authRefresh: true,
          });
        },
      );
    });

    after('Delete test Fund', () => {
      cy.getAdminToken().then(() => {
        Funds.deleteFundViaApi(testData.fund.id);
        Users.deleteViaApi(testData.userWoPermissions.userId);
      });
    });

    it(
      'C422194 Adding donor information to existing fund with permission restrictions (thunderjet) (TaaS)',
      { tags: ['criticalPath', 'thunderjet', 'C422194'] },
      () => {
        // Open Fund from Preconditions
        Funds.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);

        // Click on "Actions" button, Select "Edit" option
        FundDetails.openFundEditForm();

        // Click on "Add donor" button, Check the checkbox next to a donor organization, Click "Save" button
        FundEditForm.fillDonorInfoSectionFields({ donorName: testData.organization.name });
        FundEditForm.checkDonorInformationSectionContent({
          donors: [{ name: testData.organization.name, code: testData.organization.code }],
          hasViewPermissions: false,
        });

        // Click on "Save & close" button on "Create fund" page
        FundEditForm.clickSaveAndCloseButton();
      },
    );
  });
});
