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
import NewLocation from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
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
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';
import InteractorsTools from '../../../support/utils/interactorsTools';
import FiscalYearDetails from '../../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import LedgerDetails from '../../../support/fragments/finance/ledgers/ledgerDetails';

describe('Finance: Transactions', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const firstLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: true,
    restrictExpenditures: false,
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
  let user;
  let servicePointId;
  let location;
  let secondOrderNumber;

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
              `$10.00 was successfully transferred to the budget ${secondBudget.name}`,
            );
            Funds.closeBudgetDetails();
            cy.logout();
            cy.getAdminToken();
            ServicePoints.getViaApi().then((servicePoint) => {
              servicePointId = servicePoint[0].id;
              NewLocation.createViaApi(NewLocation.getDefaultLocation(servicePointId)).then(
                (res) => {
                  location = res;

                  MaterialTypes.createMaterialTypeViaApi(
                    MaterialTypes.getDefaultMaterialType(),
                  ).then((mtypes) => {
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
                            locations: [
                              { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                            ],
                            acquisitionMethod: params.body.acquisitionMethods[0].id,
                            physical: {
                              createInventory: 'Instance, Holding, Item',
                              materialType: mtypes.body.id,
                              materialSupplier: responseOrganizations,
                              volumes: [],
                            },
                          };
                          const secondOrderLine = {
                            ...BasicOrderLine.defaultOrderLine,
                            id: uuid(),
                            cost: {
                              listUnitPrice: 116.0,
                              currency: 'USD',
                              discountType: 'percentage',
                              quantityPhysical: 1,
                              poLineEstimatedPrice: 116.0,
                            },
                            fundDistribution: [
                              { code: secondFund.code, fundId: secondFund.id, value: 100 },
                            ],
                            locations: [
                              { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                            ],
                            acquisitionMethod: params.body.acquisitionMethods[0].id,
                            physical: {
                              createInventory: 'Instance, Holding, Item',
                              materialType: mtypes.body.id,
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
                          Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
                            secondOrder.id = secondOrderResponse.id;
                            secondOrderLine.purchaseOrderId = secondOrderResponse.id;
                            secondOrderNumber = secondOrderResponse.poNumber;

                            OrderLines.createOrderLineViaApi(secondOrderLine);
                          });
                        },
                      );
                    });
                  });
                },
              );
            });
          });
        });
      });
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiOrdersEdit.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C496165 Restricted encumbrances are calculated correctly when paid credit invoice exists (thunderjet)',
    { tags: ['criticalPath', 'thunderjet'] },
    () => {
      Orders.searchByParameter('PO number', secondOrderNumber);
      Orders.selectFromResultsList(secondOrderNumber);
      Orders.openOrder();
      OrderLines.selectPOLInOrder();
      OrderLines.openPageCurrentEncumbrance('$116.00');
      Funds.varifyDetailsInTransaction(
        defaultFiscalYear.code,
        '$105.00',
        `${secondOrderNumber}-1`,
        'Encumbrance',
        `${secondFund.name} (${secondFund.code})`,
      );
      Funds.checkStatusInTransactionDetails('Unreleased');
      Funds.closeTransactionDetails();
      Funds.closeMenu();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Initial allocation', value: '$100.00' },
          { key: 'Increase in allocation', value: '$0.00' },
          { key: 'Decrease in allocation', value: '$0.00' },
          { key: 'Total allocated', value: '$100.00' },
          { key: 'Net transfers', value: '$10.00' },
          { key: 'Total funding', value: '$110.00' },
          { key: 'Encumbered', value: '$126.00' },
          { key: 'Awaiting payment', value: '$15.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Credited', value: '$20.00' },
          { key: 'Unavailable', value: '$121.00' },
          { key: 'Over encumbrance', value: '$11.00' },
          { key: 'Over expended', value: '$0.00' },
        ],
        balance: { cash: '$130.00', available: '-$11.00' },
      });
      Funds.closeBudgetDetails();
      FinanceHelp.clickFiscalYearButton();
      FinanceHelp.searchByName(defaultFiscalYear.name);
      FiscalYears.selectFisacalYear(defaultFiscalYear.name);
      FiscalYearDetails.checkFinancialSummary({
        summary: [
          { key: 'Initial allocation', value: '$200.00' },
          { key: 'Total allocated', value: '$200.00' },
          { key: 'Total funding', value: '$200.00' },
          { key: 'Encumbered', value: '$126.00' },
          { key: 'Awaiting payment', value: '$15.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Credited', value: '$20.00' },
          { key: 'Unavailable', value: '$121.00' },
          { key: 'Over encumbrance', value: '$11.00' },
          { key: 'Over expended', value: '$0.00' },
        ],
        balance: { cash: '$220.00', available: '$79.00' },
      });
      FinanceHelp.clickLedgerButton();
      FinanceHelp.searchByName(firstLedger.name);
      Ledgers.selectLedger(firstLedger.name);
      LedgerDetails.checkFinancialSummary({
        summary: [
          { key: 'Initial allocation', value: '$200.00' },
          { key: 'Increase in allocation', value: '$0.00' },
          { key: 'Decrease in allocation', value: '$0.00' },
          { key: 'Total allocated', value: '$200.00' },
          { key: 'Net transfers', value: '$0.00' },
          { key: 'Total funding', value: '$200.00' },
          { key: 'Encumbered', value: '$126.00' },
          { key: 'Awaiting payment', value: '$15.00' },
          { key: 'Expended', value: '$0.00' },
          { key: 'Credited', value: '$20.00' },
          { key: 'Unavailable', value: '$121.00' },
          { key: 'Over encumbrance', value: '$.00' },
          { key: 'Over expended', value: '$0.00' },
        ],
        balance: { cash: '$220.00', available: '$79.00' },
      });
    },
  );
});