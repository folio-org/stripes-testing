import moment from 'moment';
import uuid from 'uuid';

import { BUDGET_STATUSES } from '../../support/constants/finance/budget';
import { FUND_DISTRIBUTION_TYPES } from '../../support/constants/finance/fund';
import { ORDER_TYPES } from '../../support/constants/orders/order';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  ORDER_FORMAT_VALUES,
} from '../../support/constants/orders/order-line';
import { Permissions } from '../../support/dictionary';
import getRandomPostfix from '../../support/utils/stringTools';
import { DateTools, ExecutionFlowManager } from '../../support/utils';
import FileManager from '../../support/utils/fileManager';
import BasicOrderLine from '../../support/fragments/orders/basicOrderLine';
import NewOrganization from '../../support/fragments/organizations/newOrganization';
import Organizations from '../../support/fragments/organizations/organizations';
import OrderDetails from '../../support/fragments/orders/orderDetails';
import OrderLineDetails from '../../support/fragments/orders/orderLineDetails';
import OrderLineEditForm from '../../support/fragments/orders/orderLineEditForm';
import Orders from '../../support/fragments/orders/orders';
import OrderLines from '../../support/fragments/orders/orderLines';
import Budgets from '../../support/fragments/finance/budgets/budgets';
import FiscalYears from '../../support/fragments/finance/fiscalYears/fiscalYears';
import Funds from '../../support/fragments/finance/funds/funds';
import Ledgers from '../../support/fragments/finance/ledgers/ledgers';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import OrderLinesLimit from '../../support/fragments/settings/orders/orderLinesLimit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomStringCode from '../../support/utils/generateTextCode';

