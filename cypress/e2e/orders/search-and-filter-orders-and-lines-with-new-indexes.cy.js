import uuid from 'uuid';

import {
  APPLICATION_NAMES,
  CLAIMING_FILTER_LABELS,
  ORDER_FILTER_LABELS,
  ORDER_LINE_FILTER_LABELS,
  ORDER_LINE_SEARCH_INDEX_LABELS,
  ORDER_SEARCH_OPTIONS,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_PIECE_STATUSES,
  RECEIVING_TITLE_SEARCH_INDEX_LABELS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Claiming from '../../support/fragments/claiming/claiming';
import { Budgets, FiscalYears, Funds, Ledgers } from '../../support/fragments/finance';
import BrowseContributors from '../../support/fragments/inventory/search/browseContributors';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import { InvoiceView, Invoices } from '../../support/fragments/invoices';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import { ExpenseClasses } from '../../support/fragments/settings/finance';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../support/utils';
import InteractorsTools from '../../support/utils/interactorsTools';
import getRandomPostfix from '../../support/utils/stringTools';
import { SettingsOrders } from '../../support/fragments/settings/orders';
import { formatDate } from '../../support/utils/acquisitions';

const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;
const {
  CONTRIBUTOR,
  DONOR_DEPRECATED,
  KEYWORD,
  POL_NUMBER,
  PUBLISHER,
  REQUESTER,
  SELECTOR,
  TITLE_OR_PACKAGE,
  VENDOR_ACCOUNT,
  VENDOR_REF_NUMBER,
  VOLUMES,
} = ORDER_LINE_SEARCH_INDEX_LABELS;

const R = {
  ORGANIZATION: 'organization',
  LOCATIONS: 'locations',
  MATERIAL_TYPE: 'materialType',
  ACQUISITION_METHOD: 'acquisitionMethod',
  CONTRIBUTOR_NAME_TYPE: 'contributorNameType',
  PACKAGE_INSTANCE: 'packageInstance',
  FISCAL_YEAR: 'fiscalYear',
  LEDGER: 'ledger',
  FUNDS: 'funds',
  BUDGETS: 'budgets',
  EXPENSE_CLASSES: 'expenseClasses',
  TAGS: 'tags',
  ORDERS: 'orders',
  LINES: 'lines',
  LOCALE: 'locale',
  INVOICE: 'invoice',
  USER: 'user',
};

describe('Orders', () => {
  const flow = new ExecutionFlowManager();
  // PO numbers accept only alphanumeric characters and are limited to 22 characters.
  // getRandomPostfix() may contain a decimal point, so keep a short numeric suffix for all data.
  const postfix = String(getRandomPostfix()).replace(/\D/g, '').slice(-8);
  // Retain the TestRail case's significant endings (100AB and 101), while a unique common
  // prefix prevents this broad wildcard-search test from colliding with parallel runs.
  const poNumberPrefix = `2${postfix.slice(-5)}`;
  const poNumbers = [`${poNumberPrefix}100AB`, `${poNumberPrefix}101`];
  const titles = [
    `Frauen in Österreich / Susanne Feigl ; [1], 1975 - 1985 ${postfix}`,
    `Springer eBook Collection 2026 ${postfix}`,
  ];
  const receivingTitles = [titles[0], `Springer package title ${postfix}`];

  const createLine = (order, index) => OrderLines.createOrderLineViaApi({
    ...BasicOrderLine.defaultOrderLine,
    id: uuid(),
    purchaseOrderId: order.id,
    isPackage: index === 1,
    acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
    titleOrPackage: titles[index],
    claimingActive: true,
    claimingInterval: 30,
    cost: {
      ...BasicOrderLine.defaultOrderLine.cost,
      quantityPhysical: index === 0 ? 2 : 1,
      poLineEstimatedPrice: index === 0 ? 2 : 1,
    },
    fundDistribution:
        index === 0
          ? [
            {
              fundId: flow.get(R.FUNDS)[0].id,
              code: flow.get(R.FUNDS)[0].code,
              expenseClassId: flow.get(R.EXPENSE_CLASSES)[0].id,
              value: 100,
            },
          ]
          : [
            {
              fundId: flow.get(R.FUNDS)[0].id,
              code: flow.get(R.FUNDS)[0].code,
              expenseClassId: flow.get(R.EXPENSE_CLASSES)[1].id,
              value: 50,
            },
            {
              fundId: flow.get(R.FUNDS)[1].id,
              code: flow.get(R.FUNDS)[1].code,
              value: 50,
            },
          ],
    tags: {
      tagList:
          index === 0
            ? [flow.get(R.TAGS)[2].label, flow.get(R.TAGS)[3].label]
            : [flow.get(R.TAGS)[3].label],
    },
    donor: index === 0 ? 'Test donor' : undefined,
    publisher: index === 0 ? 'Jane, Smith' : undefined,
    requester: index === 0 ? 'Meg Ryan' : undefined,
    selector: index === 0 ? 'Steve Irwin' : undefined,
    contributors:
        index === 0
          ? [
            {
              contributor: 'Harry Jay',
              contributorNameTypeId: flow.get(R.CONTRIBUTOR_NAME_TYPE).id,
            },
          ]
          : [],
    vendorDetail: {
      vendorAccount: index === 0 ? '123-58' : '',
      referenceNumbers:
          index === 0
            ? [
              {
                refNumber: '205885-CA',
                refNumberType: 'Vendor order reference number',
                vendorDetailsSource: 'OrderLine',
              },
            ]
            : [],
    },
    locations: flow
      .get(R.LOCATIONS)
      .slice(index === 0 ? 0 : 2, index === 0 ? 2 : 3)
      .map(({ id }) => ({
        locationId: id,
        quantity: 1,
        quantityPhysical: 1,
      })),
    physical: {
      createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
      materialType: flow.get(R.MATERIAL_TYPE).id,
      materialSupplier: flow.get(R.ORGANIZATION).id,
      volumes: [index === 0 ? 'Vol.III' : 'Vol.25'],
    },
  });

  before('Create C1375887 preconditions', () => {
    cy.getAdminToken();
    cy.clearAllLocalStorage();
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      .step(() => {
        SettingsOrders.setUserCanEditPONumberViaApi(true);
      })
      .step((currentFlow) => {
        const defaultOrganization = NewOrganization.getDefaultOrganization({ accounts: 1 });
        const organization = {
          ...defaultOrganization,
          name: `AT_C1375887_Vendor_${postfix}`,
          accounts: defaultOrganization.accounts.map((account) => ({
            ...account,
            accountNo: '123-58',
          })),
        };
        return Organizations.createOrganizationViaApi(organization).then((id) => currentFlow.set(R.ORGANIZATION, { ...organization, id }, () => Organizations.deleteOrganizationViaApi(id)));
      })
      .step((currentFlow) => cy
        .getLocations({ limit: 3 })
        .then(() => currentFlow.set(R.LOCATIONS, Cypress.env('locations'))))
      .step((currentFlow) => cy
        .getDefaultMaterialType()
        .then((materialType) => currentFlow.set(R.MATERIAL_TYPE, materialType)))
      .step((currentFlow) => cy
        .getAcquisitionMethodsApi({ query: 'value="Other"' })
        .then(({ body }) => currentFlow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0])))
      .step((currentFlow) => BrowseContributors.getContributorNameTypes().then(([nameType]) => currentFlow.set(R.CONTRIBUTOR_NAME_TYPE, nameType)))
      .step((currentFlow) => InventoryInstance.createInstanceViaApi({
        instanceTitle: receivingTitles[1],
      }).then(({ instanceData }) => currentFlow.set(R.PACKAGE_INSTANCE, instanceData, () => InventoryInstance.deleteInstanceViaApi(instanceData.instanceId))))
      .step((currentFlow) => {
        const tags = [];

        return cy
          .wrap([1, 2, 3, 'isolation'])
          .each((number) => {
            const label = `AT_C1375887_Tag_${number}_${postfix}`;
            return cy.createTagApi({ label }).then((id) => tags.push({ id, label }));
          })
          .then(() => currentFlow.set(R.TAGS, tags, () => tags.forEach(({ id }) => cy.deleteTagApi(id, true))));
      })
      .step((currentFlow) => FiscalYears.createViaApi(FiscalYears.getDefaultFiscalYear()).then((fiscalYear) => currentFlow.set(R.FISCAL_YEAR, fiscalYear, () => FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false))))
      .step((currentFlow) => Ledgers.createViaApi({
        ...Ledgers.getDefaultLedger(),
        fiscalYearOneId: currentFlow.get(R.FISCAL_YEAR).id,
      }).then((ledger) => currentFlow.set(R.LEDGER, ledger, () => Ledgers.deleteLedgerViaApi(ledger.id, false))))
      .step((currentFlow) => {
        const expenseClasses = [
          { ...ExpenseClasses.getDefaultExpenseClass(), name: `Electronic ${postfix}` },
          { ...ExpenseClasses.getDefaultExpenseClass(), name: `Print ${postfix}` },
        ];

        return cy
          .wrap(expenseClasses)
          .each((expenseClass) => ExpenseClasses.createExpenseClassViaApi(expenseClass))
          .then(() => currentFlow.set(R.EXPENSE_CLASSES, expenseClasses, () => expenseClasses.forEach(({ id }) => ExpenseClasses.deleteExpenseClassViaApi(id, { failOnStatusCode: false }))));
      })
      .step((currentFlow) => {
        const funds = [];

        return cy
          .wrap(['A', 'B'])
          .each((suffix) => {
            const defaultFund = Funds.getDefaultFund();
            return Funds.createViaApi({
              ...defaultFund,
              ledgerId: currentFlow.get(R.LEDGER).id,
              name: `AT_C1375887_Fund_${suffix}_${postfix}`,
              code: `C137${suffix}${postfix}`.slice(0, 10),
            }).then((response) => funds.push(response.fund || response));
          })
          .then(() => currentFlow.set(R.FUNDS, funds, () => funds.forEach(({ id }) => Funds.deleteFundViaApi(id, false))));
      })
      .step((currentFlow) => {
        const budgets = [];

        return cy
          .wrap(currentFlow.get(R.FUNDS))
          .each((fund, index) => Budgets.createViaApi({
            ...Budgets.getDefaultBudget(),
            allocated: 500,
            fiscalYearId: currentFlow.get(R.FISCAL_YEAR).id,
            fundId: fund.id,
            statusExpenseClasses:
                index === 0
                  ? currentFlow.get(R.EXPENSE_CLASSES).map(({ id }) => ({
                    status: 'Active',
                    expenseClassId: id,
                  }))
                  : [],
          }).then((budget) => budgets.push(budget)))
          .then(() => currentFlow.set(R.BUDGETS, budgets, () => budgets.forEach(({ id }) => Budgets.deleteViaApi(id, false))));
      })
      .step((currentFlow) => {
        const orders = [];
        return cy
          .wrap([0, 1])
          .each((index) => Orders.createOrderViaApi({
            ...NewOrder.getDefaultOrder({ vendorId: currentFlow.get(R.ORGANIZATION).id }),
            id: uuid(),
            poNumber: poNumbers[index],
            orderType: index === 0 ? 'Ongoing' : 'One-Time',
            tags: {
              tagList:
                  index === 0
                    ? [
                      ...currentFlow
                        .get(R.TAGS)
                        .slice(0, 2)
                        .map(({ label }) => label),
                      currentFlow.get(R.TAGS)[3].label,
                    ]
                    : [currentFlow.get(R.TAGS)[3].label],
            },
            ongoing:
                index === 0
                  ? { isSubscription: true, reviewPeriod: 200, manualRenewal: false }
                  : undefined,
          }).then((order) => orders.push(order)))
          .then(() => currentFlow.set(R.ORDERS, orders, () => orders.forEach(({ id }) => Orders.deleteOrderViaApi(id, false))));
      })
      .step((currentFlow) => {
        const lines = [];
        return cy
          .wrap(currentFlow.get(R.ORDERS))
          .each((order, index) => createLine(order, index).then((line) => lines.push(line)))
          .then(() => currentFlow.set(R.LINES, lines));
      })
      .step((currentFlow) => OrderLines.addPackageTitleViaApi({
        title: receivingTitles[1],
        poLineId: currentFlow.get(R.LINES)[1].id,
        instanceId: currentFlow.get(R.PACKAGE_INSTANCE).instanceId,
      }))
      .step((currentFlow) => cy
        .wrap(currentFlow.get(R.ORDERS))
        .each((order) => Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' }).then(({ body }) => Object.assign(order, body))))
      .step((currentFlow) => {
        const packageLine = currentFlow.get(R.LINES)[1];

        return OrderLines.getOrderLineViaApi({ query: `id==${packageLine.id}` }).then(
          ([openedLine]) => Receiving.addPieceViaApi(
            {
              poLineId: openedLine.id,
              poLineNumber: openedLine.poLineNumber,
              format: openedLine.orderFormat,
              holdingId: openedLine.locations[0].holdingId,
            },
            { locationId: openedLine.locations[0].locationId },
          ),
        );
      })
      .step((currentFlow) => Receiving.getPiecesViaApi(currentFlow.get(R.LINES)[1].id).then((pieces) => {
        expect(pieces).to.have.length(1);
      }))
      .step((currentFlow) => Invoices.createInvoiceViaApi({
        vendorId: currentFlow.get(R.ORGANIZATION).id,
        accountingCode: currentFlow.get(R.ORGANIZATION).erpCode,
        fiscalYearId: currentFlow.get(R.FISCAL_YEAR).id,
        tags: [currentFlow.get(R.TAGS)[3].label],
      }).then((invoice) => currentFlow.set(R.INVOICE, invoice, () => Invoices.deleteInvoiceViaApi(invoice.id, { failOnStatusCode: false }))))
      .step((currentFlow) => cy
        .createTempUser([
          Permissions.uiOrdersView.gui,
          Permissions.uiReceivingView.gui,
          Permissions.uiClaimingView.gui,
          Permissions.viewEditCreateInvoiceInvoiceLine.gui,
          Permissions.uiFinanceViewFundAndBudget.gui,
          Permissions.uiTagsPermissionAll.gui,
        ])
        .then((user) => currentFlow.set(R.USER, user, () => Users.deleteViaApi(user.userId))))
      .step((currentFlow) => cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      }));
  });

  after('Delete C1375887 data', () => {
    cy.getAdminToken();
    flow.cleanup();
  });

  const filterAndWait = (pane, trigger) => PaneRequestWaiter.waitForPaneRequests({ pane, trigger });

  const verifyOrders = (expected = []) => {
    cy.get('#orders-list').should(($list) => {
      poNumbers.forEach((poNumber, index) => {
        const assertion = expect($list.text());
        if (expected.includes(index)) assertion.to.include(poNumber);
        else assertion.not.to.include(poNumber);
      });
    });
  };

  const verifyLines = (expected = []) => {
    cy.get('#order-line-list').should(($list) => {
      flow.get(R.LINES).forEach((line, index) => {
        const assertion = expect($list.text());
        if (expected.includes(index)) assertion.to.include(line.poLineNumber);
        else assertion.not.to.include(line.poLineNumber);
      });
    });
  };

  function verifyClaiming(expected = []) {
    const expectedPieceCount = expected.reduce(
      (count, lineIndex) => count + (lineIndex === 0 ? 2 : 1),
      0,
    );

    cy.get('#claiming-list').should(($list) => {
      receivingTitles.forEach((title, lineIndex) => {
        const assertion = expect($list.text());
        if (expected.includes(lineIndex)) assertion.to.include(title);
        else assertion.not.to.include(title);
      });
    });
    Claiming.verifyPiecesCount(expectedPieceCount);
  }

  const searchOrders = (step, index, value, expected) => {
    cy.log(`<--- STEP ${step}: Search Orders by ${index}: ${value} --->`);
    Orders.assertResetAllButtonState({ disabled: false });
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
      trigger: () => Orders.searchByParameter(index, value),
    });
    Orders.assertResetAllButtonState({ disabled: false });
    verifyOrders(expected);
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
      trigger: () => Orders.clearSearchField(),
    });
  };

  const searchLines = (step, index, value, expected) => {
    cy.log(`<--- STEP ${step}: Search Order lines by ${index}: ${value} --->`);
    OrderLines.assertResetAllButtonState({ disabled: false });

    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
      trigger: () => OrderLines.searchByParameter(index, value),
      conditions: { invalidQuery: /^\*.*/.test(value) },
    });

    OrderLines.assertResetAllButtonState({ disabled: false });
    verifyLines(expected);

    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
      trigger: () => OrderLines.clearSearchField(),
    });
  };

  const searchReceiving = (step, index, value, expected) => {
    cy.log(`<--- STEP ${step}: Search Receiving by ${index}: ${value} --->`);
    Receiving.assertResetAllButtonState({ disabled: false });
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
      trigger: () => Receiving.searchByParameter({ parameter: index, value }),
    });
    Receiving.assertResetAllButtonState({ disabled: false });
    Receiving.assertReceivingResults(expected.map((lineIndex) => receivingTitles[lineIndex]));
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
      trigger: () => Receiving.clearSearchField(),
    });
  };

  const searchPlugin = (step, index, value, expected) => {
    cy.log(`<--- STEP ${step}: Search Select order lines by ${index}: ${value} --->`);
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
      trigger: () => SelectOrderLinesModal.searchByParameter(index, value),
      conditions: { invalidQuery: /^\*.*/.test(value) },
    });
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });
    SelectOrderLinesModal.assertSearchResults(expected.map((lineIndex) => titles[lineIndex]));
  };

  // Changing the search index must not run a new search: the current results stay until the
  // user submits the search with the "Search" button or the Enter key. Both indexes are used
  // with the same search term, so a search started by the index change alone would be visible
  // as a changed result set.
  const verifySearchRunsOnSubmitOnly = ({
    step,
    pane,
    fragment,
    verifyResults,
    index,
    changedIndex,
    value,
    expected,
    changedExpected = [],
  }) => {
    const changeSearchIndex = (nextIndex, keptExpected) => {
      PaneRequestWaiter.assertNoPaneRequests({
        pane,
        trigger: () => fragment.selectSearchIndex(nextIndex),
      });
      fragment.assertSearchFieldValue(value);
      // The changed index is not applied yet, so the previous result set is still displayed.
      verifyResults(keptExpected);
    };

    cy.log(
      `<--- STEP ${step}: Changing the search index from ${index} to ${changedIndex} does not run a search --->`,
    );
    PaneRequestWaiter.waitForPaneRequests({
      pane,
      trigger: () => fragment.searchByParameter(index, value),
    });
    verifyResults(expected);
    changeSearchIndex(changedIndex, expected);

    cy.log(`<--- STEP ${step}: The "Search" button applies the changed search index --->`);
    PaneRequestWaiter.waitForPaneRequests({
      pane,
      trigger: () => fragment.clickSearchButton(),
    });
    verifyResults(changedExpected);
    changeSearchIndex(index, changedExpected);

    cy.log(`<--- STEP ${step}: Pressing Enter applies the changed search index --->`);
    PaneRequestWaiter.waitForPaneRequests({
      pane,
      trigger: () => fragment.pressEnterInSearchField(),
    });
    verifyResults(expected);
  };

  const searchClaiming = (index, value, expected) => {
    cy.log(`<--- STEP 29: Search Claiming by ${index}: ${value} --->`);
    Claiming.assertResetAllButtonState({ disabled: false });
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
      trigger: () => Claiming.searchByParameter(index, value),
    });
    Claiming.assertResetAllButtonState({ disabled: false });
    verifyClaiming(expected);
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
      trigger: () => Claiming.clearSearchField(),
    });
  };

  // Every filter assertion must remain scoped to records created by this run. Tags are an
  // OR filter, so Tags scenarios use their own unique case tags; adding the common isolation
  // tag would broaden the result. Every other filter is combined with the isolation tag.
  const filterWithIsolation = (pane, filterAction, label, values) => {
    if (label !== ORDER_LINE_FILTER_LABELS.TAGS) {
      filterAndWait(pane, () => filterAction(ORDER_LINE_FILTER_LABELS.TAGS, [flow.get(R.TAGS)[3].label]));
    }
    filterAndWait(pane, () => filterAction(label, values));
  };

  const filterOrdersAndVerify = (step, label, values, expected) => {
    cy.log(`<--- STEP ${step}: Filter Orders by ${label}: ${values.join(', ')} --->`);
    Orders.resetAllFilters();
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.ORDERS,
      Orders.filterByMultiSelectOptions,
      label,
      values,
    );
    Orders.assertResetAllButtonState({ disabled: false });
    verifyOrders(expected);
  };

  const filterLinesAndVerify = (step, label, values, expected) => {
    cy.log(`<--- STEP ${step}: Filter Order lines by ${label}: ${values.join(', ')} --->`);
    OrderLines.clearAllFilters();
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
      OrderLines.filterByMultiSelectOptions,
      label,
      values,
    );
    OrderLines.assertResetAllButtonState({ disabled: false });
    verifyLines(expected);
  };

  const filterLinesByLocationsAndVerify = ({ step, locationIndexes, expected }) => {
    const locationNames = locationIndexes.map((index) => flow.get(R.LOCATIONS)[index].name);

    cy.log(`<--- STEP ${step}: Filter Order lines by Location: ${locationNames.join(', ')} --->`);
    OrderLines.clearAllFilters();
    // Apply isolation last because some location modals rebuild the filter form on Save.
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.TAGS, [
      flow.get(R.TAGS)[3].label,
    ]));
    OrderLines.assertResetAllButtonState({ disabled: false });

    filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.selectMultipleLocationsInFilters(locationNames));
    OrderLines.assertResetAllButtonState({ disabled: false });
    verifyLines(expected);
  };

  const filterPluginAndVerify = (label, values, expected) => {
    cy.log(`<--- STEP 34: Filter Select order lines by ${label}: ${values.join(', ')} --->`);
    SelectOrderLinesModal.clearAllFilters();
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
      SelectOrderLinesModal.filterByMultiSelectOptions,
      label,
      values,
    );
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });
    SelectOrderLinesModal.assertSearchResults(expected.map((lineIndex) => titles[lineIndex]));
  };

  const filterPluginByLocationsAndVerify = (locationIndexes, expected) => {
    const locationNames = locationIndexes.map((index) => flow.get(R.LOCATIONS)[index].name);

    cy.log(`<--- STEP 34: Filter Select order lines by Location: ${locationNames.join(', ')} --->`);
    SelectOrderLinesModal.clearAllFilters();
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => SelectOrderLinesModal.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.TAGS, [
      flow.get(R.TAGS)[3].label,
    ]));
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });

    filterAndWait(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => SelectOrderLinesModal.selectMultipleLocationsInFilters(locationNames));
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });
    SelectOrderLinesModal.assertSearchResults(expected.map((lineIndex) => titles[lineIndex]));
  };

  const filterReceivingAndVerify = (label, values, expected) => {
    cy.log(`<--- STEP 27: Filter Receiving by ${label}: ${values.join(', ')} --->`);
    Receiving.clearAllFilters();
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.RECEIVING,
      Receiving.filterByMultiSelectOptions,
      label,
      values,
    );
    Receiving.assertResetAllButtonState({ disabled: false });
    Receiving.assertReceivingResults(expected.map((lineIndex) => receivingTitles[lineIndex]));
  };

  const filterReceivingByLocationsAndVerify = (locationIndexes, expected, receivingStatus) => {
    const locationNames = locationIndexes.map((index) => flow.get(R.LOCATIONS)[index].name);

    cy.log(`<--- STEPS 27-28: Filter Receiving by Location: ${locationNames.join(', ')} --->`);
    Receiving.clearAllFilters();
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.RECEIVING, () => Receiving.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.TAGS, [
      flow.get(R.TAGS)[3].label,
    ]));
    Receiving.assertResetAllButtonState({ disabled: false });

    filterAndWait(PANE_REQUEST_PROFILE_NAMES.RECEIVING, () => Receiving.selectMultipleLocationsInFilters(locationNames));
    Receiving.assertResetAllButtonState({ disabled: false });
    Receiving.assertReceivingResults(expected.map((lineIndex) => receivingTitles[lineIndex]));

    if (receivingStatus) {
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.RECEIVING, () => Receiving.filterByCheckboxes(CLAIMING_FILTER_LABELS.RECEIVING_STATUS, [receivingStatus]));
      Receiving.assertResetAllButtonState({ disabled: false });
      Receiving.assertReceivingResults([]);
    }
  };

  const filterClaimingAndVerify = (label, values, expected) => {
    cy.log(`<--- STEP 29: Filter Claiming by ${label}: ${values.join(', ')} --->`);
    Claiming.clearAllFilters();
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.CLAIMING,
      Claiming.filterByMultiSelectOptions,
      label,
      values,
    );
    Claiming.assertResetAllButtonState({ disabled: false });
    verifyClaiming(expected);
  };

  const filterClaimingByLocationsAndVerify = (locationIndexes, expected, receivingStatus) => {
    const locationNames = locationIndexes.map((index) => flow.get(R.LOCATIONS)[index].name);

    cy.log(`<--- STEP 29: Filter Claiming by Location: ${locationNames.join(', ')} --->`);
    Claiming.clearAllFilters();
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.CLAIMING, () => Claiming.filterByMultiSelectOptions(CLAIMING_FILTER_LABELS.TAGS, [flow.get(R.TAGS)[3].label]));
    Claiming.assertResetAllButtonState({ disabled: false });

    filterAndWait(PANE_REQUEST_PROFILE_NAMES.CLAIMING, () => Claiming.selectMultipleLocationsInFilters(locationNames));
    Claiming.assertResetAllButtonState({ disabled: false });
    verifyClaiming(expected);

    if (receivingStatus) {
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.CLAIMING, () => Claiming.filterByCheckboxes(CLAIMING_FILTER_LABELS.RECEIVING_STATUS, [receivingStatus]));
      Claiming.assertResetAllButtonState({ disabled: false });
      verifyClaiming([]);
    }
  };

  const navigateAndWaitForFilters = ({ application, pane, waiter }) => {
    PaneRequestWaiter.waitForPaneRequests({
      pane,
      phase: PANE_REQUEST_PHASES.FILTERS,
      trigger: () => {
        TopMenuNavigation.navigateToApp(application);
        waiter();
      },
    });
  };

  it(
    'C1375887 Search and filter Orders and Order lines with new indexes (thunderjet)',
    { tags: ['extendedPath', 'thunderjet', 'C1375887'] },
    () => {
      const [fundA, fundB] = flow.get(R.FUNDS);
      const [tag1, tag2, tag3, isolationTag] = flow.get(R.TAGS);
      const [line1, line2] = flow.get(R.LINES);
      const invoice = flow.get(R.INVOICE);
      const [expenseClass1, expenseClass2] = flow.get(R.EXPENSE_CLASSES);

      const poLineTextSamples = [
        {
          index: CONTRIBUTOR,
          exact: 'Harry Jay',
          partial: 'Jay',
          trailing: 'Harry*',
          leading: '*Jay',
          expected: [0],
        },
        {
          index: REQUESTER,
          exact: 'Meg Ryan',
          partial: 'Ryan',
          trailing: 'Meg*',
          leading: '*Ryan',
          expected: [0],
        },
        {
          index: TITLE_OR_PACKAGE,
          exact: titles[0],
          partial: 'Susanne Feigl',
          trailing: 'Frauen*',
          leading: '*Feigl',
          expected: [0],
        },
        {
          index: TITLE_OR_PACKAGE,
          exact: titles[1],
          partial: 'eBook Collection',
          trailing: 'Springer*',
          leading: '*Collection',
          expected: [1],
        },
        {
          index: PUBLISHER,
          exact: 'Jane, Smith',
          partial: 'Smith',
          trailing: 'Jane*',
          leading: '*Smith',
          expected: [0],
        },
        {
          index: VENDOR_REF_NUMBER,
          exact: '205885-CA',
          partial: '205885',
          trailing: '205885*',
          leading: '*-CA',
          expected: [0],
        },
        {
          index: DONOR_DEPRECATED,
          exact: 'Test donor',
          partial: 'donor',
          trailing: 'Test*',
          leading: '*donor',
          expected: [0],
        },
        {
          index: SELECTOR,
          exact: 'Steve Irwin',
          partial: 'Irwin',
          trailing: 'Steve*',
          leading: '*Irwin',
          expected: [0],
        },
        {
          index: VOLUMES,
          exact: 'Vol.III',
          partial: null,
          trailing: 'Vol.I*',
          leading: '*III',
          expected: [0],
        },
        {
          index: VOLUMES,
          exact: 'Vol.25',
          partial: null,
          trailing: 'Vol.2*',
          leading: '*25',
          expected: [1],
        },
      ];

      const runPoLineTextSearchMatrix = ({
        step,
        search,
        dedicated,
        samples = poLineTextSamples,
      }) => {
        samples.forEach(({ index, exact, partial, trailing, leading, expected }) => {
          const searchIndex = dedicated ? index : KEYWORD;

          [...new Set([exact, exact.toLowerCase()])].forEach((value) => search(step, searchIndex, value, expected));
          if (partial) search(step, searchIndex, partial, expected);
          search(step, searchIndex, trailing, expected);
          search(step, searchIndex, leading, []);
        });
      };

      const receivingSearchCases = [
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, poNumbers[0], [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, poNumbers[0].toLowerCase(), [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, poNumbers[1], [1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, line1.poLineNumber, [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, line1.poLineNumber.toLowerCase(), [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, line2.poLineNumber, [1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, poNumberPrefix, []],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, `${poNumberPrefix}*`, [0, 1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, '*', [0, 1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PO_NUMBER, poNumbers[0], [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PO_NUMBER, poNumbers[0].toLowerCase(), [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PO_NUMBER, poNumbers[1], [1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PO_NUMBER, poNumberPrefix, []],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PO_NUMBER, `${poNumberPrefix}*`, [0, 1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PO_NUMBER, '*', [0, 1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.POL_NUMBER, line1.poLineNumber, [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.POL_NUMBER, line1.poLineNumber.toLowerCase(), [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.POL_NUMBER, line2.poLineNumber, [1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.POL_NUMBER, poNumberPrefix, []],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.POL_NUMBER, `${poNumberPrefix}*`, [0, 1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.POL_NUMBER, '*', [0, 1]],
      ];
      const receivingKeywordTextCases = [
        [receivingTitles[0], [0]],
        [receivingTitles[0].toLowerCase(), [0]],
        ['Susanne Feigl', [0]],
        ['Frauen*', [0]],
        [titles[1], [1]],
        [titles[1].toLowerCase(), [1]],
        ['eBook Collection', [1]],
        ['Springer*', [1]],
        ['205885-CA', [0]],
        ['205885-ca', [0]],
        ['205885', [0]],
        ['205885*', [0]],
        ['*', [0, 1]],
      ];

      const receivingDedicatedTextCases = [
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.TITLE, receivingTitles[0], [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.TITLE, receivingTitles[0].toLowerCase(), [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.TITLE, 'Susanne Feigl', [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.TITLE, 'Frauen*', [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.TITLE, 'Osterreich', [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.TITLE, '*', [0, 1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PACKAGE, titles[1], [1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PACKAGE, titles[1].toLowerCase(), [1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PACKAGE, 'eBook Collection', [1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PACKAGE, 'Springer*', [1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.PACKAGE, '*', [0, 1]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.VENDOR_REF_NUMBER, '205885-CA', [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.VENDOR_REF_NUMBER, '205885-ca', [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.VENDOR_REF_NUMBER, '205885', [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.VENDOR_REF_NUMBER, '205885*', [0]],
        [RECEIVING_TITLE_SEARCH_INDEX_LABELS.VENDOR_REF_NUMBER, '*', [0, 1]],
      ];

      /* ORDERS */
      Orders.resetAllFilters();
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => Orders.filterByTags([isolationTag.label]));
      cy.log('<--- STEP 1: Exact PO-number keyword search is case-insensitive --->');
      [poNumbers[0], poNumbers[0].toLowerCase()].forEach((value) => searchOrders(1, ORDER_SEARCH_OPTIONS.KEYWORD, value, [0]));
      searchOrders(2, ORDER_SEARCH_OPTIONS.KEYWORD, poNumbers[1], [1]);
      searchOrders(3, ORDER_SEARCH_OPTIONS.KEYWORD, poNumberPrefix, []);

      cy.log('<--- STEP 4: Verify PO-number wildcard behavior --->');
      searchOrders(4, ORDER_SEARCH_OPTIONS.KEYWORD, '*', [0, 1]);
      searchOrders(4, ORDER_SEARCH_OPTIONS.KEYWORD, `${poNumberPrefix}*`, [0, 1]);
      searchOrders(4, ORDER_SEARCH_OPTIONS.KEYWORD, '*101', [1]);
      searchOrders(4, ORDER_SEARCH_OPTIONS.KEYWORD, '*10*', [0, 1]);

      cy.log('<--- STEP 5: Repeat PO-number searches with the PO number index --->');
      [
        [poNumbers[0], [0]],
        [poNumbers[0].toLowerCase(), [0]],
        [`${poNumbers[0].slice(0, 2)}*${poNumbers[0].slice(4)}`, [0]],
        [poNumbers[1], [1]],
        [`${poNumbers[1].slice(0, 2)}*${poNumbers[1].slice(4)}`, [1]],
        [poNumberPrefix, []],
        ['*', [0, 1]],
        [`${poNumberPrefix}*`, [0, 1]],
        ['*101', [1]],
        ['*10*', [0, 1]],
      ].forEach(([value, expected]) => searchOrders(5, ORDER_SEARCH_OPTIONS.PO_NUMBER, value, expected));

      cy.log('<--- STEPS 6-7: Search by Date created and Date opened --->');
      [ORDER_SEARCH_OPTIONS.DATE_CREATED, ORDER_SEARCH_OPTIONS.DATE_OPENED].forEach((index) => {
        const step = index === ORDER_SEARCH_OPTIONS.DATE_CREATED ? 6 : 7;
        searchOrders(step, index, formatDate(flow.get(R.LOCALE), new Date()), [0, 1]);
        searchOrders(step, index, '12/31/2099', []);
        searchOrders(step, index, index === ORDER_SEARCH_OPTIONS.DATE_CREATED ? '25' : '-5', []);
        searchOrders(step, index, '*', []);
      });

      cy.log('<--- STEPS 8-10: Verify Fund code, Tags and Review period filters --->');
      filterOrdersAndVerify(8, ORDER_FILTER_LABELS.FUND_CODE, [fundA.code], [0, 1]);
      filterOrdersAndVerify(8, ORDER_FILTER_LABELS.FUND_CODE, [fundB.code], [1]);
      filterOrdersAndVerify(8, ORDER_FILTER_LABELS.FUND_CODE, [fundA.code, fundB.code], [0, 1]);
      filterOrdersAndVerify(9, ORDER_FILTER_LABELS.TAGS, [tag1.label], [0]);
      filterOrdersAndVerify(9, ORDER_FILTER_LABELS.TAGS, [tag2.label], [0]);
      filterOrdersAndVerify(9, ORDER_FILTER_LABELS.TAGS, [tag1.label, tag2.label], [0]);
      filterOrdersAndVerify(9, ORDER_FILTER_LABELS.TAGS, [tag3.label], []);

      [
        ['2', []],
        ['20', []],
        ['200', [0]],
      ].forEach(([value, expected]) => {
        cy.log(`<--- STEP 10: Filter Orders by Review period: ${value} --->`);
        Orders.resetAllFilters();
        filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => Orders.filterByMultiSelectOptions(ORDER_FILTER_LABELS.TAGS, [flow.get(R.TAGS)[3].label]));
        filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => Orders.filterByTextField(ORDER_FILTER_LABELS.REVIEW_PERIOD, value));
        verifyOrders(expected);
      });
      Orders.resetAllFilters();

      /* ORDERS LINES */
      cy.log('<--- STEPS 11-16: Search PO lines by POL number and Vendor account --->');
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          Orders.selectOrderLines();
          OrderLines.waitLoading();
        },
      });

      OrderLines.clearAllFilters();
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByTags([isolationTag.label])); // Isolate test data

      [line1.poLineNumber, line1.poLineNumber.toLowerCase()].forEach((value) => searchLines(11, KEYWORD, value, [0]));
      searchLines(12, KEYWORD, line2.poLineNumber, [1]);
      searchLines(13, KEYWORD, '123-58', [0]);
      [poNumbers[0], `${poNumbers[1]}-`, '123', poNumberPrefix].forEach((value) => searchLines(14, KEYWORD, value, []));
      [
        ['*', [0, 1]],
        [`${poNumberPrefix}*`, [0, 1]],
      ].forEach(([value, expected]) => searchLines(15, KEYWORD, value, expected));

      cy.log(
        '<--- STEP 16: Repeat POL-number and Vendor-account searches on dedicated indexes --->',
      );
      [
        [line1.poLineNumber, [0]],
        [line1.poLineNumber.toLowerCase(), [0]],
        [line2.poLineNumber, [1]],
        [poNumberPrefix, []],
        ['*', [0, 1]],
        [`${poNumberPrefix}*`, [0, 1]],
        [`${poNumbers[1].slice(0, 3)}*B-1`, [0]],
        [`*${poNumbers[0].slice(-5)}-1`, [0]],
        [`*${poNumbers[1].slice(-3)}*`, [1]],
      ].forEach(([value, expected]) => searchLines(16, POL_NUMBER, value, expected));
      [
        ['123-58', [0]],
        ['12*8', [0]],
        ['123', []],
        ['123*', [0]],
        ['123*8', [0]],
        ['*58', [0]],
        ['*3-5*', [0]],
        ['*', [0, 1]],
      ].forEach(([value, expected]) => searchLines(16, VENDOR_ACCOUNT, value, expected));

      cy.log('<--- STEP 17: Search every new PO-line text field through Keyword --->');
      runPoLineTextSearchMatrix({
        step: 17,
        search: searchLines,
        dedicated: false,
      });
      InteractorsTools.closeAllVisibleCallouts();
      cy.log('<--- STEP 18: Repeat every text-field matrix on its dedicated index --->');
      runPoLineTextSearchMatrix({
        step: 18,
        search: searchLines,
        dedicated: true,
      });
      InteractorsTools.closeAllVisibleCallouts();
      searchLines(18, TITLE_OR_PACKAGE, 'Osterreich', [0]);

      cy.log('<--- STEPS 19-23: Apply Tags, Fund, Expense class and Location filters --->');
      filterLinesAndVerify(19, ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label], []);
      filterLinesAndVerify(19, ORDER_LINE_FILTER_LABELS.TAGS, [tag2.label], []);
      filterLinesAndVerify(19, ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label, tag2.label], []);
      filterLinesAndVerify(
        19,
        ORDER_LINE_FILTER_LABELS.TAGS,
        [tag1.label, tag2.label, tag3.label],
        [0],
      );
      filterLinesAndVerify(19, ORDER_LINE_FILTER_LABELS.TAGS, [tag3.label], [0]);
      filterLinesAndVerify(20, ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundA.code], [0, 1]);
      filterLinesAndVerify(20, ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundB.code], [1]);
      filterLinesAndVerify(
        20,
        ORDER_LINE_FILTER_LABELS.FUND_CODE,
        [fundA.code, fundB.code],
        [0, 1],
      );

      cy.log('<--- STEP 21: Add Expense class without resetting Fund filters --->');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
        expenseClass1.name,
      ]));
      verifyLines([0]);
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
        expenseClass2.name,
      ]));
      verifyLines([0, 1]);
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.removeMultiSelectChips(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
        expenseClass1.name,
      ]));
      verifyLines([1]);

      cy.log('<--- STEP 22: Add Location without resetting Fund or Expense-class filters --->');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.selectLocationInFilters(flow.get(R.LOCATIONS)[2].name));
      verifyLines([1]);
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.clearFilter(ORDER_LINE_FILTER_LABELS.LOCATION));
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => OrderLines.selectLocationInFilters(flow.get(R.LOCATIONS)[0].name));
      verifyLines([]);
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [0], expected: [0] });
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [1], expected: [0] });
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [0, 1], expected: [0] });
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [0, 1, 2], expected: [0, 1] });
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [2], expected: [1] });
      OrderLines.clearAllFilters();

      /* RECEIVING */
      cy.log('<--- STEPS 24-28: Repeat searches and filters in Receiving --->');
      navigateAndWaitForFilters({
        application: APPLICATION_NAMES.RECEIVING,
        pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
        waiter: Receiving.waitLoading,
      });

      Receiving.clearAllFilters();
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => Receiving.filterByTags([isolationTag.label])); // Isolate test data

      receivingSearchCases.forEach(([index, value, expected]) => searchReceiving(24, index, value, expected));
      receivingKeywordTextCases.forEach(([value, expected]) => searchReceiving(25, RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, value, expected));
      receivingDedicatedTextCases.forEach(([index, value, expected]) => searchReceiving(26, index, value, expected));
      Receiving.assertResetAllButtonState({ disabled: false });

      filterReceivingAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label], []);
      filterReceivingAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag2.label], []);
      filterReceivingAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label, tag2.label], []);
      filterReceivingAndVerify(
        ORDER_LINE_FILTER_LABELS.TAGS,
        [tag1.label, tag2.label, tag3.label],
        [0],
      );
      filterReceivingAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag3.label], [0]);
      filterReceivingByLocationsAndVerify([0], [0]);
      filterReceivingByLocationsAndVerify([1], [0]);
      filterReceivingByLocationsAndVerify([0, 1], [0]);
      filterReceivingByLocationsAndVerify([0, 1, 2], [0, 1]);
      filterReceivingByLocationsAndVerify([2], [1]);
      filterReceivingByLocationsAndVerify([0], [0], RECEIVING_PIECE_STATUSES.LATE);

      /* CLAIMING */
      cy.log(
        '<--- STEP 29: Repeat searches in Claiming and verify index change waits for Search --->',
      );
      navigateAndWaitForFilters({
        application: APPLICATION_NAMES.CLAIMING,
        pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
        waiter: Claiming.waitLoading,
      });

      Claiming.clearAllFilters();
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.CLAIMING, () => Claiming.filterByTags([isolationTag.label]));

      receivingSearchCases.forEach(([index, value, expected]) => searchClaiming(index, value, expected));
      receivingKeywordTextCases.forEach(([value, expected]) => searchClaiming(RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, value, expected));
      receivingDedicatedTextCases.forEach(([index, value, expected]) => searchClaiming(index, value, expected));

      verifySearchRunsOnSubmitOnly({
        step: 29,
        pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
        fragment: Claiming,
        verifyResults: verifyClaiming,
        index: RECEIVING_TITLE_SEARCH_INDEX_LABELS.PO_NUMBER,
        changedIndex: RECEIVING_TITLE_SEARCH_INDEX_LABELS.POL_NUMBER,
        value: poNumbers[0],
        expected: [0],
      });

      filterClaimingAndVerify(CLAIMING_FILTER_LABELS.TAGS, [tag1.label], []);
      filterClaimingAndVerify(CLAIMING_FILTER_LABELS.TAGS, [tag2.label], []);
      filterClaimingAndVerify(CLAIMING_FILTER_LABELS.TAGS, [tag1.label, tag2.label], []);
      filterClaimingAndVerify(
        CLAIMING_FILTER_LABELS.TAGS,
        [tag1.label, tag2.label, tag3.label],
        [0],
      );
      filterClaimingAndVerify(CLAIMING_FILTER_LABELS.TAGS, [tag3.label], [0]);
      filterClaimingByLocationsAndVerify([0], [0]);
      filterClaimingByLocationsAndVerify([1], [0]);
      filterClaimingByLocationsAndVerify([0, 1], [0]);
      filterClaimingByLocationsAndVerify([0, 1, 2], [0, 1]);
      filterClaimingByLocationsAndVerify([2], [1]);
      filterClaimingByLocationsAndVerify([0], [0], RECEIVING_PIECE_STATUSES.LATE);

      /* INVOICES */
      cy.log('<--- STEPS 30-34: Reuse the same PO-line search matrix in Select order lines --->');
      navigateAndWaitForFilters({
        application: APPLICATION_NAMES.INVOICES,
        pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
        waiter: Invoices.waitLoading,
      });
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.INVOICES, () => Invoices.searchByNumber(invoice.vendorInvoiceNo));
      Invoices.selectInvoice(invoice.vendorInvoiceNo);
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => InvoiceView.openSelectOrderLineModal(),
      });
      SelectOrderLinesModal.verifyModalView();
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => SelectOrderLinesModal.filterByTags([isolationTag.label]));

      [
        [KEYWORD, line1.poLineNumber, [0]],
        [KEYWORD, line1.poLineNumber.toLowerCase(), [0]],
        [KEYWORD, line2.poLineNumber, [1]],
        [KEYWORD, '123-58', [0]],
        [KEYWORD, poNumbers[0], []],
        [KEYWORD, `${poNumbers[1]}-`, []],
        [KEYWORD, '123', []],
        [KEYWORD, poNumberPrefix, []],
        [KEYWORD, '*', [0, 1]],
        [KEYWORD, `${poNumberPrefix}*`, [0, 1]],
        [POL_NUMBER, line1.poLineNumber, [0]],
        [POL_NUMBER, line1.poLineNumber.toLowerCase(), [0]],
        [POL_NUMBER, line2.poLineNumber, [1]],
        [POL_NUMBER, poNumberPrefix, []],
        [POL_NUMBER, '*', [0, 1]],
        [POL_NUMBER, `${poNumberPrefix}*`, [0, 1]],
        [POL_NUMBER, `${poNumberPrefix}*1`, [0, 1]],
        [VENDOR_ACCOUNT, '123-58', [0]],
        [VENDOR_ACCOUNT, '12*8', [0]],
        [VENDOR_ACCOUNT, '123', []],
        [VENDOR_ACCOUNT, '123*', [0]],
        [VENDOR_ACCOUNT, '*58', [0]],
        [VENDOR_ACCOUNT, '*3-5*', [0]],
        [VENDOR_ACCOUNT, '*', [0, 1]],
      ].forEach(([index, value, expected]) => searchPlugin(31, index, value, expected));

      verifySearchRunsOnSubmitOnly({
        step: 31,
        pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
        fragment: SelectOrderLinesModal,
        verifyResults: (lineIndexes) => SelectOrderLinesModal.assertSearchResults(
          lineIndexes.map((lineIndex) => titles[lineIndex]),
        ),
        index: VENDOR_ACCOUNT,
        changedIndex: POL_NUMBER,
        value: '123-58',
        expected: [0],
      });

      runPoLineTextSearchMatrix({
        step: 32,
        search: searchPlugin,
        dedicated: false,
      });
      runPoLineTextSearchMatrix({
        step: 33,
        search: searchPlugin,
        dedicated: true,
        samples: poLineTextSamples.filter(({ index }) => index !== DONOR_DEPRECATED),
      });
      searchPlugin(33, TITLE_OR_PACKAGE, 'Osterreich', [0]);

      cy.log('<--- STEP 34: Repeat PO-line filters in Select order lines --->');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label], []);
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag2.label], []);
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label, tag2.label], []);
      filterPluginAndVerify(
        ORDER_LINE_FILTER_LABELS.TAGS,
        [tag1.label, tag2.label, tag3.label],
        [0],
      );
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag3.label], [0]);
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundA.code], [0, 1]);
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundB.code], [1]);
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundA.code, fundB.code], [0, 1]);
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [expenseClass1.name], [0]);
      filterPluginAndVerify(
        ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS,
        [expenseClass1.name, expenseClass2.name],
        [0, 1],
      );
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [expenseClass2.name], [1]);
      filterPluginByLocationsAndVerify([0], [0]);
      filterPluginByLocationsAndVerify([1], [0]);
      filterPluginByLocationsAndVerify([0, 1], [0]);
      filterPluginByLocationsAndVerify([0, 1, 2], [0, 1]);
      filterPluginByLocationsAndVerify([2], [1]);
      SelectOrderLinesModal.closeModal();
    },
  );
});
