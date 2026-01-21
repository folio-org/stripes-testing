import uuid from 'uuid';
import permissions from '../../../../support/dictionary/permissions';
import TopMenu from '../../../../support/fragments/topMenu';
import FiscalYears from '../../../../support/fragments/finance/fiscalYears/fiscalYears';
import Ledgers from '../../../../support/fragments/finance/ledgers/ledgers';
import Funds from '../../../../support/fragments/finance/funds/funds';
import Orders from '../../../../support/fragments/orders/orders';
import Users from '../../../../support/fragments/users/users';
import Budgets from '../../../../support/fragments/finance/budgets/budgets';
import BasicOrderLine from '../../../../support/fragments/orders/basicOrderLine';
import OrderLines from '../../../../support/fragments/orders/orderLines';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../../support/constants';
import Organizations from '../../../../support/fragments/organizations/organizations';
import NewOrganization from '../../../../support/fragments/organizations/newOrganization';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import FinanceHelper from '../../../../support/fragments/finance/financeHelper';
import { TransactionDetails } from '../../../../support/fragments/finance';
import { OrderLineDetails } from '../../../../support/fragments/orders';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    let user;
    const fiscalYear1 = { ...FiscalYears.defaultUiFiscalYear };
    const fiscalYear2 = {
      name: `autotest_year_${getRandomPostfix()}`,
      code: DateTools.getRandomFiscalYearCode(2000, 9999),
      periodStart: `${DateTools.get3DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
      periodEnd: `${DateTools.get4DaysAfterTomorrowDateForFiscalYear()}T00:00:00.000+00:00`,
      description: `This is fiscal year created by E2E test automation script_${getRandomPostfix()}`,
      series: 'FY',
    };
    const ledger = { ...Ledgers.defaultUiLedger };
    const fundA = { ...Funds.defaultUiFund };
    const budget = { ...Budgets.getDefaultBudget(), allocated: 1000 };
    const order1 = {
      id: uuid(),
      orderType: 'One-Time',
      reEncumber: false,
      approved: true,
    };
    const order2 = {
      id: uuid(),
      orderType: 'One-Time',
      reEncumber: true,
      approved: true,
    };
    let location;
    const organization = { ...NewOrganization.defaultUiOrganizations };
    let firstOrderNumber;
    let secondOrderNumber;

    const periodStartForFirstFY = DateTools.getThreePreviousDaysDateForFiscalYearOnUIEdit();
    const periodEndForFirstFY = DateTools.getTwoPreviousDaysDateForFiscalYearOnUIEdit();
    const periodStartForSecondFY = DateTools.getPreviousDayDateForFiscalYearOnUIEdit();
    const periodEndForSecondFY = DateTools.getDayTomorrowDateForFiscalYearOnUIEdit();

    before('Setup data', () => {
      cy.loginAsAdmin({
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });

      FiscalYears.createViaApi(fiscalYear1).then((fy1) => {
        fiscalYear1.id = fy1.id;
        ledger.fiscalYearOneId = fy1.id;
        budget.fiscalYearId = fy1.id;
        fiscalYear2.code = fiscalYear1.code.slice(0, -1) + '2';
        FiscalYears.createViaApi(fiscalYear2).then((fy2) => {
          fiscalYear2.id = fy2.id;
          Ledgers.createViaApi(ledger).then((ledgerResponse) => {
            ledger.id = ledgerResponse.id;
            fundA.ledgerId = ledgerResponse.id;
            Funds.createViaApi(fundA).then((fundResponse) => {
              fundA.id = fundResponse.fund.id;
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
                        order1.vendor = organization.id;
                        order2.vendor = organization.id;
                        const firstOrderLine = {
                          ...BasicOrderLine.defaultOrderLine,
                          cost: {
                            listUnitPrice: 100.0,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 1,
                            poLineEstimatedPrice: 100.0,
                          },
                          fundDistribution: [{ code: fundA.code, fundId: fundA.id, value: 100 }],
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
                            listUnitPrice: 10.0,
                            currency: 'USD',
                            discountType: 'percentage',
                            quantityPhysical: 1,
                            poLineEstimatedPrice: 10.0,
                          },
                          fundDistribution: [{ code: fundA.code, fundId: fundA.id, value: 100 }],
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
                        Orders.createOrderViaApi(order1).then((firstOrderResponse) => {
                          order1.id = firstOrderResponse.id;
                          firstOrderNumber = firstOrderResponse.poNumber;
                          firstOrderLine.purchaseOrderId = firstOrderResponse.id;

                          OrderLines.createOrderLineViaApi(firstOrderLine);
                          Orders.updateOrderViaApi({
                            ...firstOrderResponse,
                            workflowStatus: ORDER_STATUSES.OPEN,
                          });
                        });
                        Orders.createOrderViaApi(order2).then((secondOrderResponse) => {
                          order2.id = secondOrderResponse.id;
                          secondOrderNumber = secondOrderResponse.poNumber;
                          secondOrderLine.purchaseOrderId = secondOrderResponse.id;

                          OrderLines.createOrderLineViaApi(secondOrderLine);
                          Orders.updateOrderViaApi({
                            ...secondOrderResponse,
                            workflowStatus: ORDER_STATUSES.OPEN,
                          });

                          Orders.searchByParameter('PO number', secondOrderNumber);
                          Orders.selectFromResultsList(secondOrderNumber);
                          Orders.cancelOrder();
                          cy.wait(4000);
                        });
                      },
                    );
                  });
                });
              });
            });
          });
        });
        TopMenuNavigation.openAppFromDropdown('Finance');
        FinanceHelper.selectLedgersNavigation();
        Ledgers.searchByName(ledger.name);
        Ledgers.selectLedger(ledger.name);
        Ledgers.rollover();
        Ledgers.fillInRolloverWithAllocation(fiscalYear2.code, 'None', 'Transfer');
      });

      FinanceHelper.selectFiscalYearsNavigation();
      FinanceHelper.searchByName(fiscalYear1.name);
      FiscalYears.selectFY(fiscalYear1.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForFirstFY,
        periodEndForFirstFY,
      );
      FinanceHelper.searchByName(fiscalYear2.name);
      FiscalYears.selectFY(fiscalYear2.name);
      FiscalYears.editFiscalYearDetails();
      FiscalYears.filltheStartAndEndDateonCalenderstartDateField(
        periodStartForSecondFY,
        periodEndForSecondFY,
      );

      cy.createTempUser([
        permissions.uiOrdersEdit.gui,
        permissions.uiFinanceViewFundAndBudget.gui,
      ]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });
    });

    after('Clean up', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C552995 Verify Order line encumbrance link updated to current fiscal year encumbrance after rollover (thunderjet)',
      { tags: ['criticalPath', 'thunderjet', 'C552995'] },
      () => {
        Orders.searchByParameter('PO number', firstOrderNumber);
        Orders.selectFromResultsList(firstOrderNumber);
        OrderLines.selectPOLInOrder();
        OrderLines.openPageCurrentEncumbrance('0.00');
        TransactionDetails.checkTransactionDetails({
          information: [
            { key: 'Fiscal year', value: fiscalYear2.code },
            { key: 'Amount', value: '$0.00' },
            { key: 'Source', value: `${firstOrderNumber}-1` },
            { key: 'Type', value: 'Encumbrance' },
            { key: 'From', value: `${fundA.name} (${fundA.code})` },
            { key: 'Initial encumbrance', value: '$0.00' },
            { key: 'Status', value: 'Released' },
          ],
        });
        TopMenuNavigation.navigateToApp('Orders');
        Orders.selectOrdersPane();
        Orders.searchByParameter('PO number', secondOrderNumber);
        Orders.selectFromResultsList(secondOrderNumber);
        OrderLines.selectPOLInOrder();
        OrderLineDetails.checkFundDistibutionTableContent([
          {
            name: fundA.name,
            expenseClass: '',
            value: '100%',
            amount: '$10.00',
            initialEncumbrance: '',
            currentEncumbrance: '',
          },
        ]);
      },
    );
  });
});
