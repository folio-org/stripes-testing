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
import Approvals from '../../../support/fragments/settings/invoices/approvals';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';

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
  const isApprovePayDisabled = false;
  let firstInvoice;
  let secondInvoice;
  let thirdInvoice;
  let user;
  let location;
  let secondOrderNumber;

  before(() => {
    cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading, authRefresh: true });
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
            FinanceHelp.searchByName(secondFund.name);
            Funds.selectFund(secondFund.name);
            Funds.selectBudgetDetails();
            Funds.transfer(secondFund, firstFund);
            Funds.closeBudgetDetails();
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
                      const secondOrderLine = {
                        ...BasicOrderLine.defaultOrderLine,
                        id: uuid(),
                        cost: {
                          listUnitPrice: 87.0,
                          currency: 'USD',
                          discountType: 'percentage',
                          quantityPhysical: 1,
                          poLineEstimatedPrice: 87.0,
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
                        subTotal: 20,
                      }).then((secondInvoiceResponse) => {
                        secondInvoice = secondInvoiceResponse;

                        Invoices.changeInvoiceStatusViaApi({
                          invoice: secondInvoice,
                          status: INVOICE_STATUSES.PAID,
                        });
                      });
                      Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
                        secondOrder.id = secondOrderResponse.id;
                        secondOrderLine.purchaseOrderId = secondOrderResponse.id;
                        secondOrderNumber = secondOrderResponse.poNumber;

                        OrderLines.createOrderLineViaApi(secondOrderLine);
                        Orders.updateOrderViaApi({
                          ...secondOrderResponse,
                          workflowStatus: ORDER_STATUSES.OPEN,
                        });
                        cy.wait(10000);
                        Invoices.createInvoiceWithInvoiceLineViaApi({
                          vendorId: organization.id,
                          fiscalYearId: defaultFiscalYear.id,
                          poLineId: secondOrderLine.id,
                          fundDistributions: secondOrderLine.fundDistribution,
                          accountingCode: organization.erpCode,
                          releaseEncumbrance: true,
                          subTotal: 87,
                        }).then((thirdInvoiceResponse) => {
                          thirdInvoice = thirdInvoiceResponse;
                        });
                      });
                    },
                  );
                });
              });
              cy.visit(TopMenu.settingsInvoiveApprovalPath);
              SettingsInvoices.checkApproveAndPayCheckboxIfNeeded();
            });
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiInvoicesApproveInvoices.gui,
      permissions.uiInvoicesPayInvoices.gui,
      permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.waitForAuthRefresh(() => {
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      }, 20_000);
    });
  });

  after(() => {
    cy.getAdminToken();
    Approvals.setApprovePayValue(isApprovePayDisabled);
    Users.deleteViaApi(user.userId);
  });

  it(
    'C449368 Invoice can NOT be paid when invoice amount exceeding remaining allowed expenditures (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C449368'] },
    () => {
      Invoices.searchByNumber(thirdInvoice.vendorInvoiceNo);
      Invoices.selectInvoice(thirdInvoice.vendorInvoiceNo);
      Invoices.canNotApproveAndPayInvoice(
        `One or more Fund distributions on this invoice can not be paid, because there is not enough money in [${secondFund.code}].`,
      );
      Invoices.selectInvoiceLine();
      Invoices.openPageCurrentEncumbrance('$87.00');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '($87.00)',
        `${secondOrderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
    },
  );
});
