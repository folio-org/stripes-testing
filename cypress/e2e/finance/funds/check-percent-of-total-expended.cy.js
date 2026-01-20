import uuid from 'uuid';
import permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import FiscalYears from '../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../support/fragments/finance/funds/funds';
import Groups from '../../../support/fragments/finance/groups/groups';
import Orders from '../../../support/fragments/orders/orders';
import Invoices from '../../../support/fragments/invoices/invoices';
import Users from '../../../support/fragments/users/users';
import Budgets from '../../../support/fragments/finance/budgets/budgets';
import ExpenseClasses from '../../../support/fragments/settings/finance/expenseClasses';
import NewOrder from '../../../support/fragments/orders/newOrder';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  INVOICE_STATUSES,
  ORDER_STATUSES,
} from '../../../support/constants';
import Organizations from '../../../support/fragments/organizations/organizations';
import BasicOrderLine from '../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../support/fragments/orders/orderLines';
import NewOrganization from '../../../support/fragments/organizations/newOrganization';
import FinanceHelper from '../../../support/fragments/finance/financeHelper';
import FundDetails from '../../../support/fragments/finance/funds/fundDetails';
import BudgetDetails from '../../../support/fragments/finance/budgets/budgetDetails';
import getRandomPostfix from '../../../support/utils/stringTools';
import groupDetails from '../../../support/fragments/finance/groups/groupDetails';

