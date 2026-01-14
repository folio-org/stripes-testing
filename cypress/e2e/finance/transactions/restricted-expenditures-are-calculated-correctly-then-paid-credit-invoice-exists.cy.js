import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Invoices from '../../../support/fragments/invoices/invoices';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';
import InvoiceLineDetails from '../../../support/fragments/invoices/invoiceLineDetails';
import InteractorsTools from '../../../support/utils/interactorsTools';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import { Permissions } from '../../../support/dictionary';

describe('Finance: Transactions', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const firstLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: true,
  };
  const firstFund = { ...Funds.defaultUiFund };
  const secondFund = {
    name: `autotest_fund2_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    externalAccountNo: getRandomPostfix(),
    fundStatus: 'Active',
    description: `This is fund created by E2E test automation script_${getRandomPostfix()}`,
  };
  const firstOrder = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };
  const secondOrder = {
    id: uuid(),
    vendor: '',
    orderType: 'One-Time',
    approved: true,
    reEncumber: true,
  };
  const firstBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
    allowableEncumbrance: 100,
    allowableExpenditure: 100,
  };
  const secondBudget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
    allowableEncumbrance: 110,
    allowableExpenditure: 110,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let firstInvoice;
  let secondInvoice;
  let thirdInvoice;
  let user;
  let location;

  before(() => {
    cy.getAdminToken();
    // create first Fiscal Year and prepere 2 Funds for Rollover
    FiscalYears.createViaApi(defaultFiscalYear).then((firstFiscalYearResponse) => {
      defaultFiscalYear.id = firstFiscalYearResponse.id;
      firstBudget.fiscalYearId = firstFiscalYearResponse.id;
      secondBudget.fiscalYearId = firstFiscalYearResponse.id;
      firstLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
        firstLedger.id = ledgerResponse.id;
        firstFund.ledgerId = firstLedger.id;
        secondFund.ledgerId = firstLedger.id;

        Funds.createViaApi(firstFund).then((fundResponse) => {
          firstFund.id = fundResponse.fund.id;
          firstBudget.fundId = fundResponse.fund.id;
          Budgets.createViaApi(firstBudget);

          Funds.createViaApi(secondFund).then((secondFundResponse) => {
            secondFund.id = secondFundResponse.fund.id;
            secondBudget.fundId = secondFundResponse.fund.id;
            Budgets.createViaApi(secondBudget);
            cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
            FinanceHelp.searchByName(secondFund.name);
            Funds.selectFund(secondFund.name);
            Funds.selectBudgetDetails();
            Funds.transfer(secondFund, firstFund);
            InteractorsTools.checkCalloutMessage(
              `$10.00 was successfully transferred to the budget ${secondBudget.name}.`,
            );
            Funds.closeBudgetDetails();
            cy.logout();
            cy.getAdminToken();

            cy.getLocations({ limit: 1 }).then((res) => {
              location = res;

              cy.getDefaultMaterialType().then((mtype) => {
                cy.getAcquisitionMethodsApi({
                  query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                }).then((params) => {
                  // Prepare 2 Open Orders for Rollover
                  Organizations.createOrganizationViaApi(organization).then(
                    (responseOrganizations) => {
                      organization.id = responseOrganizations;
                      firstOrder.vendor = organization.id;
                      secondOrder.vendor = organization.id;
                      const firstOrderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        cost: {
                          listUnitPrice: 10,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 1,
                          poLineEstimatedPrice: 10,
                        },
                        fundDistribution: [
                          { code: secondFund.code, fundId: secondFund.id, value: 100 },
                        ],
                        locations: [{ locationId: location.id, quantity: 1, quantityPhysical: 1 }],
                        acquisitionMethod: params.body.acquisitionMethods[0].id,
                        physical: {
                          createInventory: 'Instance, Holding, Item',
                          materialType: mtype.id,
                          materialSupplier: responseOrganizations,
                          volumes: [],
                        },
                      };

                      Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                        firstOrder.id = firstOrderResponse.id;
                        firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                        OrderLines.createOrderLineViaApi(firstOrderLine);
                        Orders.updateOrderViaApi({
                          ...firstOrderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                      });
                      Invoices.createInvoiceWithInvoiceLineViaApi({
                        vendorId: organization.id,
                        fiscalYearId: defaultFiscalYear.id,
                        fundDistributions: firstOrderLine.fundDistribution,
                        accountingCode: organization.erpCode,
                        releaseEncumbrance: true,
                        subTotal: 15,
                      }).then((invoiceResponse) => {
                        firstInvoice = invoiceResponse;

                        Invoices.changeInvoiceStatusViaApi({
                          invoice: firstInvoice,
                          status: INVOICE_STATUSES.APPROVED,
                        });
                      });

                      Invoices.createInvoiceWithInvoiceLineViaApi({
                        vendorId: organization.id,
                        fiscalYearId: defaultFiscalYear.id,
                        fundDistributions: firstOrderLine.fundDistribution,
                        accountingCode: organization.erpCode,
                        releaseEncumbrance: true,
                        subTotal: -20,
                      }).then((secondInvoiceResponse) => {
                        secondInvoice = secondInvoiceResponse;

                        Invoices.changeInvoiceStatusViaApi({
                          invoice: secondInvoice,
                          status: INVOICE_STATUSES.PAID,
                        });
                      });
                      Invoices.createInvoiceWithInvoiceLineViaApi({
                        vendorId: organization.id,
                        fiscalYearId: defaultFiscalYear.id,
                        fundDistributions: firstOrderLine.fundDistribution,
                        accountingCode: organization.erpCode,
                        releaseEncumbrance: true,
                        subTotal: 126,
                      }).then((thirdInvoiceResponse) => {
                        thirdInvoice = thirdInvoiceResponse;
                      });
                    },
                  );
                });
              });
            });
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
      permissions.uiInvoicesPayInvoices.gui,
      Permissions.invoiceSettingsAll.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.settingsInvoiveApprovalPath,
          waiter: SettingsInvoices.waitApprovalsLoading,
        });
      }, 20_000);
      SettingsInvoices.uncheckApproveAndPayCheckboxIfChecked();
      cy.visit(TopMenu.invoicesPath);
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C496163 Restricted expenditures are calculated correctly when paid credit invoice exists (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C496163'] },
    () => {
      Invoices.searchByNumber(thirdInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(thirdInvoice.vendorInvoiceNo);
      Invoices.approveInvoice();
      Invoices.selectInvoiceLine();
      InvoiceLineDetails.openFundDetailsPane(secondFund.name);
      Funds.selectBudgetDetails();
      Funds.viewTransactions();
      Funds.verifyTransactionWithAmountExist('Pending payment', '$126.00');
      Funds.closePaneHeader();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Initial allocation', value: '$100.00' },
          { key: 'Increase in allocation', value: '$0.00' },
          { key: 'Decrease in allocation', value: '$0.00' },
          { key: 'Total allocated', value: '$100.00' },
          { key: 'Net transfers', value: '$10.00' },
          { key: 'Total funding', value: '$110.00' },
          { key: 'Encumbered', value: '$10.00' },
          { key: 'Awaiting payment', value: '$141.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Credited', value: '$20.00' },
          { key: 'Unavailable', value: '$131.00' },
          { key: 'Over encumbrance', value: '$10.00' },
          { key: 'Over expended', value: '$11.00' },
        ],
        balance: { cash: '$130.00', available: '($21.00)' },
      });
    },
  );
});
