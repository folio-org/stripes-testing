import uuid from 'uuid';

import { Section } from '../../../interactors';
import {
  APPLICATION_NAMES,
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
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { DateTools, ExecutionFlowManager } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import FiltersPane from '../../support/fragments/filtersPane';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
// import Claiming from '../../support/fragments/claiming/claiming';

const FILTER_PANES_DICT = {
  CLAIMING: 'claiming-filters-pane',
  FISCAL_YEARS: 'fiscal-year-filters-pane',
  LEDGERS: 'ledger-filters-pane',
  GROUPS: 'group-filters-pane',
  FUNDS: 'fund-filters-pane',
  ORGANIZATIONS: 'organizations-filters-pane',
  ORDERS: 'orders-filters-pane',
  ORDER_LINES: 'order-lines-filters-pane',
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
      .step((currentFlow) => cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
        path: TopMenu.fiscalYearPath,
        waiter: FiscalYears.waitLoading,
      }));
  });

  after('Delete C1385303 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  const filterAndVerify = ({ step, value, expected, paneId }) => {
    const filtersPane = Section({ id: paneId });

    cy.log(`<--- STEP ${step}: Filter by ${value} --->`);
    cy.wait(DEFAULT_WAIT_TIME);
    FiltersPane.filterBySelection(filtersPane, ACQUISITION_UNIT_FILTER_LABEL, value);
    cy.contains(expected).should('be.visible');
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
      Invoices.searchByNumber(invoiceWithUnit.vendorInvoiceNo);
      Invoices.selectInvoice(invoiceWithUnit.vendorInvoiceNo);
      Invoices.openPolSearchPlugin();

      cy.log(`<--- DEBUG STEP 15-16.1: Filter by ${unitName} --->`);
      SelectOrderLinesModal.filterByAcqUnit(unitName);
      cy.contains(lineWithUnit.poLineNumber).should('be.visible');
      SelectOrderLinesModal.clearAllFilters();

      cy.log(`<--- DEBUG STEP 15-16.2: Filter by ${NO_ACQUISITION_UNIT_OPTION_LABEL} --->`);
      SelectOrderLinesModal.filterByAcqUnit(NO_ACQUISITION_UNIT_OPTION_LABEL);
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
