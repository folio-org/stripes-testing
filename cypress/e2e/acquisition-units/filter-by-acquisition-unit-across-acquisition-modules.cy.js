import uuid from 'uuid';

import { Button, SearchField, Section } from '../../../interactors';
import {
  APPLICATION_NAMES,
  COMMON_BUTTON_LABELS,
  DEFAULT_WAIT_TIME,
  NO_ACQUISITION_UNIT_OPTION_LABEL,
  POL_CREATE_INVENTORY_SETTINGS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import {
  FinanceHelper,
  FiscalYears,
  Funds,
  Groups,
  Ledgers,
} from '../../support/fragments/finance';
import { Invoices } from '../../support/fragments/invoices';
import {
  BasicOrderLine,
  NewOrder,
  OrderHelper,
  OrderLines,
  Orders,
} from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import FiltersPane from '../../support/fragments/filtersPane';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Claiming from '../../support/fragments/claiming/claiming';
import { Receivings } from '../../support/fragments/receiving';

const FILTER_PANES_DICT = {
  CLAIMING: 'claiming-filters-pane',
  FISCAL_YEARS: 'fiscal-year-filters-pane',
  LEDGERS: 'ledger-filters-pane',
  GROUPS: 'group-filters-pane',
  FUNDS: 'fund-filters-pane',
  ORGANIZATIONS: 'organizations-filters-pane',
  ORDERS: 'orders-filters-pane',
  ORDER_LINES: 'order-lines-filters-pane',
  ORDER_LINES_PLUGIN: 'ORDER_LINES_PLUGIN',
  RECEIVING: 'receiving-filters-pane',
  INVOICES: 'invoice-filters-pane',
};

const R = {
  ACQUISITION_UNIT: 'acquisitionUnit',
  ADMIN: 'admin',
  FISCAL_YEARS: 'fiscalYears',
  LEDGERS: 'ledgers',
  GROUPS: 'groups',
  FUNDS: 'funds',
  ORGANIZATIONS: 'organizations',
  ORDERS: 'orders',
  LINES: 'lines',
  INVOICES: 'invoices',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ACQUISITION_METHOD: 'acquisitionMethod',
  USER: 'user',
};

const ACQUISITION_UNIT_FILTER_LABEL = 'Acquisition unit';

/* Intercept filters' requests to wait before applying filters */
const interceptQueries = () => {
  AcquisitionUnits.interceptGetAcquisitionUnits();
  Claiming.interceptGetClaimingPieces();
  FinanceHelper.interceptGetExpenseClassesRequest();
  FinanceHelper.interceptGetFiscalYearsRequest();
  FinanceHelper.interceptGetLedgersRequest();
  FinanceHelper.interceptGetGroupsRequest();
  FinanceHelper.interceptFundsRequest();
  FinanceHelper.interceptGetFundTypesRequest();
  Invoices.interceptGetBatchGroups();
  Invoices.interceptGetInvoices();
  OrderHelper.interceptGetAcquisitionMethods();
  OrderHelper.interceptCustomFields();
  OrderHelper.interceptGetLocations();
  OrderHelper.interceptGetMaterialTypes();
  OrderHelper.interceptGetOrders();
  OrderHelper.interceptGetOrderLines();
  OrderHelper.interceptGetOrdersStorageSettings();
  OrderHelper.interceptGetPrefixes();
  OrderHelper.interceptGetReasonsForClosure();
  OrderHelper.interceptGetSuffixes();
  OrderHelper.interceptGetSettingsEntries();
  OrderHelper.interceptGetTags();
  OrderHelper.interceptGetTenantAddresses();
  Organizations.interceptGetOrganizationTypes();
  Organizations.interceptGetOrganizations();
  Receivings.interceptGetReceivingTitles();
};

// To make tests more stable we should wait for pending request to enable inputs on UI
const WAITERS_DICT = {
  [FILTER_PANES_DICT.CLAIMING]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      OrderHelper.waitForCustomFieldsQueryCompleted();
      OrderHelper.waitForGetLocationsQueryCompleted();
      OrderHelper.waitForMaterialTypesQueryCompleted();
      OrderHelper.waitForSettingsEntriesQueryCompleted();
      OrderHelper.waitForTagsQueryCompleted();
      OrderHelper.waitForTenantAddressesQueryCompleted();
      Organizations.waitForOrganizationsQueryCompleted();
    },
    results: () => {
      Claiming.waitForGetClaimingPiecesQueryCompleted();
      Organizations.waitForOrganizationsQueryCompleted();
    },
  },
  [FILTER_PANES_DICT.FISCAL_YEARS]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
    },
    results: () => {
      FinanceHelper.waitForGetFiscalYearsRequestCompletion();
    },
  },
  [FILTER_PANES_DICT.FUNDS]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      FinanceHelper.waitForGetFundTypesRequestCompletion();
      FinanceHelper.waitForGetGroupsRequestCompletion();
      FinanceHelper.waitForGetLedgersRequestCompletion();
      OrderHelper.waitForSettingsEntriesQueryCompleted();
      OrderHelper.waitForTagsQueryCompleted();
    },
    results: () => {
      FinanceHelper.waitForFundsRequestCompletion();
      FinanceHelper.waitForGetLedgersRequestCompletion();
    },
  },
  [FILTER_PANES_DICT.GROUPS]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
    },
    results: () => {
      FinanceHelper.waitForGetGroupsRequestCompletion();
    },
  },
  [FILTER_PANES_DICT.INVOICES]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      FinanceHelper.waitForGetExpenseClassesRequestCompletion();
      FinanceHelper.waitForGetFiscalYearsRequestCompletion();
      FinanceHelper.waitForFundsRequestCompletion();
      Invoices.waitForBatchGroupsQueryCompleted();
      OrderHelper.waitForSettingsEntriesQueryCompleted();
      OrderHelper.waitForTagsQueryCompleted();
    },
    results: () => {
      Invoices.waitForInvoiceQueryCompleted();
      Organizations.waitForOrganizationsQueryCompleted();
    },
  },
  [FILTER_PANES_DICT.LEDGERS]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
    },
    results: () => {
      FinanceHelper.waitForGetLedgersRequestCompletion();
    },
  },
  [FILTER_PANES_DICT.ORDERS]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      FinanceHelper.waitForFundsRequestCompletion();
      OrderHelper.waitForCustomFieldsQueryCompleted();
      OrderHelper.waitForPrefixesQueryCompleted();
      OrderHelper.waitForReasonsForClosureQueryCompleted();
      OrderHelper.waitForSettingsEntriesQueryCompleted();
      OrderHelper.waitForSuffixesQueryCompleted();
      OrderHelper.waitForTenantAddressesQueryCompleted();
      OrderHelper.waitForTagsQueryCompleted();
    },
    results: (acqUnitValue) => {
      if (acqUnitValue !== NO_ACQUISITION_UNIT_OPTION_LABEL) {
        AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      }

      OrderHelper.waitForOrdersQueryCompleted();
      Organizations.waitForOrganizationsQueryCompleted();
      cy.wait(DEFAULT_WAIT_TIME);
    },
  },
  [FILTER_PANES_DICT.ORDER_LINES]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      FinanceHelper.waitForGetExpenseClassesRequestCompletion();
      FinanceHelper.waitForFundsRequestCompletion();
      OrderHelper.waitForAcquisitionMethodsQueryCompleted();
      OrderHelper.waitForCustomFieldsQueryCompleted();
      OrderHelper.waitForGetLocationsQueryCompleted();
      OrderHelper.waitForMaterialTypesQueryCompleted();
      OrderHelper.waitForPrefixesQueryCompleted();
      OrderHelper.waitForSuffixesQueryCompleted();
      OrderHelper.waitForSettingsEntriesQueryCompleted();
      OrderHelper.waitForTagsQueryCompleted();
    },
    results: (acqUnitValue) => {
      if (acqUnitValue !== NO_ACQUISITION_UNIT_OPTION_LABEL) {
        AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      }

      OrderHelper.waitForOrderLinesQueryCompleted();
      OrderHelper.waitForOrdersQueryCompleted();
      cy.wait(DEFAULT_WAIT_TIME);
    },
  },
  [FILTER_PANES_DICT.ORDER_LINES_PLUGIN]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      FinanceHelper.waitForGetExpenseClassesRequestCompletion();
      FinanceHelper.waitForFundsRequestCompletion();
      OrderHelper.waitForAcquisitionMethodsQueryCompleted();
      OrderHelper.waitForGetLocationsQueryCompleted();
      OrderHelper.waitForMaterialTypesQueryCompleted();
      OrderHelper.waitForPrefixesQueryCompleted();
      OrderHelper.waitForSuffixesQueryCompleted();
      OrderHelper.waitForSettingsEntriesQueryCompleted();
      OrderHelper.waitForTagsQueryCompleted();
    },
    results: () => {
      OrderHelper.waitForOrderLinesQueryCompleted();
      OrderHelper.waitForOrdersQueryCompleted();
    },
  },
  [FILTER_PANES_DICT.ORGANIZATIONS]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      OrderHelper.waitForSettingsEntriesQueryCompleted();
      OrderHelper.waitForTagsQueryCompleted();
      Organizations.waitForOrganizationTypesQueryCompleted();
    },
    results: () => {
      Organizations.waitForOrganizationsQueryCompleted();
    },
  },
  [FILTER_PANES_DICT.RECEIVING]: {
    filters: () => {
      AcquisitionUnits.waitForAcquisitionUnitsQueryCompleted();
      OrderHelper.waitForGetLocationsQueryCompleted();
      OrderHelper.waitForMaterialTypesQueryCompleted();
      OrderHelper.waitForSettingsEntriesQueryCompleted();
      OrderHelper.waitForTagsQueryCompleted();
    },
    results: () => {
      OrderHelper.waitForGetLocationsQueryCompleted();
      OrderHelper.waitForOrdersQueryCompleted();
      OrderHelper.waitForOrderLinesQueryCompleted();
      Receivings.waitForReceivingTitlesQueryCompleted();
    },
  },
};