describe('Finance › Funds', () => {
  let user;
  const fiscalYear = { ...FiscalYears.defaultUiFiscalYear };
  const ledger = { ...Ledgers.defaultUiLedger };
  const group = { ...Groups.defaultUiGroup };
  const fund = { ...Funds.defaultUiFund };
  const budget = {
    ...Budgets.getDefaultBudget(),
    allocated: 100,
    statusExpenseClasses: [
      { expenseClassId: '', status: 'Active' },
      { expenseClassId: '', status: 'Active' },
    ],
  };
  const expenseClass1 = { ...ExpenseClasses.getDefaultExpenseClass() };
  const expenseClass2 = {
    ...ExpenseClasses.getDefaultExpenseClass(),
    name: `autotest_class_2_name_${getRandomPostfix()}`,
  };
  let location;
  const firstOrder = {
    ...NewOrder.getDefaultOngoingOrder,
    orderType: 'Ongoing',
    ongoing: { isSubscription: false, manualRenewal: false },
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
  let firstInvoice;
  let secondInvoice;
  const organization = { ...NewOrganization.defaultUiOrganizations };

  before('Setup data', () => {
    cy.getAdminToken();

    FiscalYears.createViaApi(fiscalYear).then((fy) => {
      fiscalYear.id = fy.id;
      ledger.fiscalYearOneId = fy.id;
      budget.fiscalYearId = fy.id;
      Ledgers.createViaApi(ledger).then((ledgerResponse) => {
        ledger.id = ledgerResponse.id;
        fund.ledgerId = ledgerResponse.id;
        Groups.createViaApi(group).then((groupResponse) => {
          group.id = groupResponse.id;
          ExpenseClasses.createExpenseClassViaApi(expenseClass1).then((ec1) => {
            expenseClass1.id = ec1.id;
            budget.statusExpenseClasses[0].expenseClassId = ec1.id;
          });
          ExpenseClasses.createExpenseClassViaApi(expenseClass2).then((ec2) => {
            expenseClass2.id = ec2.id;
            budget.statusExpenseClasses[1].expenseClassId = ec2.id;
            Funds.createViaApi(fund, [groupResponse.id]).then((fundResponse) => {
              fund.id = fundResponse.fund.id;
              budget.fundId = fundResponse.fund.id;
              Budgets.createViaApi(budget);

              cy.getLocations({ limit: 1 }).then((res) => {
                location = res;
                cy.getDefaultMaterialType().then((mtype) => {
                  cy.getAcquisitionMethodsApi({
                    query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
                  }).then((params) => {
                    Organizations.createOrganizationViaApi(organization).then(
                      (responseOrganizations) => {
                        organization.id = responseOrganizations;
                        secondOrder.vendor = organization.id;
                        firstOrder.vendor = organization.id;
                        const firstOrderLine = {
                          ...BasicOrderLine.defaultOrderLine,
                          cost: {
                            listUnitPrice: 10.0,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 1,
                            poLineEstimatedPrice: 10.0,
                          },
                          fundDistribution: [
                            {
                              code: fund.code,
                              fundId: fund.id,
                              value: 100,
                              expenseClassId: expenseClass1.id,
                              distributionType: 'percentage',
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
                        const secondOrderLine = {
                          ...BasicOrderLine.defaultOrderLine,
                          id: uuid(),
                          cost: {
                            listUnitPrice: 40.0,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 1,
                            poLineEstimatedPrice: 40.0,
                          },
                          fundDistribution: [
                            {
                              code: fund.code,
                              fundId: fund.id,
                              value: 100,
                              expenseClassId: expenseClass2.id,
                              distributionType: 'percentage',
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
                        Orders.createOrderViaApi(firstOrder).then((firstOrderResponse) => {
                          firstOrder.id = firstOrderResponse.id;
                          firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                          return OrderLines.createOrderLineViaApi(firstOrderLine).then(() => {
                            return Orders.updateOrderViaApi({
                              ...firstOrderResponse,
                              workflowStatus: ORDER_STATUSES.OPEN,
                            }).then(() => {
                              Invoices.createInvoiceWithInvoiceLineViaApi({
                                vendorId: organization.id,
                                fiscalYearId: fiscalYear.id,
                                poLineId: firstOrderLine.id,
                                fundDistributions: firstOrderLine.fundDistribution,
                                accountingCode: organization.erpCode,
                                releaseEncumbrance: true,
                                subTotal: 10,
                              }).then((invoiceRescponse) => {
                                firstInvoice = invoiceRescponse;

                                Invoices.changeInvoiceStatusViaApi({
                                  invoice: firstInvoice,
                                  status: INVOICE_STATUSES.PAID,
                                });
                              });
                            });
                          });
                        });
                        Orders.createOrderViaApi(secondOrder).then((secondOrderResponse) => {
                          secondOrder.id = secondOrderResponse.id;
                          secondOrderLine.purchaseOrderId = secondOrderResponse.id;

                          return OrderLines.createOrderLineViaApi(secondOrderLine).then(() => {
                            return Orders.updateOrderViaApi({
                              ...secondOrderResponse,
                              workflowStatus: ORDER_STATUSES.OPEN,
                            }).then(() => {
                              Invoices.createInvoiceWithInvoiceLineViaApi({
                                vendorId: organization.id,
                                fiscalYearId: fiscalYear.id,
                                poLineId: secondOrderLine.id,
                                fundDistributions: secondOrderLine.fundDistribution,
                                accountingCode: organization.erpCode,
                                releaseEncumbrance: true,
                                subTotal: 40,
                              }).then((invoiceRescponse) => {
                                secondInvoice = invoiceRescponse;

                                Invoices.changeInvoiceStatusViaApi({
                                  invoice: secondInvoice,
                                  status: INVOICE_STATUSES.PAID,
                                });
                              });
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
    });

    cy.createTempUser([
      permissions.uiFinanceViewFundAndBudget.gui,
      permissions.uiFinanceFinanceViewGroup.gui,
    ]).then((userProperties) => {
      user = userProperties;
      cy.login(user.username, user.password, {
        path: TopMenu.groupsPath,
        waiter: Groups.waitLoading,
      });
    });
  });

  after('Clean up', () => {
    cy.getAdminToken();
    Users.deleteViaApi(user.userId);
  });

  it(
    'C440081 Check "Percent of total expended" displaying (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C440081'] },
    () => {
      Groups.searchByName(group.name);
      Groups.selectGroup(group.name);
      groupDetails.checkGroupDetails({
        expenseClass: { name: expenseClass1.name, percentExpended: '20%' },
      });
      groupDetails.checkGroupDetails({
        expenseClass: { name: expenseClass2.name, percentExpended: '80%' },
      });
      FinanceHelper.selectFundsNavigation();
      Funds.searchByName(fund.name);
      Funds.selectFund(fund.name);
      FundDetails.checkCurrentExpenseClasses([
        { name: expenseClass1.name, percentExpended: '20%' },
        { name: expenseClass2.name, percentExpended: '80%' },
      ]);
      Funds.selectBudgetDetails();
      BudgetDetails.checkBudgetDetails({
        expenseClass: { name: expenseClass1.name, percentExpended: '20%' },
      });
      BudgetDetails.checkBudgetDetails({
        expenseClass: { name: expenseClass2.name, percentExpended: '80%' },
      });
    },
  );
});
