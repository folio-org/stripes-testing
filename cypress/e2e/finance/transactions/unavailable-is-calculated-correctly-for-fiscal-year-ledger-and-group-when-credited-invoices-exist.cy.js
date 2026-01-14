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
import Groups from '../../../support/fragments/finance/groups/groups';
import FiscalYearDetails from '../../../support/fragments/finance/fiscalYears/fiscalYearDetails';
import LedgerDetails from '../../../support/fragments/finance/ledgers/ledgerDetails';
import { GroupDetails } from '../../../support/fragments/finance';

describe('Finance: Funds', () => {
  const defaultFiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const defaultGroup = { ...Groups.defaultUiGroup };
  const firstLedger = {
    ...Ledgers.defaultUiLedger,
    restrictEncumbrance: false,
    restrictExpenditures: false,
  };
  const secondLedger = {
    name: `autotest_ledger_${getRandomPostfix()}`,
    ledgerStatus: 'Active',
    code: `test_automation_code_${getRandomPostfix()}`,
    description: 'This is ledger created by E2E test automation script',
    restrictEncumbrance: false,
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
    allowableEncumbrance: 100,
    allowableExpenditure: 100,
  };
  const organization = { ...NewOrganization.defaultUiOrganizations };
  let firstInvoice;
  let secondInvoice;
  let thirdInvoice;
  let forthInvoice;
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
      secondLedger.fiscalYearOneId = defaultFiscalYear.id;
      Ledgers.createViaApi(firstLedger).then((ledgerResponse) => {
        firstLedger.id = ledgerResponse.id;
        firstFund.ledgerId = firstLedger.id;
        Ledgers.createViaApi(secondLedger).then((secondLedgerResponse) => {
          secondLedger.id = secondLedgerResponse.id;
          secondFund.ledgerId = secondLedger.id;

          Funds.createViaApi(firstFund).then((fundResponse) => {
            firstFund.id = fundResponse.fund.id;
            firstBudget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(firstBudget);

            Funds.createViaApi(secondFund).then((secondFundResponse) => {
              secondFund.id = secondFundResponse.fund.id;
              secondBudget.fundId = secondFundResponse.fund.id;
              Budgets.createViaApi(secondBudget);
              Groups.createViaApi(defaultGroup).then((secondGroupResponse) => {
                defaultGroup.id = secondGroupResponse.id;

                cy.loginAsAdmin({ path: TopMenu.fundPath, waiter: Funds.waitLoading });
                FinanceHelp.searchByName(secondFund.name);
                Funds.selectFund(secondFund.name);
                Funds.addGroupToFund(defaultGroup.name);
                Funds.closeFundDetails();
                cy.logout();
                cy.getAdminToken();
              });

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
                            { code: firstFund.code, fundId: firstFund.id, value: 100 },
                          ],
                          locations: [
                            { locationId: location.id, quantity: 1, quantityPhysical: 1 },
                          ],
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
                            listUnitPrice: 1.0,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 1,
                            poLineEstimatedPrice: 1.0,
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
                        Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
                          secondOrder.id = secondOrderResponse.id;
                          secondOrderLine.purchaseOrderId = secondOrderResponse.id;

                          OrderLines.createOrderLineViaApi(secondOrderLine);
                          Orders.updateOrderViaApi({
                            ...secondOrderResponse,
                            workflowStatus: ORDER_STATUSES.OPEN,
                          });
                        });
                        Invoices.createInvoiceWithInvoiceLineViaApi({
                          vendorId: organization.id,
                          fiscalYearId: defaultFiscalYear.id,
                          fundDistributions: firstOrderLine.fundDistribution,
                          accountingCode: organization.erpCode,
                          releaseEncumbrance: true,
                          subTotal: 5,
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
                          fundDistributions: secondOrderLine.fundDistribution,
                          accountingCode: organization.erpCode,
                          releaseEncumbrance: true,
                          subTotal: 10,
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
                          subTotal: -1,
                        }).then((thirdInvoiceResponse) => {
                          thirdInvoice = thirdInvoiceResponse;

                          Invoices.changeInvoiceStatusViaApi({
                            invoice: thirdInvoice,
                            status: INVOICE_STATUSES.PAID,
                          });
                        });
                        Invoices.createInvoiceWithInvoiceLineViaApi({
                          vendorId: organization.id,
                          fiscalYearId: defaultFiscalYear.id,
                          fundDistributions: secondOrderLine.fundDistribution,
                          accountingCode: organization.erpCode,
                          releaseEncumbrance: true,
                          subTotal: -5,
                        }).then((forthInvoiceResponse) => {
                          forthInvoice = forthInvoiceResponse;

                          Invoices.changeInvoiceStatusViaApi({
                            invoice: forthInvoice,
                            status: INVOICE_STATUSES.PAID,
                          });
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
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceViewFiscalYear.gui,
      permissions.uiFinanceFinanceViewGroup.gui,
      permissions.uiFinanceViewLedger.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.fiscalYearPath,
        waiter: FiscalYears.waitLoading,
      });
    });
  });

  after(() => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C502962 "Unavailable" is calculated correctly for fiscal year, ledger and group when credited invoices exist (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C502962'] },
    () => {
      FinanceHelp.searchByName(defaultFiscalYear.name);
      FiscalYears.selectFY(defaultFiscalYear.name);
      FiscalYearDetails.openLedgerDetails(firstLedger.name);
      LedgerDetails.checkLedgerDetails({
        financialSummary: [
          { key: 'Credited', value: '$1.00' },
          { key: 'Unavailable', value: '$14.00' },
        ],
      });
      FinanceHelp.searchByName(secondLedger.name);
      Ledgers.selectLedger(secondLedger.name);
      LedgerDetails.openGroupDetails(defaultGroup.name);
      GroupDetails.checkGroupDetails({
        financialSummary: [
          { key: 'Credited', value: '$5.00' },
          { key: 'Unavailable', value: '$6.00' },
        ],
      });
      GroupDetails.openFundDetails(secondFund.name);
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Credited', value: '$5.00' },
          { key: 'Unavailable', value: '$6.00' },
        ],
      });
      BudgetDetails.closeBudgetDetails();
      Funds.closeFundDetails();
      FinanceHelp.searchByName(firstFund.name);
      Funds.selectFund(firstFund.name);
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        summary: [
          { key: 'Credited', value: '$1.00' },
          { key: 'Unavailable', value: '$14.00' },
        ],
      });
      cy.wait(4000);
    },
  );
});
