import uuid from 'uuid';
import { Permissions } from '../../../../support/dictionary';
import {
  Budgets,
  FinanceHelper,
  FiscalYears,
  Funds,
  Ledgers,
  LedgerDetails,
  LedgerRolloverInProgress,
  Transactions,
} from '../../../../support/fragments/finance';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import { NewOrder, BasicOrderLine, Orders, OrderLines } from '../../../../support/fragments/orders';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../../support/utils';
import { ACQUISITION_METHOD_NAMES_IN_PROFILE, ORDER_STATUSES } from '../../../../support/constants';

describe('Finance', () => {
  describe('Fiscal Year Rollover', () => {
    const date = new Date();
    const code = CodeTools(4);
    const fiscalYears = {
      first: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}01`,
        periodStart: new Date(date.getFullYear(), 0, 1),
        periodEnd: new Date(date.getFullYear(), 11, 31),
      },
      second: {
        ...FiscalYears.getDefaultFiscalYear(),
        code: `${code}${StringTools.randomTwoDigitNumber()}02`,
        periodStart: new Date(date.getFullYear() + 1, 0, 1),
        periodEnd: new Date(date.getFullYear() + 1, 11, 31),
      },
    };
    const ledger = { ...Ledgers.getDefaultLedger(), fiscalYearOneId: fiscalYears.first.id };
    const fund = { ...Funds.getDefaultFund(), ledgerId: ledger.id };
    const budget = {
      ...Budgets.getDefaultBudget(),
      allocated: 100,
      fiscalYearId: fiscalYears.first.id,
      fundId: fund.id,
    };

    const testData = {
      organization: NewOrganization.getDefaultOrganization(),
      fiscalYears,
      user: {},
      oneTimeOrder: {},
      ongoingOrder: {},
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        // Create fiscal years
        Object.values(fiscalYears).forEach((fiscalYear) => {
          FiscalYears.createViaApi(fiscalYear);
        });

        Ledgers.createViaApi(ledger);
        Funds.createViaApi(fund);
        Budgets.createViaApi(budget);

        Organizations.createOrganizationViaApi(testData.organization).then(() => {
          testData.oneTimeOrder = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            orderType: 'One-Time',
            reEncumber: true,
          };

          testData.ongoingOrder = {
            ...NewOrder.getDefaultOrder({ vendorId: testData.organization.id }),
            id: uuid(),
            orderType: 'Ongoing',
            ongoing: { isSubscription: false, manualRenewal: false },
            reEncumber: true,
          };

          cy.getLocations({ limit: 1 }).then((location) => {
            testData.location = location;

            cy.getDefaultMaterialType().then((materialType) => {
              cy.getAcquisitionMethodsApi({
                query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
              }).then((params) => {
                const acquisitionMethodId = params.body.acquisitionMethods[0].id;

                const oneTimeOrderLine = {
                  ...BasicOrderLine.getDefaultOrderLine({
                    listUnitPrice: 40,
                    fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
                  }),
                  acquisitionMethod: acquisitionMethodId,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: materialType.id,
                    materialSupplier: testData.organization.id,
                    volumes: [],
                  },
                  locations: [
                    {
                      locationId: location.id,
                      quantity: 1,
                      quantityPhysical: 1,
                    },
                  ],
                };

                const ongoingOrderLine = {
                  ...BasicOrderLine.getDefaultOrderLine({
                    listUnitPrice: 10,
                    fundDistribution: [{ code: fund.code, fundId: fund.id, value: 100 }],
                  }),
                  id: uuid(),
                  acquisitionMethod: acquisitionMethodId,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: materialType.id,
                    materialSupplier: testData.organization.id,
                    volumes: [],
                  },
                  locations: [
                    {
                      locationId: location.id,
                      quantity: 1,
                      quantityPhysical: 1,
                    },
                  ],
                };

                Orders.createOrderViaApi(testData.oneTimeOrder).then((orderResponse) => {
                  testData.oneTimeOrder.id = orderResponse.id;
                  oneTimeOrderLine.purchaseOrderId = orderResponse.id;

                  OrderLines.createOrderLineViaApi(oneTimeOrderLine);
                  Orders.updateOrderViaApi({
                    ...orderResponse,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                  testData.oneTimeOrderLine = oneTimeOrderLine;
                });

                Orders.createOrderViaApi(testData.ongoingOrder).then((orderResponse) => {
                  testData.ongoingOrder.id = orderResponse.id;
                  ongoingOrderLine.purchaseOrderId = orderResponse.id;

                  OrderLines.createOrderLineViaApi(ongoingOrderLine);
                  Orders.updateOrderViaApi({
                    ...orderResponse,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                  testData.ongoingOrderLine = ongoingOrderLine;
                });
              });
            });
          });
        });
      });

      cy.createTempUser([
        Permissions.uiFinanceExecuteFiscalYearRollover.gui,
        Permissions.uiFinanceViewFiscalYear.gui,
        Permissions.uiFinanceViewFundAndBudget.gui,
        Permissions.uiFinanceViewLedger.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitForLedgerDetailsLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Organizations.deleteOrganizationViaApi(testData.organization.id);
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C356411 Rollover settings applying to encumbrances (thunderjet) (TaaS)',
      { tags: ['extendedPath', 'thunderjet', 'C356411'] },
      () => {
        FinanceHelper.searchByName(ledger.name);
        Ledgers.selectLedger(ledger.name);

        LedgerDetails.checkLedgerDetails({
          information: [{ key: 'Current fiscal year', value: fiscalYears.first.code }],
          financialSummary: {
            information: [{ key: 'Encumbered', value: '$50.00' }],
          },
        });

        const RolloverDetails = LedgerDetails.openLedgerRolloverEditForm();
        RolloverDetails.checkLedgerRolloverDetails({ fiscalYear: fiscalYears.first.code });
        RolloverDetails.verifyCheckboxState('restrictEncumbrance', true);
        RolloverDetails.verifyCheckboxState('needCloseBudgets', true);

        RolloverDetails.fillLedgerRolloverFields({
          fiscalYear: fiscalYears.second.code,
          rolloverBudgets: [
            {
              checked: false,
              rolloverBudget: 'None',
              rolloverValue: 'Transfer',
            },
          ],
        });

        RolloverDetails.clickRolloverButton();

        LedgerRolloverInProgress.checkLedgerRolloverInProgressDetails({ successful: true });

        LedgerRolloverInProgress.clickCloseAndViewLedgerButton();
        LedgerDetails.waitLoading();

        const fundDetails = LedgerDetails.openFundDetails(fund.name);

        const currentBudgetDetails = fundDetails.openCurrentBudgetDetails();
        currentBudgetDetails.checkBudgetDetails({
          information: [{ key: 'Status', value: 'Closed' }],
        });

        currentBudgetDetails.closeBudgetDetails();

        const plannedBudgetDetails = fundDetails.openPlannedBudgetDetails();
        plannedBudgetDetails.checkBudgetDetails({
          summary: [{ key: 'Encumbered', value: '$0.00' }],
        });

        plannedBudgetDetails.clickViewTransactionsLink();

        Transactions.selectTransactionTypeFilter('Encumbrance');
        Transactions.checkTransactionsByTypeAndAmount({
          records: [{ type: 'Encumbrance', amount: '$0.00' }],
        });
      },
    );
  });
});
