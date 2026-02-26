import uuid from 'uuid';
import {
  ACQUISITION_METHOD_NAMES_IN_PROFILE,
  LOCATION_NAMES,
  ORDER_STATUSES,
} from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import {
  Budgets,
  FiscalYears,
  Funds,
  LedgerRollovers,
  Ledgers,
} from '../../../../support/fragments/finance';
import FinanceHelp from '../../../../support/fragments/finance/financeHelper';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../../../support/fragments/organizations';
import ExpenseClasses from '../../../../support/fragments/settings/finance/expenseClasses';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import { CodeTools, StringTools } from '../../../../support/utils';
import FileManager from '../../../../support/utils/fileManager';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('Finance: Ledgers', () => {
  const date = new Date();
  const code = CodeTools(4);
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const testData = {
    organization,
    user: {},
  };
  const fiscalYears = {
    current: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}01`,
      periodStart: new Date(date.getFullYear(), 0, 1),
      periodEnd: new Date(date.getFullYear(), 11, 31),
    },
    next: {
      ...FiscalYears.getDefaultFiscalYear(),
      code: `${code}${StringTools.randomTwoDigitNumber()}02`,
      periodStart: new Date(date.getFullYear() + 1, 0, 1),
      periodEnd: new Date(date.getFullYear() + 1, 11, 31),
    },
  };
  const expenseClass1 = { ...ExpenseClasses.getDefaultExpenseClass() };
  const expenseClass2 = {
    ...ExpenseClasses.getDefaultExpenseClass(),
    name: `autotest_class_2_name_${getRandomPostfix()}`,
  };
  const firstOrder = {
    ...NewOrder.defaultOneTimeOrder,
    id: uuid(),
    approved: true,
    reEncumber: true,
    vendorId: testData.organization.id,
  };
  const secondOrder = {
    ...NewOrder.defaultOneTimeOrder,
    id: uuid(),
    approved: true,
    reEncumber: true,
    vendorId: testData.organization.id,
  };

  before('Setup test data', () => {
    cy.getAdminToken();
    ExpenseClasses.createExpenseClassViaApi(expenseClass1).then((ec1) => {
      testData.expenseClass1 = ec1;

      ExpenseClasses.createExpenseClassViaApi(expenseClass2).then((ec2) => {
        testData.expenseClass2 = ec2;

        // create first Fiscal Year with Expense Classes
        const { ledger, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
          fiscalYear: fiscalYears.current,
          ledger: { restrictEncumbrance: true, restrictExpenditures: true },
          budget: {
            allocated: 100,
            statusExpenseClasses: [
              {
                status: 'Active',
                expenseClassId: testData.expenseClass1.id,
              },
              {
                status: 'Active',
                expenseClassId: testData.expenseClass2.id,
              },
            ],
          },
        });
        testData.ledger = ledger;
        testData.fund = fund;

        // Create second Fiscal Year for Rollover
        FiscalYears.createViaApi(fiscalYears.next);
        Organizations.createOrganizationViaApi(organization).then((orgResp) => {
          organization.id = orgResp;
          firstOrder.vendor = orgResp;
          secondOrder.vendor = orgResp;

          cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((locationResp) => {
            cy.getAcquisitionMethodsApi({
              query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
            }).then((amResp) => {
              cy.getBookMaterialType().then((mtypeResp) => {
                const firstOrderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  cost: {
                    listUnitPrice: 25.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 25.0,
                  },
                  fundDistribution: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      expenseClassId: testData.expenseClass1.id,
                      value: 100,
                    },
                  ],
                  locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                  acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtypeResp.id,
                    materialSupplier: orgResp.id,
                    volumes: [],
                  },
                };

                // Create first open order
                Orders.createOrderViaApi(firstOrder).then((orderResp) => {
                  firstOrder.id = orderResp.id;
                  firstOrder.poNumber = orderResp.poNumber;
                  firstOrderLine.purchaseOrderId = orderResp.id;

                  OrderLines.createOrderLineViaApi(firstOrderLine);
                  Orders.updateOrderViaApi({
                    ...orderResp,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                });

                const secondOrderLine = {
                  ...BasicOrderLine.defaultOrderLine,
                  id: uuid(),
                  cost: {
                    listUnitPrice: 20.0,
                    currency: 'USD',
                    discountType: 'percentage',
                    quantityPhysical: 1,
                    poLineEstimatedPrice: 20.0,
                  },
                  fundDistribution: [
                    {
                      code: testData.fund.code,
                      fundId: testData.fund.id,
                      expenseClassId: testData.expenseClass2.id,
                      value: 100,
                    },
                  ],
                  locations: [{ locationId: locationResp.id, quantity: 1, quantityPhysical: 1 }],
                  acquisitionMethod: amResp.body.acquisitionMethods[0].id,
                  physical: {
                    createInventory: 'Instance, Holding, Item',
                    materialType: mtypeResp.id,
                    materialSupplier: orgResp.id,
                    volumes: [],
                  },
                };
                // Create second open order
                Orders.createOrderViaApi(secondOrder).then((orderResp) => {
                  secondOrder.id = orderResp.id;
                  secondOrder.poNumber = orderResp.poNumber;
                  secondOrderLine.purchaseOrderId = orderResp.id;

                  OrderLines.createOrderLineViaApi(secondOrderLine);
                  Orders.updateOrderViaApi({
                    ...orderResp,
                    workflowStatus: ORDER_STATUSES.OPEN,
                  });
                });
              });
            });
          });
        });

        cy.loginAsAdmin();
        cy.visit(TopMenu.fundPath);
        FinanceHelp.searchByName(testData.fund.name);
        Funds.selectFund(testData.fund.name);
        Funds.selectBudgetDetails();
        Funds.editBudget();
        Funds.changeStatusOfExpClassByName(expenseClass2.name, 'Inactive');

        const rollover = LedgerRollovers.generateLedgerRollover({
          ledger: testData.ledger,
          fromFiscalYear: fiscalYears.current,
          toFiscalYear: fiscalYears.next,
          restrictEncumbrance: true,
          restrictExpenditures: true,
          needCloseBudgets: true,
          budgetsRollover: [
            {
              rolloverAllocation: true,
              rolloverBudgetValue: 'None',
              addAvailableTo: 'Allocation',
            },
          ],
          encumbrancesRollover: [{ orderType: 'One-time', basedOn: 'InitialAmount' }],
        });
        LedgerRollovers.createLedgerRolloverViaApi(rollover);
        testData.fileName = `Export-${testData.ledger.code}-${fiscalYears.next.code}`;
      });

      FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears.current,
        _version: 1,
        periodStart: new Date(date.getFullYear() - 1, 0, 1),
        periodEnd: new Date(date.getFullYear() - 1, 11, 31),
      });

      FiscalYears.updateFiscalYearViaApi({
        ...fiscalYears.next,
        _version: 1,
        periodStart: new Date(date.getFullYear(), 0, 1),
        periodEnd: new Date(date.getFullYear(), 11, 31),
      });

      cy.createTempUser([
        Permissions.uiFinanceExportFinanceRecords.gui,
        Permissions.uiFinanceViewLedger.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.ledgerPath,
          waiter: Ledgers.waitForLedgerDetailsLoading,
        });
      });
    });
  });

  after('Clean up test data', () => {
    FileManager.deleteFile(`cypress/downloads/${testData.fileName}.csv`);
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C350975 Ledger export settings: last year Fund with budget, Print (Active) and Electronic (Inactive) Classes, Export settings- All statuses (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350975'] },
    () => {
      FinanceHelp.searchByName(testData.ledger.name);
      Ledgers.selectLedger(testData.ledger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.prepareExportSettings(fiscalYears.next.code, 'All', testData.ledger);
      Ledgers.checkColumnNamesInDownloadedLedgerExportFileWithExpClasses(
        `${testData.fileName}.csv`,
      );
      Ledgers.checkColumnContentInDownloadedLedgerExportFileWithExpClasses(
        `${testData.fileName}.csv`,
        expenseClass1.name,
        testData.fund,
        fiscalYears.next,
        '100',
        '100',
        '100',
        '0',
        '0',
        '100',
        '0',
        '100',
        '45',
        '0',
        '0',
        '45',
        '0',
        '0',
        '100',
        '55',
        expenseClass1.code,
        'Active',
        '25',
        '0',
        '0',
      );
      Ledgers.checkColumnContentInDownloadedLedgerExportFileWithExpClasses(
        `${testData.fileName}.csv`,
        expenseClass2.name,
        testData.fund,
        fiscalYears.next,
        '100',
        '100',
        '100',
        '0',
        '0',
        '100',
        '0',
        '100',
        '45',
        '0',
        '0',
        '45',
        '0',
        '0',
        '100',
        '55',
        expenseClass2.code,
        'Inactive',
        '20',
        '0',
        '0',
      );
    },
  );
});
