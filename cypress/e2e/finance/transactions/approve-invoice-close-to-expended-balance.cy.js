import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import permissions from '../../../support/dictionary/permissions';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../../support/fragments/finance/funds/funds';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import InvoiceLineDetails from '../../../support/fragments/invoices/invoiceLineDetails';
import Invoices from '../../../support/fragments/invoices/invoices';
import SettingsInvoices from '../../../support/fragments/invoices/settingsInvoices';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import newOrder from '../../../support/fragments/orders/newOrder';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Orders from '../../../support/fragments/orders/orders';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import Organizations from '../../../support/fragments/organizations/organizations';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Finance', () => {
  describe('Transactions', () => {
    let user;
    let location;
    let firstInvoice;
    let secondInvoice;
    let thirdInvoice;
    const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
    const ledger = {
      ...Ledgers.defaultUiLedger,
      restrictExpenditures: true,
      restrictEncumbrance: false,
    };
    const fundA = { ...Funds.defaultUiFund };
    const budget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
      allowableExpenditure: 110,
      allowableEncumbrance: 110,
    };
    const fundB = {
      ...Funds.defaultUiFund,
      name: `autotest_fund_b_${getRandomPostfix()}`,
      code: `${getRandomPostfix()}_2`,
    };
    const budgetB = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
    };
    const organization = { ...NewOrganization.defaultUiOrganizations };
    const order = { ...newOrder.defaultOneTimeOrder };

    before('Setup data', () => {
      cy.loginAsAdmin({
        path: TopMenu.fundPath,
        waiter: Funds.waitLoading,
      });

      FiscalYears.createViaApi(fiscalYear).then((fy) => {
        fiscalYear.id = fy.id;
        ledger.fiscalYearOneId = fy.id;
        budget.fiscalYearId = fy.id;
        budgetB.fiscalYearId = fy.id;

        Ledgers.createViaApi(ledger).then((ledgerResponse) => {
          ledger.id = ledgerResponse.id;
          fundA.ledgerId = ledgerResponse.id;
          fundB.ledgerId = ledgerResponse.id;

          Funds.createViaApi(fundA).then((fundResponse) => {
            fundA.id = fundResponse.fund.id;
            budget.fundId = fundResponse.fund.id;
            Budgets.createViaApi(budget);

            Funds.createViaApi(fundB).then((fundResponseB) => {
              fundB.id = fundResponseB.fund.id;
              budgetB.fundId = fundResponseB.fund.id;
              Budgets.createViaApi(budgetB);

              cy.getLocations({ limit: 1 }).then((res) => {
                location = res;
                cy.getDefaultMaterialType().then((mtype) => {
                  cy.getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                  }).then((params) => {
                    Organizations.createOrganizationViaApi(organization).then(
                      (responseOrganizations) => {
                        organization.id = responseOrganizations;
                        order.vendor = organization.id;
                        const orderLine = {
                          ...BasicOrderLine.defaultOrderLine,
                          cost: {
                            listUnitPrice: 10.0,
                            currency: 'USD',
                            discountType: 'amount',
                            quantityPhysical: 1,
                            poLineEstimatedPrice: 10.0,
                          },
                          fundDistribution: [
                            {
                              code: fundA.code,
                              fundId: fundA.id,
                              value: 10,
                              distributionType: 'amount',
                            },
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

                        Orders.createOrderViaApi(order).then((orderResponse) => {
                          order.id = orderResponse.id;
                          orderLine.purchaseOrderId = orderResponse.id;

                          return OrderLines.createOrderLineViaApi(orderLine).then(() => {
                            return Orders.updateOrderViaApi({
                              ...orderResponse,
                              workflowStatus: ORDER_STATUSES.OPEN,
                            }).then(() => {
                              Invoices.createInvoiceWithInvoiceLineViaApi({
                                vendorId: organization.id,
                                fiscalYearId: fiscalYear.id,
                                poLineId: null,
                                fundDistributions: [
                                  {
                                    fundId: fundA.id,
                                    value: 15,
                                    distributionType: 'amount',
                                  },
                                ],
                                accountingCode: organization.erpCode,
                                releaseEncumbrance: true,
                                subTotal: 15,
                              }).then((firstInvoiceResponse) => {
                                firstInvoice = firstInvoiceResponse;
                                Invoices.changeInvoiceStatusViaApi({
                                  invoice: firstInvoice,
                                  status: INVOICE_STATUSES.APPROVED,
                                });
                              });

                              Invoices.createInvoiceWithInvoiceLineViaApi({
                                vendorId: organization.id,
                                fiscalYearId: fiscalYear.id,
                                poLineId: null,
                                fundDistributions: [
                                  {
                                    fundId: fundA.id,
                                    value: 20,
                                    distributionType: 'amount',
                                  },
                                ],
                                accountingCode: organization.erpCode,
                                releaseEncumbrance: true,
                                subTotal: 20,
                              }).then((firstInvoiceResponse) => {
                                secondInvoice = firstInvoiceResponse;
                                Invoices.changeInvoiceStatusViaApi({
                                  invoice: secondInvoice,
                                  status: INVOICE_STATUSES.PAID,
                                });
                              });

                              Invoices.createInvoiceWithInvoiceLineViaApi({
                                vendorId: organization.id,
                                fiscalYearId: fiscalYear.id,
                                poLineId: null,
                                fundDistributions: [
                                  {
                                    fundId: fundA.id,
                                    value: 85,
                                    distributionType: 'amount',
                                  },
                                ],
                                accountingCode: organization.erpCode,
                                releaseEncumbrance: true,
                                subTotal: 85,
                              }).then((firstInvoiceResponse) => {
                                thirdInvoice = firstInvoiceResponse;
                              });
                              Funds.searchByName(fundA.name);
                              Funds.selectFund(fundA.name);
                              Funds.selectBudgetDetails();
                              Funds.transferAmount('10', fundB, fundA);
                              InteractorsTools.checkCalloutMessage(
                                `$10.00 was successfully transferred to the budget ${budget.name}`,
                              );
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
      cy.visit(TopMenu.settingsInvoiveApprovalPath);
      SettingsInvoices.uncheckApproveAndPayCheckboxIfChecked();

      cy.createTempUser([
        permissions.uiFinanceViewFundAndBudget.gui,
        permissions.uiInvoicesApproveInvoices.gui,
        permissions.uiInvoicesCanViewAndEditInvoicesAndInvoiceLines.gui,
        permissions.uiInvoicesPayInvoices.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.invoicesPath,
          waiter: Invoices.waitLoading,
        });
      });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Orders.deleteOrderViaApi(order.id);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C449367 Invoice can be approved when balance is close to the expended available balance (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C449367'] },
      () => {
        Invoices.searchByNumber(thirdInvoice.vendorInvoiceNo);
        Invoices.selectInvoice(thirdInvoice.vendorInvoiceNo);
        Invoices.approveInvoice();
        Invoices.selectInvoiceLine();
        InvoiceLineDetails.openFundDetailsPane(fundA.name);
        Funds.selectBudgetDetails();
        Funds.viewTransactions();
        Funds.verifyTransactionWithAmountExist('Pending payment', '($85.00)');
        Funds.verifyTransactionWithAmountExist('Payment', '($20.00)');
        Funds.verifyTransactionWithAmountExist('Pending payment', '($15.00)');
        Funds.verifyTransactionWithAmountExist('Encumbrance', '($10.00)');
      },
    );
  });
});