describe('Acquisition units', () => {
  const flow = new ExecutionFlowManager();
  const postfix = getRandomPostfix();

  before('Create C1385303 preconditions', () => {
    cy.clearAllLocalStorage();
    cy.getAdminToken();
    cy.getAdminUserDetails().then((record) => flow.set(R.ADMIN, record));

    flow
      .step((currentFlow) => {
        return AcquisitionUnits.createAcquisitionUnitViaApi(
          AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: false }),
        )
          .then((unit) => currentFlow.set(R.ACQUISITION_UNIT, unit, () => AcquisitionUnits.deleteAcquisitionUnitViaApi(unit.id, false)))
          .then(() => {
            AcquisitionUnits.assignUserViaApi(
              currentFlow.get(R.ADMIN).id,
              currentFlow.get(R.ACQUISITION_UNIT).id,
            );
          });
      })
      .step((currentFlow) => {
        const years = [];
        return cy
          .wrap([0, 1])
          .each((index) => FiscalYears.createViaApi({
            ...FiscalYears.getDefaultFiscalYear(),
            id: uuid(),
            name: `AT_C1385303_FY_${index}_${postfix}`,
            code: DateTools.getRandomFiscalYearCode(2000, 2100),
            acqUnitIds: index === 0 ? [currentFlow.get(R.ACQUISITION_UNIT).id] : [],
          }).then((year) => years.push(year)))
          .then(() => currentFlow.set(R.FISCAL_YEARS, years, () => years.forEach(({ id }) => FiscalYears.deleteFiscalYearViaApi(id, false))));
      })
      .step((currentFlow) => {
        const ledgers = [];
        return cy
          .wrap([0, 1])
          .each((index) => Ledgers.createViaApi({
            ...Ledgers.getDefaultLedger(),
            id: uuid(),
            name: `AT_C1385303_Ledger_${index}_${postfix}`,
            code: `L${index}${postfix}`.slice(0, 10),
            fiscalYearOneId: currentFlow.get(R.FISCAL_YEARS)[index].id,
            acqUnitIds: index === 0 ? [currentFlow.get(R.ACQUISITION_UNIT).id] : [],
          }).then((ledger) => ledgers.push(ledger)))
          .then(() => currentFlow.set(R.LEDGERS, ledgers, () => ledgers.forEach(({ id }) => Ledgers.deleteLedgerViaApi(id, false))));
      })
      .step((currentFlow) => {
        const groups = [];
        return cy
          .wrap([0, 1])
          .each((index) => Groups.createViaApi({
            ...Groups.getDefaultGroup(),
            name: `AT_C1385303_Group_${index}_${postfix}`,
            acqUnitIds: index === 0 ? [currentFlow.get(R.ACQUISITION_UNIT).id] : [],
          }).then((group) => groups.push(group)))
          .then(() => currentFlow.set(R.GROUPS, groups, () => groups.forEach(({ id }) => Groups.deleteGroupViaApi(id))));
      })
      .step((currentFlow) => {
        const funds = [];
        return cy
          .wrap([0, 1])
          .each((index) => Funds.createViaApi({
            ...Funds.getDefaultFund(),
            id: uuid(),
            name: `AT_C1385303_Fund_${index}_${postfix}`,
            code: `F${index}${postfix}`.slice(0, 10),
            ledgerId: currentFlow.get(R.LEDGERS)[index].id,
            acqUnitIds: index === 0 ? [currentFlow.get(R.ACQUISITION_UNIT).id] : [],
          }).then(({ fund }) => funds.push(fund)))
          .then(() => currentFlow.set(R.FUNDS, funds, () => funds.forEach(({ id }) => Funds.deleteFundViaApi(id, false))));
      })
      .step((currentFlow) => {
        const organizations = [];
        return cy
          .wrap([0, 1])
          .each((index) => {
            const organization = {
              ...NewOrganization.defaultUiOrganizations,
              name: `AT_C1385303_Organization_${index}_${postfix}`,
              code: `AT_C1385303_${index}_${postfix}`,
              acqUnitIds: index === 0 ? [currentFlow.get(R.ACQUISITION_UNIT).id] : [],
            };
            return Organizations.createOrganizationViaApi(organization).then((id) => organizations.push({ ...organization, id }));
          })
          .then(() => currentFlow.set(R.ORGANIZATIONS, organizations, () => organizations.forEach(({ id }) => Organizations.deleteOrganizationViaApi(id))));
      })
      .step((currentFlow) => cy.getLocations({ limit: 1 }).then((location) => currentFlow.set(R.LOCATION, location)))
      .step((currentFlow) => cy
        .getDefaultMaterialType()
        .then((materialType) => currentFlow.set(R.MATERIAL_TYPE, materialType)))
      .step((currentFlow) => cy
        .getAcquisitionMethodsApi()
        .then(({ body }) => currentFlow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0])))
      .step((currentFlow) => {
        const orders = [];
        return cy
          .wrap([0, 1])
          .each((index) => Orders.createOrderViaApi({
            ...NewOrder.getDefaultOrder({ vendorId: currentFlow.get(R.ORGANIZATIONS)[index].id }),
            id: uuid(),
            acqUnitIds: index === 0 ? [currentFlow.get(R.ACQUISITION_UNIT).id] : [],
          }).then((order) => orders.push(order)))
          .then(() => currentFlow.set(R.ORDERS, orders, () => orders.forEach(({ id }) => Orders.deleteOrderViaApi(id, false))));
      })
      .step((currentFlow) => {
        const lines = [];
        return cy
          .wrap(currentFlow.get(R.ORDERS))
          .each((order, index) => OrderLines.createOrderLineViaApi({
            ...BasicOrderLine.defaultOrderLine,
            id: uuid(),
            purchaseOrderId: order.id,
            acquisitionMethod: currentFlow.get(R.ACQUISITION_METHOD).id,
            titleOrPackage: `AT_C1385303_POL_${index}_${postfix}`,
            claimingActive: true,
            claimingInterval: 30,
            locations: [
              {
                locationId: currentFlow.get(R.LOCATION).id,
                quantity: 2,
                quantityPhysical: 2,
              },
            ],
            physical: {
              createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
              materialType: currentFlow.get(R.MATERIAL_TYPE).id,
              materialSupplier: currentFlow.get(R.ORGANIZATIONS)[index].id,
              volumes: [],
            },
          }).then((line) => lines.push(line)))
          .then(() => currentFlow.set(R.LINES, lines));
      })
      .step((currentFlow) => {
        const invoices = [];
        return cy
          .wrap([0, 1])
          .each((index) => Invoices.createInvoiceViaApi({
            vendorId: currentFlow.get(R.ORGANIZATIONS)[index].id,
            accountingCode: currentFlow.get(R.ORGANIZATIONS)[index].erpCode,
            fiscalYearId: currentFlow.get(R.FISCAL_YEARS)[index].id,
            acqUnitIds: index === 0 ? [currentFlow.get(R.ACQUISITION_UNIT).id] : [],
          }).then((invoice) => invoices.push(invoice)))
          .then(() => currentFlow.set(R.INVOICES, invoices, () => invoices.forEach(({ id }) => Invoices.deleteInvoiceViaApi(id))));
      })
      .step((currentFlow) => cy
        .createTempUser([
          Permissions.uiClaimingView.gui,
          Permissions.uiFinanceViewFiscalYear.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiFinanceViewGroups.gui,
          Permissions.uiFinanceViewLedger.gui,
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
          Permissions.uiOrdersView.gui,
          Permissions.uiOrganizationsView.gui,
          Permissions.uiReceivingView.gui,
        ])
        .then((user) => currentFlow.set(R.USER, user, () => Users.deleteViaApi(user.userId))))
      .step((currentFlow) => {
        interceptQueries();

        cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
          path: TopMenu.fiscalYearPath,
          waiter: FiscalYears.waitLoading,
        });
      });
  });

  after('Delete C1385303 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  const filterAndVerify = ({ step, value, expected, paneId }) => {
    const filtersPane = Section({ id: paneId });
    const searchInput = SearchField({ id: 'input-record-search' });
    const { results: waitResults } = WAITERS_DICT[paneId];

    cy.log(`<--- STEP ${step}: Filter by ${value} --->`);
    FiltersPane.filterBySelection(filtersPane, ACQUISITION_UNIT_FILTER_LABEL, value);
    waitResults(value);
    FiltersPane.assertResetAllButtonState(filtersPane, { disabled: false });

    /* Additionally filter by entity value to avoid pagination issues */
    cy.do([
      searchInput.fillIn(expected),
      filtersPane.find(Button(COMMON_BUTTON_LABELS.SEARCH)).click(),
    ]);
    waitResults(value);

    cy.contains('section[id$="results-pane"]', expected).should('be.visible');
    FiltersPane.assertResetAllButtonState(filtersPane, { disabled: false });
    FiltersPane.clearAllFilters(filtersPane);
  };

  it(
    'C1385303 Filter by Acquisition unit across acquisition modules (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1385303'] },
    () => {
      const unitName = flow.get(R.ACQUISITION_UNIT).name;
      const [yearWithUnit, yearWithoutUnit] = flow.get(R.FISCAL_YEARS);
      const [ledgerWithUnit, ledgerWithoutUnit] = flow.get(R.LEDGERS);
      const [groupWithUnit, groupWithoutUnit] = flow.get(R.GROUPS);
      const [fundWithUnit, fundWithoutUnit] = flow.get(R.FUNDS);
      const [orgWithUnit, orgWithoutUnit] = flow.get(R.ORGANIZATIONS);
      const [orderWithUnit, orderWithoutUnit] = flow.get(R.ORDERS);
      const [lineWithUnit, lineWithoutUnit] = flow.get(R.LINES);
      const [invoiceWithUnit, invoiceWithoutUnit] = flow.get(R.INVOICES);

      WAITERS_DICT[FILTER_PANES_DICT.FISCAL_YEARS].filters();
      filterAndVerify({
        step: 1,
        paneId: FILTER_PANES_DICT.FISCAL_YEARS,
        expected: yearWithUnit.name,
        value: unitName,
      });
      filterAndVerify({
        step: 2,
        expected: yearWithoutUnit.name,
        paneId: FILTER_PANES_DICT.FISCAL_YEARS,
        value: NO_ACQUISITION_UNIT_OPTION_LABEL,
      });

      FinanceHelper.selectLedgersNavigation();
      WAITERS_DICT[FILTER_PANES_DICT.LEDGERS].filters();
      filterAndVerify({
        step: 3,
        value: unitName,
        expected: ledgerWithUnit.name,
        paneId: FILTER_PANES_DICT.LEDGERS,
      });
      filterAndVerify({
        step: 4,
        value: NO_ACQUISITION_UNIT_OPTION_LABEL,
        expected: ledgerWithoutUnit.name,
        paneId: FILTER_PANES_DICT.LEDGERS,
      });

      FinanceHelper.selectGroupsNavigation();
      WAITERS_DICT[FILTER_PANES_DICT.GROUPS].filters();
      filterAndVerify({
        step: 5,
        value: unitName,
        expected: groupWithUnit.name,
        paneId: FILTER_PANES_DICT.GROUPS,
      });
      filterAndVerify({
        step: 6,
        value: NO_ACQUISITION_UNIT_OPTION_LABEL,
        expected: groupWithoutUnit.name,
        paneId: FILTER_PANES_DICT.GROUPS,
      });

      FinanceHelper.selectFundsNavigation();
      WAITERS_DICT[FILTER_PANES_DICT.FUNDS].filters();
      filterAndVerify({
        step: 7,
        value: unitName,
        expected: fundWithUnit.name,
        paneId: FILTER_PANES_DICT.FUNDS,
      });
      filterAndVerify({
        step: 8,
        value: NO_ACQUISITION_UNIT_OPTION_LABEL,
        expected: fundWithoutUnit.name,
        paneId: FILTER_PANES_DICT.FUNDS,
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORGANIZATIONS);
      Organizations.waitLoading();
      WAITERS_DICT[FILTER_PANES_DICT.ORGANIZATIONS].filters();
      filterAndVerify({
        step: 9.1,
        value: unitName,
        expected: orgWithUnit.name,
        paneId: FILTER_PANES_DICT.ORGANIZATIONS,
      });
      filterAndVerify({
        step: 9.2,
        value: NO_ACQUISITION_UNIT_OPTION_LABEL,
        expected: orgWithoutUnit.name,
        paneId: FILTER_PANES_DICT.ORGANIZATIONS,
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.ORDERS);
      OrderLines.waitLoading();
      WAITERS_DICT[FILTER_PANES_DICT.ORDER_LINES].filters();
      filterAndVerify({
        step: 11.1,
        value: unitName,
        expected: lineWithUnit.poLineNumber,
        paneId: FILTER_PANES_DICT.ORDER_LINES,
      });
      filterAndVerify({
        step: 11.2,
        value: NO_ACQUISITION_UNIT_OPTION_LABEL,
        expected: lineWithoutUnit.poLineNumber,
        paneId: FILTER_PANES_DICT.ORDER_LINES,
      });

      OrderLines.selectOrders();
      WAITERS_DICT[FILTER_PANES_DICT.ORDERS].filters();
      filterAndVerify({
        step: 10.1,
        value: unitName,
        expected: orderWithUnit.poNumber,
        paneId: FILTER_PANES_DICT.ORDERS,
      });
      filterAndVerify({
        step: 10.2,
        value: NO_ACQUISITION_UNIT_OPTION_LABEL,
        expected: orderWithoutUnit.poNumber,
        paneId: FILTER_PANES_DICT.ORDERS,
      });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
      WAITERS_DICT[FILTER_PANES_DICT.RECEIVING].filters();
      filterAndVerify({
        step: 12.1,
        value: unitName,
        expected: lineWithUnit.titleOrPackage,
        paneId: FILTER_PANES_DICT.RECEIVING,
      });
      filterAndVerify({
        step: 12.2,
        value: NO_ACQUISITION_UNIT_OPTION_LABEL,
        expected: lineWithoutUnit.titleOrPackage,
        paneId: FILTER_PANES_DICT.RECEIVING,
      });

      // TODO: Uncomment after https://folio-org.atlassian.net/browse/MODORDERS-1464
      // cy.log('<--- STEPS 13: Filter Claiming by Acquisition unit --->');
      // TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CLAIMING);
      // Claiming.waitLoading();
      // WAITERS_DICT[FILTER_PANES_DICT.CLAIMING].filters();
      // filterAndVerify({
      //   step: 13.1,
      //   value: unitName,
      //   expected: lineWithUnit.poLineNumber,
      //   paneId: FILTER_PANES_DICT.CLAIMING,
      // });
      // filterAndVerify({
      //   step: 13.2,
      //   value: NO_ACQUISITION_UNIT_OPTION_LABEL,
      //   expected: lineWithoutUnit.poLineNumber,
      //   paneId: FILTER_PANES_DICT.CLAIMING,
      // });

      TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVOICES);
      Invoices.waitLoading();
      WAITERS_DICT[FILTER_PANES_DICT.INVOICES].filters();
      Invoices.searchByNumber(invoiceWithUnit.vendorInvoiceNo);
      Invoices.selectInvoice(invoiceWithUnit.vendorInvoiceNo);
      Invoices.openPolSearchPlugin();

      cy.log(`<--- DEBUG STEP 15-16.1: Filter by ${unitName} --->`);
      WAITERS_DICT[FILTER_PANES_DICT.ORDER_LINES_PLUGIN].filters();
      SelectOrderLinesModal.filterByAcqUnit(unitName);
      WAITERS_DICT[FILTER_PANES_DICT.ORDER_LINES_PLUGIN].results();
      cy.contains(lineWithUnit.poLineNumber).should('be.visible');
      SelectOrderLinesModal.clearAllFilters();

      cy.log(`<--- DEBUG STEP 15-16.2: Filter by ${NO_ACQUISITION_UNIT_OPTION_LABEL} --->`);
      SelectOrderLinesModal.filterByAcqUnit(NO_ACQUISITION_UNIT_OPTION_LABEL);
      WAITERS_DICT[FILTER_PANES_DICT.ORDER_LINES_PLUGIN].results();
      cy.contains(lineWithoutUnit.poLineNumber).should('be.visible');
      SelectOrderLinesModal.closeModal();
      Invoices.resetFilters();

      filterAndVerify({
        step: 14.1,
        value: unitName,
        expected: invoiceWithUnit.vendorInvoiceNo,
        paneId: FILTER_PANES_DICT.INVOICES,
      });
      filterAndVerify({
        step: 14.2,
        value: NO_ACQUISITION_UNIT_OPTION_LABEL,
        expected: invoiceWithoutUnit.vendorInvoiceNo,
        paneId: FILTER_PANES_DICT.INVOICES,
      });
    },
  );
});
