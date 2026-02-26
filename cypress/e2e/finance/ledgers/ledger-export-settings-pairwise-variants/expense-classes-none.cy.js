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

describe('Finance: Ledgers', () => {
  const date = new Date();
  const code = CodeTools(4);
  const organization = { ...NewOrganization.defaultUiOrganizations };
  const testData = {
    organization,
    user: {},
    expenseClass: {
      name: 'Electronic',
      code: 'Elec',
      status: 'Active',
      id: '',
    },
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
  const order = {
    ...NewOrder.defaultOneTimeOrder,
    id: uuid(),
    approved: true,
    reEncumber: true,
    vendorId: testData.organization.id,
  };

  before('Setup test data', () => {
    cy.getAdminToken();
    // create first Fiscal Year with Expense Classes
    ExpenseClasses.getExpenseClassesViaApi({
      query: `name=="${testData.expenseClass.name}"`,
      limit: 1,
    }).then((resp) => {
      testData.expenseClass.id = resp?.[0]?.id;

      const { ledger, fund } = Budgets.createBudgetWithFundLedgerAndFYViaApi({
        fiscalYear: fiscalYears.current,
        ledger: { restrictEncumbrance: true, restrictExpenditures: true },
        budget: {
          allocated: 100,
          statusExpenseClasses: [
            {
              status: 'Active',
              expenseClassId: testData.expenseClass.id,
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
        order.vendor = orgResp;

        cy.getLocations({ query: `name="${LOCATION_NAMES.ANNEX_UI}"` }).then((locationResp) => {
          cy.getAcquisitionMethodsApi({
            query: `value="${ACQUISITION_METHOD_NAMES_IN_PROFILE.PURCHASE_AT_VENDOR_SYSTEM}"`,
          }).then((amResp) => {
            cy.getBookMaterialType().then((mtypeResp) => {
              const orderLine = {
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
                    expenseClassId: testData.expenseClass.id,
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
              Orders.createOrderViaApi(order).then((orderResp) => {
                order.id = orderResp.id;
                order.poNumber = orderResp.poNumber;
                orderLine.purchaseOrderId = orderResp.id;

                OrderLines.createOrderLineViaApi(orderLine);
                Orders.updateOrderViaApi({
                  ...orderResp,
                  workflowStatus: ORDER_STATUSES.OPEN,
                });
              });
            });
          });
        });
      });
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

  after('Clean up test data', () => {
    FileManager.deleteFile(`cypress/downloads/${testData.fileName}.csv`);
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C350976 Ledger export settings: last year Fund with budget, Economic (Active) Class, Export settings; Expense classes- None (thunderjet) (TaaS)',
    { tags: ['extendedPath', 'thunderjet', 'C350976'] },
    () => {
      FinanceHelp.searchByName(testData.ledger.name);
      Ledgers.selectLedger(testData.ledger.name);
      Ledgers.exportBudgetInformation();
      Ledgers.prepareExportSettings(fiscalYears.next.code, 'None', testData.ledger);
      Ledgers.checkColumnNamesInDownloadedLedgerExportFileForNone(`${testData.fileName}.csv`);
      Ledgers.checkColumnContentInDownloadedLedgerExportFileForNone(
        `${testData.fileName}.csv`,
        1,
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
        '25',
        '0',
        '0',
        '25',
        '0',
        '0',
        '100',
        '75',
      );
    },
  );
});
