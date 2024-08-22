import Permissions from '../../support/dictionary/permissions';
import { Budgets } from '../../support/fragments/finance';
// Transaction, Helper, FiscalYears, Funds, Ledgers,

import { Invoices } from '../../support/fragments/invoices';
// NewInvoice, NewInvoiceLine, VendorAddress

import { Organizations, NewOrganization } from '../../support/fragments/organizations';
import { BasicOrderLine, NewOrder, Orders } from '../../support/fragments/orders';
import TopMenu from '../../support/fragments/topMenu';
// import Users from '../../support/fragments/users/users';
// import { Approvals } from '../../support/fragments/settings/invoices';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';

describe('Invoices', () => {
  const organization = NewOrganization.getDefaultOrganization();
  const testData = {
    organization,
    order: NewOrder.getDefaultOrder({ vendorId: organization.id }),
    acqUnit: AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: true }),
    user: {},
  };
  // const setApprovePayValue = (isEnabled = false) => {
  //   cy.getAdminToken().then(() => {
  //     Approvals.setApprovePayValue(isEnabled);
  //   });
  // };

  before('Create test data and login', () => {
    cy.getAdminToken();
    AcquisitionUnits.createAcquisitionUnitViaApi(testData.acqUnit).then(() => {
      const { fiscalYear, fund, budget } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        ledger: { acqUnitIds: [testData.acqUnit.id] },
        budget: { allocated: 100 },
      });

      testData.fiscalYear = fiscalYear;
      testData.fund = fund;
      testData.budget = budget;

      Organizations.createOrganizationViaApi(testData.organization).then(() => {
        testData.orderLine = BasicOrderLine.getDefaultOrderLine();

        Orders.createOrderWithOrderLineViaApi(testData.order, testData.orderLine).then((order) => {
          testData.order = order;
        });
      });
    });

    // Organizations.getOrganizationViaApi({ query: `name=${invoice.vendorName}` }).then(
    //   (organization) => {
    //     invoice.accountingCode = organization.erpCode;
    //     Object.assign(
    //       vendorPrimaryAddress,
    //       organization.addresses.find((address) => address.isPrimary === true),
    //     );
    //     cy.getBatchGroups().then((batchGroup) => {
    //       invoice.batchGroup = batchGroup.name;
    //       FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
    //         defaultFiscalYear.id = firstFiscalYearResponse.id;
    //         defaultLedger.fiscalYearOneId = defaultFiscalYear.id;
    //         Ledgers.createViaApi(defaultLedger).then((ledgerResponse) => {
    //           defaultLedger.id = ledgerResponse.id;
    //           defaultFund.ledgerId = defaultLedger.id;

    //           Funds.createViaApi(defaultFund).then((fundResponse) => {
    //             defaultFund.id = fundResponse.fund.id;

    //             cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
    //             Helper.searchByName(defaultFund.name);
    //             Funds.selectFund(defaultFund.name);
    //             Funds.addBudget(allocatedQuantity);
    //             invoiceLine.subTotal = -subtotalValue;
    //             Approvals.setApprovePayValue(isApprovePayEnabled);
    //             cy.visit(TopMenu.invoicesPath);
    //             Invoices.createDefaultInvoice(invoice, vendorPrimaryAddress);
    //             Invoices.createInvoiceLine(invoiceLine);
    //             Invoices.addFundDistributionToLine(invoiceLine, defaultFund);
    //             Invoices.approveInvoice();
    //           });
    //         });
    //       });
    // });

    cy.createTempUser([
      Permissions.uiFinanceViewFundAndBudget.gui,
      Permissions.uiInvoicesApproveInvoices.gui,
      Permissions.viewEditCreateInvoiceInvoiceLine.gui,
      Permissions.uiInvoicesPayInvoices.gui,
      Permissions.uiOrdersView.gui,
      Permissions.uiSettingsAcquisitionUnitsViewEditCreateDelete.gui,
      Permissions.uiSettingsAcquisitionUnitsManageAcqUnitUserAssignments.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.invoicesPath,
        waiter: Invoices.waitLoading,
      });
      // setApprovePayValue(isApprovePayEnabled);
    });
  });

  // after(() => {
  //   cy.getAdminToken();
  //   Users.deleteViaApi(user.userId);
  // });

  it(
    'C446069 Pay invoice related to order with acquisition unit (user is not included into such unit) (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {},
  );
});
