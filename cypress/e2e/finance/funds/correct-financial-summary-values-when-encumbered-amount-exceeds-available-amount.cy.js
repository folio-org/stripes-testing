import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import {
  BudgetDetails,
  Budgets,
  FiscalYears,
  Funds,
  Ledgers,
} from '../../../support/fragments/finance';
import FinanceHelp from '../../../support/fragments/finance/financeHelper';
import Invoices from '../../../support/fragments/invoices/invoices';
import { BasicOrderLine, OrderLines, Orders } from '../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../support/fragments/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('Finance', () => {
  describe('Funds', () => {
    const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const ledger = {
      ...Ledgers.defaultUiLedger,
      restrictEncumbrance: false,
      restrictExpenditures: false,
    };
    const fund = { ...Funds.defaultUiFund };
    const order = {
      id: uuid(),
      vendor: '',
      orderType: 'One-Time',
      approved: true,
      reEncumber: true,
    };
    const budget = {
      ...Budgets.getDefaultBudget(),
      allocated: 1000,
      allowableEncumbrance: 100,
      allowableExpenditure: 100,
      allocationFrom: 500,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    let firstInvoice;
    let user;
    let location;

    before(() => {
      cy.getAdminToken();
      FiscalYears.createViaApi(fiscalYear).then((fiscalYearResponse) => {
        fiscalYear.id = fiscalYearResponse.id;
        budget.fiscalYearId = fiscalYearResponse.id;
        ledger.fiscalYearOneId = fiscalYear.id;
        Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          ledger.id = ledgerResponse.id;
          fund.ledgerId = ledger.id;

          Funds.createViaApi(fund).then((fundResponse) => {
            fund.id = fundResponse.fund.id;
            budget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(budget).then(() => {
              Budgets.batchProcessTransactions({
                transactionsToCreate: [
                  {
                    amount: 500,
                    currency: 'USD',
                    fiscalYearId: fiscalYear.id,
                    fromFundId: fund.id,
                    id: uuid(),
                    source: 'User',
                    transactionType: 'Allocation',
                  },
                ],
              });
              cy.getLocations({ query: `name="${LOCATION_NAMES.MAIN_LIBRARY_UI}"` }).then((res) => {
                location = res;

                cy.getDefaultMaterialType().then((mtype) => {
                  cy.getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                  }).then((params) => {
                    Organizations.createOrganizationViaApi(organization).then(
                      (responseOrganizations) => {
                        organization.id = responseOrganizations;
                        order.vendor = organization.id;
                        const firstOrderLine = {
                          ...BasicOrderLine.defaultOrderLine,
                          cost: {
                            listUnitPrice: 1000,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 1,
                            poLineEstimatedPrice: 1000,
                          },
                          fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
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

                        Invoices.createInvoiceWithInvoiceLineViaApi({
                          vendorId: organization.id,
                          fiscalYearId: fiscalYear.id,
                          fundDistributions: firstOrderLine.fundDistribution,
                          accountingCode: organization.erpCode,
                          releaseEncumbrance: true,
                          subTotal: -100,
                        }).then((invoiceRescponse) => {
                          firstInvoice = invoiceRescponse;

                          Invoices.changeInvoiceStatusViaApi({
                            invoice: firstInvoice,
                            status: INVOICE_STATUSES.APPROVED,
                          });
                          Orders.createOrderViaApi(order).then((firstOrderResponse) => {
                            order.id = firstOrderResponse.id;
                            firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                            OrderLines.createOrderLineViaApi(firstOrderLine);
                            Orders.updateOrderViaApi({
                              ...firstOrderResponse,
                              workflowStatus: ORDER_STATUSES.OPEN,
                            });
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

      cy.createTempUser([Permissions.uiFinanceViewFundAndBudget.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.fundPath,
          waiter: Funds.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C496150 Correct "Financial summary" values when encumbered amount exceeds available amount (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C496150'] },
      () => {
        FinanceHelp.searchByName(fund.name);
        Funds.selectFund(fund.name);
        Funds.selectBudgetDetails();
        BudgetDetails.checkBudgetDetails({
          summary: [
            { key: 'Initial allocation', value: '$1,000.00' },
            { key: 'Increase in allocation', value: '$0.00' },
            { key: 'Decrease in allocation', value: '$500.00' },
            { key: 'Total allocated', value: '$500.00' },
            { key: 'Net transfers', value: '$0.00' },
            { key: 'Total funding', value: '$500.00' },
            { key: 'Encumbered', value: '$1,000.00' },
            { key: 'Awaiting payment', value: '($100.00)' },
            { key: 'Expended', value: '$0.00' },
            { key: 'Credited', value: '$0.00' },
            { key: 'Unavailable', value: '$900.00' },
            { key: 'Over encumbrance', value: '$400.00' },
            { key: 'Over expended', value: '$0.00' },
          ],
          balance: { cash: '$500.00', available: '($400.00)' },
        });
      },
    );
  });
});