describe('Orders', () => {
  const flow = new ExecutionFlowManager();

  const R = {
    FY1: 'fy1',
    FY2: 'fy2',
    FY3: 'fy3',
    FY4: 'fy4',
    LEDGER: 'ledger',
    FUND_A: 'fundA',
    FUND_B: 'fundB',
    EXPENSE_CLASS: 'expenseClass',
    BUDGET_A1: 'budgetA1',
    BUDGET_A2: 'budgetA2',
    BUDGET_A3: 'budgetA3',
    BUDGET_A4: 'budgetA4',
    BUDGET_B1: 'budgetB1',
    BUDGET_B2: 'budgetB2',
    BUDGET_B3: 'budgetB3',
    BUDGET_B4: 'budgetB4',
    ORG: 'org',
    ORDER: 'order',
    POL: 'pol',
    USER: 'user',
    ACQ_METHOD: 'acqMethod',
  };

  const testData = {
    polTitle: `AT_POL_${getRandomPostfix()}`,
    csvFileName: `order-export-${moment().format('YYYY-MM-DD')}-*.csv`,
  };

  const createBudgetStep = (fundKey, fiscalYearKey, budgetKey) => (f) => {
    const { [fundKey]: fund, [fiscalYearKey]: fiscalYear, expenseClass } = f.ctx();

    return Budgets.createViaApi({
      ...Budgets.getDefaultBudget(),
      fiscalYearId: fiscalYear.id,
      fundId: fund.id,
      allocated: 1000,
    }).then((budget) => Budgets.updateBudgetViaApi({
      ...budget,
      statusExpenseClasses: [
        {
          status: BUDGET_STATUSES.ACTIVE,
          expenseClassId: expenseClass.id,
        },
      ],
    }).then(() => {
      f.set(budgetKey, budget, () => Budgets.deleteViaApi(budget.id, false));
    }));
  };

  before(() => {
    cy.getAdminToken();
    cy.clearLocalStorage();

    // Precondition 1: "Set purchase order lines limit" is set to more than 1
    OrderLinesLimit.setPOLLimitViaApi(2);

    flow
      // Precondition 2: Create current FYs
      .step((f) => {
        const series = getRandomStringCode(5);

        [R.FY1, R.FY2, R.FY3, R.FY4].forEach((key, index) => {
          FiscalYears.createViaApi({
            ...FiscalYears.getDefaultFiscalYear(),
            ...DateTools.getFullFiscalYearStartAndEnd(index),
            code: `${series}${new Date().getFullYear() + index}`,
            series,
          }).then((fy) => {
            f.set(key, fy, () => FiscalYears.deleteFiscalYearViaApi(fy.id));
          });
        });
      })
      // Precondition 3: Create active Ledger related to FY1
      .step((f) => {
        const { fy1 } = f.ctx();
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: fy1.id,
        }).then((ledger) => {
          f.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false));
        });
      })
      // Precondition 4: Create Fund A
      .step((f) => {
        const { ledger } = f.ctx();
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledger.id,
        }).then((response) => {
          f.set(R.FUND_A, response.fund, () => Funds.deleteFundViaApi(response.fund.id, false));
        });
      })
      // Precondition 4: Create Fund B
      .step((f) => {
        const { ledger } = f.ctx();
        return Funds.createViaApi({
          ...Funds.getDefaultFund(),
          ledgerId: ledger.id,
        }).then((response) => {
          f.set(R.FUND_B, response.fund, () => Funds.deleteFundViaApi(response.fund.id, false));
        });
      })
      // Precondition 4: Create expense class "Electronic"
      .step((f) => {
        return ExpenseClasses.createExpenseClassViaApi({
          ...ExpenseClasses.getDefaultExpenseClass(),
          name: `Electronic_${getRandomPostfix()}`,
          code: `EL${getRandomPostfix()}`,
        }).then((ec) => {
          f.set(R.EXPENSE_CLASS, ec, () => ExpenseClasses.deleteExpenseClassViaApi(ec.id, { failOnStatusCode: false }));
        });
      })
      // Precondition 4: Create budget for Fund A in FY1 with expense class
      .step(createBudgetStep(R.FUND_A, R.FY1, R.BUDGET_A1))
      // Precondition 4: Create budget for Fund A in FY2 with expense class
      .step(createBudgetStep(R.FUND_A, R.FY2, R.BUDGET_A2))
      // Precondition 4: Create budget for Fund A in FY3 with expense class
      .step(createBudgetStep(R.FUND_A, R.FY3, R.BUDGET_A3))
      // Precondition 4: Create budget for Fund A in FY4
      .step(createBudgetStep(R.FUND_A, R.FY4, R.BUDGET_A4))
      // Precondition 4: Create budget for Fund B in FY1 with expense class
      .step(createBudgetStep(R.FUND_B, R.FY1, R.BUDGET_B1))
      // Precondition 4: Create budget for Fund B in FY2 with expense class
      .step(createBudgetStep(R.FUND_B, R.FY2, R.BUDGET_B2))
      // Precondition 4: Create budget for Fund B in FY3 with expense class
      .step(createBudgetStep(R.FUND_B, R.FY3, R.BUDGET_B3))
      // Precondition 4: Create budget for Fund B in FY4
      .step(createBudgetStep(R.FUND_B, R.FY4, R.BUDGET_B4))
      // Precondition 5: Fetch acquisition method "Other" for POL creation
      .step((f) => {
        return cy
          .getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER}"`,
          })
          .then(({ body }) => {
            f.set(R.ACQ_METHOD, body.acquisitionMethods[0].id);
          });
      })
      // Precondition 5: Create organization (vendor)
      .step((f) => {
        return NewOrganization.createViaApi(NewOrganization.getDefaultOrganization()).then(
          (org) => {
            f.set(R.ORG, org, () => Organizations.deleteOrganizationViaApi(org.id));
          },
        );
      })
      // Precondition 5: Create Ongoing order in Pending status
      .step((f) => {
        const { org } = f.ctx();
        return Orders.createOrderViaApi({
          id: uuid(),
          vendor: org.id,
          orderType: ORDER_TYPES.ONGOING,
          ongoing: { isSubscription: false, manualRenewal: false },
        }).then((order) => {
          f.set(R.ORDER, order, () => Orders.deleteOrderViaApi(order.id, false));
        });
      })
      // Precondition 5: Create POL with 4-year multi-year prepayment starting FY1
      .step((f) => {
        const { order, fundA, fundB, fy1, fy2, fy3, fy4, expenseClass, acqMethod } = f.ctx();
        return OrderLines.createOrderLineViaApi({
          ...BasicOrderLine.getDefaultOrderLine({
            purchaseOrderId: order.id,
            title: testData.polTitle,
            listUnitPrice: 100,
            quantity: 1,
            acquisitionMethod: acqMethod,
          }),
          orderFormat: ORDER_FORMAT_VALUES.OTHER,
          multiYearPayment: true,
          paymentTerms: {
            totalPrice: 100,
            prepaymentTerm: 4,
            startingFiscalYearId: fy1.id,
            fiscalYearDistributions: [
              {
                fiscalYearId: fy1.id,
                fundDistributions: [
                  { fundId: fundA.id, distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT, value: 25 },
                  {
                    fundId: fundB.id,
                    distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                    value: 25,
                    expenseClassId: expenseClass.id,
                  },
                ],
              },
              {
                fiscalYearId: fy2.id,
                fundDistributions: [
                  {
                    fundId: fundA.id,
                    distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT,
                    value: 25,
                    expenseClassId: expenseClass.id,
                  },
                ],
              },
              {
                fiscalYearId: fy3.id,
                fundDistributions: [
                  { fundId: fundB.id, distributionType: FUND_DISTRIBUTION_TYPES.AMOUNT, value: 25 },
                ],
              },
              {
                fiscalYearId: fy4.id,
                fundDistributions: [],
              },
            ],
          },
        }).then((pol) => {
          f.set(R.POL, pol, () => OrderLines.deleteOrderLineViaApi(pol.id, false));
        });
      })
      // Precondition 6: Create authorized user with Orders edit/create + export CSV permissions
      .step((f) => {
        return cy
          .createTempUser([
            Permissions.uiOrdersCreate.gui,
            Permissions.uiOrdersEdit.gui,
            Permissions.uiExportOrders.gui,
          ])
          .then((userProperties) => {
            f.set(R.USER, userProperties, () => Users.deleteViaApi(userProperties.userId));
          });
      })
      // Precondition 7: Log in and navigate to Orders; open details pane for the order
      .step((f) => {
        const { user, order } = f.ctx();
        cy.login(user.username, user.password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
        Orders.selectOrderByPONumber(order.poNumber);
        OrderDetails.waitLoading();
      });
  });

  after(() => {
    cy.getAdminToken();
    FileManager.deleteFilesFromDownloadsByMask(testData.csvFileName);
    flow.cleanup();
  });

  it(
    'C1404903 Create an order with two-year prepayment term starting from the future fiscal year (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1404903'] },
    () => {
      const { fy1, fy2, fy3, fy4, fundA, fundB, expenseClass } = flow.ctx();

      cy.log('Step 1. Click on the PO line record; Click "Actions" button; Select "Edit" option');
      OrderDetails.openPolDetails(testData.polTitle);
      OrderLineDetails.openOrderLineEditForm();
      // Expected: Multi-year prepayment checked; prepayment term = 4; 4 FY cards; trash only on FY4; Add fiscal year inactive
      OrderLineEditForm.checkPrepaymentTermValue(4);
      OrderLineEditForm.checkAddFiscalYearButtonDisabled();

      cy.log('Step 2. Select the next future fiscal year in the "Starting fiscal year" dropdown');
      OrderLineEditForm.selectStartingFiscalYear(fy2.name);
      // Expected: Prepayment term = 2; 2 FY cards (FY2, FY3); trash only on FY3; Add fiscal year active
      OrderLineEditForm.checkPrepaymentTermValue(2);
      OrderLineEditForm.checkAddFiscalYearButtonEnabled();

      cy.log('Step 3. Click "Add fiscal year" button');
      OrderLineEditForm.clickAddFiscalYearButton();
      // Expected: Prepayment term = 3; 3 FY cards (FY2, FY3, FY4); trash only on FY4; Add fiscal year inactive
      OrderLineEditForm.checkPrepaymentTermValue(3);
      OrderLineEditForm.checkAddFiscalYearButtonDisabled();

      cy.log('Step 4. Fill in the Fiscal year cards with fund distribution data');
      // FY2 card: Fund A (expense class #1) with $50
      OrderLineEditForm.addFundDistributionInFYCard(fy2.name);
      OrderLineEditForm.selectFundInFYCard({
        fyName: fy2.name,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 0,
      });
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyName: fy2.name,
        expenseClassName: expenseClass.name,
        rowIndex: 0,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyName: fy2.name,
        value: 50,
        rowIndex: 0,
      });

      // FY3 card: Fund A and Fund B, each with 25%
      OrderLineEditForm.addFundDistributionInFYCard(fy3.name);
      OrderLineEditForm.selectFundInFYCard({
        fyName: fy3.name,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 0,
      });
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyName: fy3.name, rowIndex: 0 });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyName: fy3.name,
        value: 25,
        rowIndex: 0,
      });
      OrderLineEditForm.addFundDistributionInFYCard(fy3.name);
      OrderLineEditForm.selectFundInFYCard({
        fyName: fy3.name,
        fundName: fundB.name,
        fundCode: fundB.code,
        rowIndex: 1,
      });
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyName: fy3.name, rowIndex: 1 });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyName: fy3.name,
        value: 25,
        rowIndex: 1,
      });
      // Expected: All three cards populated with entered values

      cy.log('Step 5. Click trash icon next to the Fiscal year 3 card');
      OrderLineEditForm.removeLastFYCard();
      // Expected: prepayment term = 2; 2 FY cards with entered values; validation messages appear; Add fiscal year active
      OrderLineEditForm.checkPrepaymentTermValue(2);
      OrderLineEditForm.checkAddFiscalYearButtonEnabled();

      cy.log('Step 6. Click "Add fiscal year" button');
      OrderLineEditForm.clickAddFiscalYearButton();
      // Expected: prepayment term = 3; 2 populated FY cards + 1 new FY4; trash only on FY4; Add fiscal year inactive
      OrderLineEditForm.checkPrepaymentTermValue(3);
      OrderLineEditForm.checkAddFiscalYearButtonDisabled();

      cy.log(
        'Step 7. Fill in Fiscal year 3 card with valid values; Click trash icon next to the Fiscal year 3 card',
      );
      OrderLineEditForm.addFundDistributionInFYCard(fy4.name);
      OrderLineEditForm.selectFundInFYCard({
        fyName: fy4.name,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 0,
      });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyName: fy4.name,
        value: 25,
        rowIndex: 0,
      });
      OrderLineEditForm.removeLastFYCard();
      // Expected: prepayment term = 2; 2 FY cards with entered values; Add fiscal year active
      OrderLineEditForm.checkPrepaymentTermValue(2);
      OrderLineEditForm.checkAddFiscalYearButtonEnabled();

      cy.log(
        'Step 8. Add Fund A with expense class in the "Fund distribution" accordion; Change value to 80 in the Fiscal year 1 card; Click "Save & close" button',
      );
      OrderLineEditForm.clickAddFundDistributionButton();
      OrderLineEditForm.expandFundIdDropdown(0);
      OrderLineEditForm.selectFundFromOpenDropdown(fundA.name, fundA.code);
      OrderLineEditForm.selectExpenseClass(expenseClass.name, 0);
      OrderLineEditForm.setFundDistributionValue(100, 0);
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyName: fy2.name,
        value: 80,
        rowIndex: 0,
      });
      OrderLineEditForm.clickSaveButton({ orderLineCreated: false, orderLineUpdated: true });
      // Expected: PO Line details; "successfully updated"; Fund A in Fund distribution; 2 FY cards (FY2, FY3) with entered values
      OrderLineDetails.waitLoading();

      cy.log(
        'Step 9. Click left back arrow; Click "Actions" button in "PO lines" accordion; Select "Add PO line" option',
      );
      OrderLineDetails.backToOrderDetails();
      OrderDetails.selectAddPOLine();
      // Expected: Add PO line page displayed

      cy.log(
        'Step 10. Check "Multi-year prepayment" checkbox; Fill in required fields; Select current FY in "Starting fiscal year" dropdown; Remove all FY cards; Click "Save & close" button',
      );
      OrderLineEditForm.enableMultiYearPrepayment();
      OrderLineEditForm.fillItemDetailsTitle({ instanceTitle: `AT_POL2_${getRandomPostfix()}` });
      OrderLineEditForm.fillPoLineDetails({
        acquisitionMethod: ACQUISITION_METHOD_NAMES_IN_PROFILE.OTHER,
        orderFormat: ORDER_FORMAT_VALUES.OTHER,
      });
      OrderLineEditForm.fillCostDetails({ physicalUnitPrice: '100', quantityPhysical: '1' });
      OrderLineEditForm.selectStartingFiscalYear(fy1.name);
      OrderLineEditForm.removeLastFYCard();
      OrderLineEditForm.removeLastFYCard();
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      // Expected: Validation error "At least 2 fiscal years must be specified for multi-year prepayment"
      OrderLineEditForm.checkAtLeastTwoFYsValidationError();

      cy.log(
        'Step 11. Add two FY cards; Click "Add fund distribution" in FY1 card; Select Fund A; Select expense class; Change type to %; Click "Save & close"',
      );
      OrderLineEditForm.clickAddFiscalYearButton();
      OrderLineEditForm.clickAddFiscalYearButton();
      OrderLineEditForm.addFundDistributionInFYCard(fy1.name);
      OrderLineEditForm.selectFundInFYCard({
        fyName: fy1.name,
        fundName: fundA.name,
        fundCode: fundA.code,
        rowIndex: 0,
      });
      OrderLineEditForm.selectExpenseClassInFYCard({
        fyName: fy1.name,
        expenseClassName: expenseClass.name,
        rowIndex: 0,
      });
      OrderLineEditForm.selectDistributionTypePercentInFYCard({ fyName: fy1.name, rowIndex: 0 });
      OrderLineEditForm.fillFundDistributionValueInFYCard({
        fyName: fy1.name,
        value: 100,
        rowIndex: 0,
      });
      OrderLineEditForm.clickSaveButton({ orderLineCreated: true, orderLineUpdated: false });
      // Expected: PO Line details; "successfully created"; Fund A in Fund distribution; 2 FY cards with values for FY1; FY2 shows "no items"
      OrderLineDetails.waitLoading();

      cy.log(
        'Step 12. Click "Actions" button on the "Orders" pane; Select "Export results (CSV)" option; Leave "All" selected; Click "Export" button',
      );
      OrderLineDetails.backToOrderDetails();
      OrderDetails.closeOrderDetails();
      Orders.waitLoading();
      Orders.exportResultsToCsv();
      // Expected: Export started; .csv file downloaded

      cy.log('Step 13. Open downloaded .csv file');
      // Expected: File contains multi-year prepayment data for both PO lines
      FileManager.convertCsvToJson(testData.csvFileName).then((data) => {
        const headers = Object.keys(data[0] || {});
        expect(headers.some((h) => h.includes('Multi-year prepayment'))).to.equal(true);
        expect(headers.some((h) => h.includes('Prepayment term'))).to.equal(true);
        expect(headers.some((h) => h.includes('Prepayment starting fiscal year'))).to.equal(true);
        expect(headers.some((h) => h.includes('Prepayment total price'))).to.equal(true);
      });
    },
  );
});
