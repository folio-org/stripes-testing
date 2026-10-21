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

const trace = (message) => cy.task('log', `[C1375887] ${message}`);

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

// The test is running for 1 hour, using 10 Gb RAM causing test pipelines to fail (workers are freezing).
// The test is disabled until the root cause is found.
// #freeze pipeline deadlock
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

  const createLine = (order, index) => {
    trace('Operation: OrderLines.createOrderLineViaApi (line 87)');
    return OrderLines.createOrderLineViaApi({
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
  };

  before('Create C1375887 preconditions', () => {
    trace('SETUP: start');

    trace('Operation: cy.getAdminToken (line 173)');
    cy.getAdminToken();
    trace('Operation: cy.clearAllLocalStorage (line 174)');
    cy.clearAllLocalStorage();
    trace('Operation: cy.getTenantLocaleApi (line 175)');
    cy.getTenantLocaleApi().then((locale) => flow.set(R.LOCALE, locale));

    flow
      .step(() => {
        trace('SETUP step 1: setUserCanEditPONumberViaApi');

        trace('Operation: SettingsOrders.setUserCanEditPONumberViaApi (line 179)');
        SettingsOrders.setUserCanEditPONumberViaApi(true);
      })
      .step((currentFlow) => {
        trace('SETUP step 2: create organization');

        const defaultOrganization = NewOrganization.getDefaultOrganization({ accounts: 1 });
        const organization = {
          ...defaultOrganization,
          name: `AT_C1375887_Vendor_${postfix}`,
          accounts: defaultOrganization.accounts.map((account) => ({
            ...account,
            accountNo: '123-58',
          })),
        };
        trace('Operation: Organizations.createOrganizationViaApi (line 191)');
        return Organizations.createOrganizationViaApi(organization).then((id) => currentFlow.set(R.ORGANIZATION, { ...organization, id }, () => {
          trace('Operation: Organizations.deleteOrganizationViaApi (line 191)');
          return Organizations.deleteOrganizationViaApi(id);
        }));
      })
      .step((currentFlow) => {
        trace('SETUP step 3: cy.getLocations');
        return cy
          .getLocations({ limit: 3 })
          .then(() => currentFlow.set(R.LOCATIONS, Cypress.env('locations')));
      })
      .step((currentFlow) => {
        trace('SETUP step 4: cy.getDefaultMaterialType');
        return cy
          .getDefaultMaterialType()
          .then((materialType) => currentFlow.set(R.MATERIAL_TYPE, materialType));
      })
      .step((currentFlow) => {
        trace('SETUP step 5: cy.getAcquisitionMethodsApi');
        return cy
          .getAcquisitionMethodsApi({ query: 'value="Other"' })
          .then(({ body }) => currentFlow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
      })
      .step((currentFlow) => {
        trace('SETUP step 6: BrowseContributors.getContributorNameTypes');
        return BrowseContributors.getContributorNameTypes().then(([nameType]) => currentFlow.set(R.CONTRIBUTOR_NAME_TYPE, nameType));
      })
      .step((currentFlow) => {
        trace('SETUP step 7: InventoryInstance.createInstanceViaApi');
        return InventoryInstance.createInstanceViaApi({
          instanceTitle: receivingTitles[1],
        }).then(({ instanceData }) => currentFlow.set(R.PACKAGE_INSTANCE, instanceData, () => {
          trace('Operation: InventoryInstance.deleteInstanceViaApi (line 205)');
          return InventoryInstance.deleteInstanceViaApi(instanceData.instanceId);
        }));
      })
      .step((currentFlow) => {
        trace('SETUP step 8: create tags');

        const tags = [];

        trace('Operation: cy.wrap (line 209)');
        return cy
          .wrap([1, 2, 3, 'isolation'])
          .each((number) => {
            const label = `AT_C1375887_Tag_${number}_${postfix}`;
            trace('Operation: cy.createTagApi (line 213)');
            return cy.createTagApi({ label }).then((id) => tags.push({ id, label }));
          })
          .then(() => currentFlow.set(R.TAGS, tags, () => tags.forEach(({ id }) => {
            trace('Operation: cy.deleteTagApi (line 215)');
            return cy.deleteTagApi(id, true);
          })));
      })
      .step((currentFlow) => {
        trace('SETUP step 9: FiscalYears.createViaApi');
        return FiscalYears.createViaApi(FiscalYears.getDefaultFiscalYear()).then((fiscalYear) => currentFlow.set(R.FISCAL_YEAR, fiscalYear, () => {
          trace('Operation: FiscalYears.deleteFiscalYearViaApi (line 217)');
          return FiscalYears.deleteFiscalYearViaApi(fiscalYear.id, false);
        }));
      })
      .step((currentFlow) => {
        trace('SETUP step 10: Ledgers.createViaApi');
        return Ledgers.createViaApi({
          ...Ledgers.getDefaultLedger(),
          fiscalYearOneId: currentFlow.get(R.FISCAL_YEAR).id,
        }).then((ledger) => currentFlow.set(R.LEDGER, ledger, () => {
          trace('Operation: Ledgers.deleteLedgerViaApi (line 221)');
          return Ledgers.deleteLedgerViaApi(ledger.id, false);
        }));
      })
      .step((currentFlow) => {
        trace('SETUP step 11: create expense classes');

        const expenseClasses = [
          { ...ExpenseClasses.getDefaultExpenseClass(), name: `Electronic ${postfix}` },
          { ...ExpenseClasses.getDefaultExpenseClass(), name: `Print ${postfix}` },
        ];

        trace('Operation: cy.wrap (line 228)');
        return cy
          .wrap(expenseClasses)
          .each((expenseClass) => {
            trace('Operation: ExpenseClasses.createExpenseClassViaApi (line 230)');
            return ExpenseClasses.createExpenseClassViaApi(expenseClass);
          })
          .then(() => currentFlow.set(R.EXPENSE_CLASSES, expenseClasses, () => expenseClasses.forEach(({ id }) => {
            trace('Operation: ExpenseClasses.deleteExpenseClassViaApi (line 231)');
            return ExpenseClasses.deleteExpenseClassViaApi(id, { failOnStatusCode: false });
          })));
      })
      .step((currentFlow) => {
        trace('SETUP step 12: create funds');

        const funds = [];

        trace('Operation: cy.wrap (line 236)');
        return cy
          .wrap(['A', 'B'])
          .each((suffix) => {
            const defaultFund = Funds.getDefaultFund();
            trace('Operation: Funds.createViaApi (line 240)');
            return Funds.createViaApi({
              ...defaultFund,
              ledgerId: currentFlow.get(R.LEDGER).id,
              name: `AT_C1375887_Fund_${suffix}_${postfix}`,
              code: `C137${suffix}${postfix}`.slice(0, 10),
            }).then((response) => funds.push(response.fund || response));
          })
          .then(() => currentFlow.set(R.FUNDS, funds, () => funds.forEach(({ id }) => {
            trace('Operation: Funds.deleteFundViaApi (line 247)');
            return Funds.deleteFundViaApi(id, false);
          })));
      })
      .step((currentFlow) => {
        trace('SETUP step 13: create budgets');

        const budgets = [];

        trace('Operation: cy.wrap (line 252)');
        return cy
          .wrap(currentFlow.get(R.FUNDS))
          .each((fund, index) => {
            trace('Operation: Budgets.createViaApi (line 254)');
            return Budgets.createViaApi({
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
            }).then((budget) => budgets.push(budget));
          })
          .then(() => currentFlow.set(R.BUDGETS, budgets, () => budgets.forEach(({ id }) => {
            trace('Operation: Budgets.deleteViaApi (line 267)');
            return Budgets.deleteViaApi(id, false);
          })));
      })
      .step((currentFlow) => {
        trace('SETUP step 14: create orders');

        const orders = [];
        trace('Operation: cy.wrap (line 271)');
        return cy
          .wrap([0, 1])
          .each((index) => {
            trace('Operation: Orders.createOrderViaApi (line 273)');
            return Orders.createOrderViaApi({
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
            }).then((order) => orders.push(order));
          })
          .then(() => currentFlow.set(R.ORDERS, orders, () => orders.forEach(({ id }) => {
            trace('Operation: Orders.deleteOrderViaApi (line 295)');
            return Orders.deleteOrderViaApi(id, false);
          })));
      })
      .step((currentFlow) => {
        trace('SETUP step 15: create order lines');

        const lines = [];
        trace('Operation: cy.wrap (line 299)');
        return cy
          .wrap(currentFlow.get(R.ORDERS))
          .each((order, index) => {
            trace('Operation: createLine (line 301)');
            return createLine(order, index).then((line) => lines.push(line));
          })
          .then(() => currentFlow.set(R.LINES, lines));
      })
      .step((currentFlow) => {
        trace('SETUP step 16: OrderLines.addPackageTitleViaApi');
        return OrderLines.addPackageTitleViaApi({
          title: receivingTitles[1],
          poLineId: currentFlow.get(R.LINES)[1].id,
          instanceId: currentFlow.get(R.PACKAGE_INSTANCE).instanceId,
        });
      })
      .step((currentFlow) => {
        trace('SETUP step 17: open orders');
        return cy.wrap(currentFlow.get(R.ORDERS)).each((order) => {
          trace('Operation: Orders.updateOrderViaApi (line 311)');
          return Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' }).then(({ body }) => {
            trace('Operation: Object.assign (line 311)');
            return Object.assign(order, body);
          });
        });
      })
      .step((currentFlow) => {
        trace('SETUP step 18: get opened package line and create receiving piece');

        const packageLine = currentFlow.get(R.LINES)[1];

        trace('Operation: OrderLines.getOrderLineViaApi (line 315)');
        return OrderLines.getOrderLineViaApi({ query: `id==${packageLine.id}` }).then(
          ([openedLine]) => {
            trace('Operation: Receiving.addPieceViaApi (line 316)');
            return Receiving.addPieceViaApi(
              {
                poLineId: openedLine.id,
                poLineNumber: openedLine.poLineNumber,
                format: openedLine.orderFormat,
                holdingId: openedLine.locations[0].holdingId,
              },
              { locationId: openedLine.locations[0].locationId },
            );
          },
        );
      })
      .step((currentFlow) => {
        trace('SETUP step 19: Receiving.getPiecesViaApi');
        return Receiving.getPiecesViaApi(currentFlow.get(R.LINES)[1].id).then((pieces) => {
          trace('Assertion: received piece count');
          expect(pieces).to.have.length(1);
        });
      })
      .step((currentFlow) => {
        trace('SETUP step 20: Invoices.createInvoiceViaApi');
        return Invoices.createInvoiceViaApi({
          vendorId: currentFlow.get(R.ORGANIZATION).id,
          accountingCode: currentFlow.get(R.ORGANIZATION).erpCode,
          fiscalYearId: currentFlow.get(R.FISCAL_YEAR).id,
          tags: [currentFlow.get(R.TAGS)[3].label],
        }).then((invoice) => currentFlow.set(R.INVOICE, invoice, () => {
          trace('Operation: Invoices.deleteInvoiceViaApi (line 335)');
          return Invoices.deleteInvoiceViaApi(invoice.id, { failOnStatusCode: false });
        }));
      })
      .step((currentFlow) => {
        trace('SETUP step 21: cy.createTempUser');
        return cy
          .createTempUser([
            Permissions.uiOrdersView.gui,
            Permissions.uiReceivingView.gui,
            Permissions.uiClaimingView.gui,
            Permissions.viewEditCreateInvoiceInvoiceLine.gui,
            Permissions.uiFinanceViewFundAndBudget.gui,
            Permissions.uiTagsPermissionAll.gui,
          ])
          .then((user) => currentFlow.set(R.USER, user, () => {
            trace('Operation: Users.deleteViaApi (line 345)');
            return Users.deleteViaApi(user.userId);
          }));
      })
      .step((currentFlow) => {
        trace('SETUP step 22: cy.login');
        return cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
          path: TopMenu.ordersPath,
          waiter: Orders.waitLoading,
        });
      });

    trace('SETUP: complete');
  });

  after('Delete C1375887 data', () => {
    trace('CLEANUP: start');

    trace('Operation: cy.getAdminToken (line 353)');
    cy.getAdminToken();
    trace('Operation: flow.cleanup (line 354)');
    flow.cleanup();

    trace('CLEANUP: complete');
  });

  const filterAndWait = (pane, trigger) => {
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 357)');
    return PaneRequestWaiter.waitForPaneRequests({ pane, trigger });
  };

  const verifyOrders = (expected = []) => {
    trace('Operation: cy.get (line 360)');
    cy.get('#orders-list').should(($list) => {
      poNumbers.forEach((poNumber, index) => {
        const assertion = expect($list.text());
        if (expected.includes(index)) assertion.to.include(poNumber);
        else assertion.not.to.include(poNumber);
      });
    });
  };

  const verifyLines = (expected = []) => {
    trace('Operation: cy.get (line 370)');
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

    trace('Operation: cy.get (line 385)');
    cy.get('#claiming-list').should(($list) => {
      receivingTitles.forEach((title, lineIndex) => {
        const assertion = expect($list.text());
        if (expected.includes(lineIndex)) assertion.to.include(title);
        else assertion.not.to.include(title);
      });
    });
    trace('Operation: Claiming.verifyPiecesCount (line 392)');
    Claiming.verifyPiecesCount(expectedPieceCount);
  }

  const searchOrders = (step, index, value, expected) => {
    trace(`<--- STEP ${step}: Search Orders by ${index} --->`);
    trace('Operation: Orders.assertResetAllButtonState (line 397)');
    Orders.assertResetAllButtonState({ disabled: false });
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 398)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
      trigger: () => {
        trace('Operation: Orders.searchByParameter (line 400)');
        return Orders.searchByParameter(index, value);
      },
    });
    trace('Operation: Orders.assertResetAllButtonState (line 402)');
    Orders.assertResetAllButtonState({ disabled: false });
    trace('Operation: verifyOrders (line 403)');
    verifyOrders(expected);
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 404)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.ORDERS,
      trigger: () => {
        trace('Operation: Orders.clearSearchField (line 406)');
        return Orders.clearSearchField();
      },
    });
  };

  const searchLines = (step, index, value, expected) => {
    trace(`<--- STEP ${step}: Search Order lines by ${index} --->`);
    trace('Operation: OrderLines.assertResetAllButtonState (line 412)');
    OrderLines.assertResetAllButtonState({ disabled: false });

    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 414)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
      trigger: () => {
        trace('Operation: OrderLines.searchByParameter (line 416)');
        return OrderLines.searchByParameter(index, value);
      },
      conditions: { invalidQuery: /^\*.*/.test(value) },
    });

    trace('Operation: OrderLines.assertResetAllButtonState (line 420)');
    OrderLines.assertResetAllButtonState({ disabled: false });
    trace('Operation: verifyLines (line 421)');
    verifyLines(expected);

    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 423)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
      trigger: () => {
        trace('Operation: OrderLines.clearSearchField (line 425)');
        return OrderLines.clearSearchField();
      },
    });
  };

  const searchReceiving = (step, index, value, expected) => {
    trace(`<--- STEP ${step}: Search Receiving by ${index} --->`);
    trace('Operation: Receiving.assertResetAllButtonState (line 431)');
    Receiving.assertResetAllButtonState({ disabled: false });
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 432)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
      trigger: () => {
        trace('Operation: Receiving.searchByParameter (line 434)');
        return Receiving.searchByParameter({ parameter: index, value });
      },
    });
    trace('Operation: Receiving.assertResetAllButtonState (line 436)');
    Receiving.assertResetAllButtonState({ disabled: false });
    trace('Operation: Receiving.assertReceivingResults (line 437)');
    Receiving.assertReceivingResults(expected.map((lineIndex) => receivingTitles[lineIndex]));
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 438)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
      trigger: () => {
        trace('Operation: Receiving.clearSearchField (line 440)');
        return Receiving.clearSearchField();
      },
    });
  };

  const searchPlugin = (step, index, value, expected) => {
    trace(`<--- STEP ${step}: Search Select order lines by ${index} --->`);
    trace('Operation: SelectOrderLinesModal.assertResetAllButtonState (line 446)');
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 447)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
      trigger: () => {
        trace('Operation: SelectOrderLinesModal.searchByParameter (line 449)');
        return SelectOrderLinesModal.searchByParameter(index, value);
      },
      conditions: { invalidQuery: /^\*.*/.test(value) },
    });
    trace('Operation: SelectOrderLinesModal.assertResetAllButtonState (line 452)');
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });
    trace('Operation: SelectOrderLinesModal.assertSearchResults (line 453)');
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
      trace('Operation: PaneRequestWaiter.assertNoPaneRequests (line 472)');
      PaneRequestWaiter.assertNoPaneRequests({
        pane,
        trigger: () => {
          trace('Operation: fragment.selectSearchIndex (line 474)');
          return fragment.selectSearchIndex(nextIndex);
        },
      });
      trace('Operation: fragment.assertSearchFieldValue (line 476)');
      fragment.assertSearchFieldValue(value);
      // The changed index is not applied yet, so the previous result set is still displayed.
      trace('Operation: verifyResults (line 478)');
      verifyResults(keptExpected);
    };

    trace(
      `<--- STEP ${step}: Changing the search index from ${index} to ${changedIndex} does not run a search --->`,
    );
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 484)');
    PaneRequestWaiter.waitForPaneRequests({
      pane,
      trigger: () => {
        trace('Operation: fragment.searchByParameter (line 486)');
        return fragment.searchByParameter(index, value);
      },
    });
    trace('Operation: verifyResults (line 488)');
    verifyResults(expected);
    changeSearchIndex(changedIndex, expected);

    trace(`<--- STEP ${step}: The "Search" button applies the changed search index --->`);
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 492)');
    PaneRequestWaiter.waitForPaneRequests({
      pane,
      trigger: () => {
        trace('Operation: fragment.clickSearchButton (line 494)');
        return fragment.clickSearchButton();
      },
    });
    trace('Operation: verifyResults (line 496)');
    verifyResults(changedExpected);
    changeSearchIndex(index, changedExpected);

    trace(`<--- STEP ${step}: Pressing Enter applies the changed search index --->`);
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 500)');
    PaneRequestWaiter.waitForPaneRequests({
      pane,
      trigger: () => {
        trace('Operation: fragment.pressEnterInSearchField (line 502)');
        return fragment.pressEnterInSearchField();
      },
    });
    trace('Operation: verifyResults (line 504)');
    verifyResults(expected);
  };

  const searchClaiming = (index, value, expected) => {
    trace(`<--- STEP 29: Search Claiming by ${index} --->`);
    trace('Operation: Claiming.assertResetAllButtonState (line 509)');
    Claiming.assertResetAllButtonState({ disabled: false });
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 510)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
      trigger: () => {
        trace('Operation: Claiming.searchByParameter (line 512)');
        return Claiming.searchByParameter(index, value);
      },
    });
    trace('Operation: Claiming.assertResetAllButtonState (line 514)');
    Claiming.assertResetAllButtonState({ disabled: false });
    trace('Operation: verifyClaiming (line 515)');
    verifyClaiming(expected);
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 516)');
    PaneRequestWaiter.waitForPaneRequests({
      pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
      trigger: () => {
        trace('Operation: Claiming.clearSearchField (line 518)');
        return Claiming.clearSearchField();
      },
    });
  };

  // Every filter assertion must remain scoped to records created by this run. Tags are an
  // OR filter, so Tags scenarios use their own unique case tags; adding the common isolation
  // tag would broaden the result. Every other filter is combined with the isolation tag.
  const filterWithIsolation = (pane, filterAction, label, values) => {
    if (label !== ORDER_LINE_FILTER_LABELS.TAGS) {
      trace('Operation: filterAndWait (line 527)');
      filterAndWait(pane, () => {
        trace('Operation: filterAction (line 527)');
        return filterAction(ORDER_LINE_FILTER_LABELS.TAGS, [flow.get(R.TAGS)[3].label]);
      });
    }
    trace('Operation: filterAndWait (line 529)');
    filterAndWait(pane, () => {
      trace('Operation: filterAction (line 529)');
      return filterAction(label, values);
    });
  };

  const filterOrdersAndVerify = (step, label, values, expected) => {
    trace(`<--- STEP ${step}: Filter Orders by ${label} --->`);
    trace('Operation: Orders.resetAllFilters (line 534)');
    Orders.resetAllFilters();
    trace('Operation: filterWithIsolation (line 535)');
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.ORDERS,
      Orders.filterByMultiSelectOptions,
      label,
      values,
    );
    trace('Operation: Orders.assertResetAllButtonState (line 541)');
    Orders.assertResetAllButtonState({ disabled: false });
    trace('Operation: verifyOrders (line 542)');
    verifyOrders(expected);
  };

  const filterLinesAndVerify = (step, label, values, expected) => {
    trace(`<--- STEP ${step}: Filter Order lines by ${label} --->`);
    trace('Operation: OrderLines.clearAllFilters (line 547)');
    OrderLines.clearAllFilters();
    trace('Operation: filterWithIsolation (line 548)');
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
      OrderLines.filterByMultiSelectOptions,
      label,
      values,
    );
    trace('Operation: OrderLines.assertResetAllButtonState (line 554)');
    OrderLines.assertResetAllButtonState({ disabled: false });
    trace('Operation: verifyLines (line 555)');
    verifyLines(expected);
  };

  const filterLinesByLocationsAndVerify = ({ step, locationIndexes, expected }) => {
    const locationNames = locationIndexes.map((index) => flow.get(R.LOCATIONS)[index].name);

    trace(`<--- STEP ${step}: Filter Order lines by Location --->`);
    trace('Operation: OrderLines.clearAllFilters (line 562)');
    OrderLines.clearAllFilters();
    // Apply isolation last because some location modals rebuild the filter form on Save.
    trace('Operation: filterAndWait (line 564)');
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
      trace('Operation: OrderLines.filterByMultiSelectOptions (line 564)');
      return OrderLines.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.TAGS, [
        flow.get(R.TAGS)[3].label,
      ]);
    });
    trace('Operation: OrderLines.assertResetAllButtonState (line 567)');
    OrderLines.assertResetAllButtonState({ disabled: false });

    trace('Operation: filterAndWait (line 569)');
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
      trace('Operation: OrderLines.selectMultipleLocationsInFilters (line 569)');
      return OrderLines.selectMultipleLocationsInFilters(locationNames);
    });
    trace('Operation: OrderLines.assertResetAllButtonState (line 570)');
    OrderLines.assertResetAllButtonState({ disabled: false });
    trace('Operation: verifyLines (line 571)');
    verifyLines(expected);
  };

  const filterPluginAndVerify = (label, values, expected) => {
    trace(`<--- STEP 34: Filter Select order lines by ${label} --->`);
    trace('Operation: SelectOrderLinesModal.clearAllFilters (line 576)');
    SelectOrderLinesModal.clearAllFilters();
    trace('Operation: filterWithIsolation (line 577)');
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
      SelectOrderLinesModal.filterByMultiSelectOptions,
      label,
      values,
    );
    trace('Operation: SelectOrderLinesModal.assertResetAllButtonState (line 583)');
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });
    trace('Operation: SelectOrderLinesModal.assertSearchResults (line 584)');
    SelectOrderLinesModal.assertSearchResults(expected.map((lineIndex) => titles[lineIndex]));
  };

  const filterPluginByLocationsAndVerify = (locationIndexes, expected) => {
    const locationNames = locationIndexes.map((index) => flow.get(R.LOCATIONS)[index].name);

    trace('<--- STEP 34: Filter Select order lines by Location --->');
    trace('Operation: SelectOrderLinesModal.clearAllFilters (line 591)');
    SelectOrderLinesModal.clearAllFilters();
    trace('Operation: filterAndWait (line 592)');
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => {
      trace('Operation: SelectOrderLinesModal.filterByMultiSelectOptions (line 592)');
      return SelectOrderLinesModal.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.TAGS, [
        flow.get(R.TAGS)[3].label,
      ]);
    });
    trace('Operation: SelectOrderLinesModal.assertResetAllButtonState (line 595)');
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });

    trace('Operation: filterAndWait (line 597)');
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => {
      trace('Operation: SelectOrderLinesModal.selectMultipleLocationsInFilters (line 597)');
      return SelectOrderLinesModal.selectMultipleLocationsInFilters(locationNames);
    });
    trace('Operation: SelectOrderLinesModal.assertResetAllButtonState (line 598)');
    SelectOrderLinesModal.assertResetAllButtonState({ disabled: false });
    trace('Operation: SelectOrderLinesModal.assertSearchResults (line 599)');
    SelectOrderLinesModal.assertSearchResults(expected.map((lineIndex) => titles[lineIndex]));
  };

  const filterReceivingAndVerify = (label, values, expected) => {
    trace(`<--- STEP 27: Filter Receiving by ${label} --->`);
    trace('Operation: Receiving.clearAllFilters (line 604)');
    Receiving.clearAllFilters();
    trace('Operation: filterWithIsolation (line 605)');
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.RECEIVING,
      Receiving.filterByMultiSelectOptions,
      label,
      values,
    );
    trace('Operation: Receiving.assertResetAllButtonState (line 611)');
    Receiving.assertResetAllButtonState({ disabled: false });
    trace('Operation: Receiving.assertReceivingResults (line 612)');
    Receiving.assertReceivingResults(expected.map((lineIndex) => receivingTitles[lineIndex]));
  };

  const filterReceivingByLocationsAndVerify = (locationIndexes, expected, receivingStatus) => {
    const locationNames = locationIndexes.map((index) => flow.get(R.LOCATIONS)[index].name);

    trace('<--- STEPS 27-28: Filter Receiving by Location --->');
    trace('Operation: Receiving.clearAllFilters (line 619)');
    Receiving.clearAllFilters();
    trace('Operation: filterAndWait (line 620)');
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.RECEIVING, () => {
      trace('Operation: Receiving.filterByMultiSelectOptions (line 620)');
      return Receiving.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.TAGS, [
        flow.get(R.TAGS)[3].label,
      ]);
    });
    trace('Operation: Receiving.assertResetAllButtonState (line 623)');
    Receiving.assertResetAllButtonState({ disabled: false });

    trace('Operation: filterAndWait (line 625)');
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.RECEIVING, () => {
      trace('Operation: Receiving.selectMultipleLocationsInFilters (line 625)');
      return Receiving.selectMultipleLocationsInFilters(locationNames);
    });
    trace('Operation: Receiving.assertResetAllButtonState (line 626)');
    Receiving.assertResetAllButtonState({ disabled: false });
    trace('Operation: Receiving.assertReceivingResults (line 627)');
    Receiving.assertReceivingResults(expected.map((lineIndex) => receivingTitles[lineIndex]));

    if (receivingStatus) {
      trace('Operation: filterAndWait (line 630)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.RECEIVING, () => {
        trace('Operation: Receiving.filterByCheckboxes (line 630)');
        return Receiving.filterByCheckboxes(CLAIMING_FILTER_LABELS.RECEIVING_STATUS, [
          receivingStatus,
        ]);
      });
      trace('Operation: Receiving.assertResetAllButtonState (line 631)');
      Receiving.assertResetAllButtonState({ disabled: false });
      trace('Operation: Receiving.assertReceivingResults (line 632)');
      Receiving.assertReceivingResults([]);
    }
  };

  const filterClaimingAndVerify = (label, values, expected) => {
    trace(`<--- STEP 29: Filter Claiming by ${label} --->`);
    trace('Operation: Claiming.clearAllFilters (line 638)');
    Claiming.clearAllFilters();
    trace('Operation: filterWithIsolation (line 639)');
    filterWithIsolation(
      PANE_REQUEST_PROFILE_NAMES.CLAIMING,
      Claiming.filterByMultiSelectOptions,
      label,
      values,
    );
    trace('Operation: Claiming.assertResetAllButtonState (line 645)');
    Claiming.assertResetAllButtonState({ disabled: false });
    trace('Operation: verifyClaiming (line 646)');
    verifyClaiming(expected);
  };

  const filterClaimingByLocationsAndVerify = (locationIndexes, expected, receivingStatus) => {
    const locationNames = locationIndexes.map((index) => flow.get(R.LOCATIONS)[index].name);

    trace('<--- STEP 29: Filter Claiming by Location --->');
    trace('Operation: Claiming.clearAllFilters (line 653)');
    Claiming.clearAllFilters();
    trace('Operation: filterAndWait (line 654)');
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.CLAIMING, () => {
      trace('Operation: Claiming.filterByMultiSelectOptions (line 654)');
      return Claiming.filterByMultiSelectOptions(CLAIMING_FILTER_LABELS.TAGS, [
        flow.get(R.TAGS)[3].label,
      ]);
    });
    trace('Operation: Claiming.assertResetAllButtonState (line 655)');
    Claiming.assertResetAllButtonState({ disabled: false });

    trace('Operation: filterAndWait (line 657)');
    filterAndWait(PANE_REQUEST_PROFILE_NAMES.CLAIMING, () => {
      trace('Operation: Claiming.selectMultipleLocationsInFilters (line 657)');
      return Claiming.selectMultipleLocationsInFilters(locationNames);
    });
    trace('Operation: Claiming.assertResetAllButtonState (line 658)');
    Claiming.assertResetAllButtonState({ disabled: false });
    trace('Operation: verifyClaiming (line 659)');
    verifyClaiming(expected);

    if (receivingStatus) {
      trace('Operation: filterAndWait (line 662)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.CLAIMING, () => {
        trace('Operation: Claiming.filterByCheckboxes (line 662)');
        return Claiming.filterByCheckboxes(CLAIMING_FILTER_LABELS.RECEIVING_STATUS, [
          receivingStatus,
        ]);
      });
      trace('Operation: Claiming.assertResetAllButtonState (line 663)');
      Claiming.assertResetAllButtonState({ disabled: false });
      trace('Operation: verifyClaiming (line 664)');
      verifyClaiming([]);
    }
  };

  const navigateAndWaitForFilters = ({ application, pane, waiter }) => {
    trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 669)');
    PaneRequestWaiter.waitForPaneRequests({
      pane,
      phase: PANE_REQUEST_PHASES.FILTERS,
      trigger: () => {
        trace('Operation: TopMenuNavigation.navigateToApp (line 673)');
        TopMenuNavigation.navigateToApp(application);
        trace('Operation: waiter (line 674)');
        waiter();
      },
    });
  };

  // The test is running for 1 hour, using 10 Gb RAM causing test pipelines to fail (workers are freezing).
  // The test is disabled until the root cause is found.
  // #freeze pipeline deadlock
  it(
    'C1375887 Search and filter Orders and Order lines with new indexes (thunderjet)',
    { tags: ['extendedPathBroken', 'thunderjet', 'C1375887Broken'] },
    () => {
      trace('TEST: start');

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

          [...new Set([exact, exact.toLowerCase()])].forEach((value) => {
            trace('Operation: search (line 784)');
            return search(step, searchIndex, value, expected);
          });
          if (partial) {
            trace('Operation: search (line 785)');
            search(step, searchIndex, partial, expected);
          }
          trace('Operation: search (line 786)');
          search(step, searchIndex, trailing, expected);
          trace('Operation: search (line 787)');
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
      trace('Operation: Orders.resetAllFilters (line 850)');
      Orders.resetAllFilters();
      trace('Operation: filterAndWait (line 851)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => {
        trace('Operation: Orders.filterByTags (line 851)');
        return Orders.filterByTags([isolationTag.label]);
      });
      trace('<--- STEP 1: Exact PO-number keyword search is case-insensitive --->');
      [poNumbers[0], poNumbers[0].toLowerCase()].forEach((value) => {
        trace('Operation: searchOrders (line 853)');
        return searchOrders(1, ORDER_SEARCH_OPTIONS.KEYWORD, value, [0]);
      });
      trace('Operation: searchOrders (line 854)');
      searchOrders(2, ORDER_SEARCH_OPTIONS.KEYWORD, poNumbers[1], [1]);
      trace('Operation: searchOrders (line 855)');
      searchOrders(3, ORDER_SEARCH_OPTIONS.KEYWORD, poNumberPrefix, []);

      trace('<--- STEP 4: Verify PO-number wildcard behavior --->');
      trace('Operation: searchOrders (line 858)');
      searchOrders(4, ORDER_SEARCH_OPTIONS.KEYWORD, '*', [0, 1]);
      trace('Operation: searchOrders (line 859)');
      searchOrders(4, ORDER_SEARCH_OPTIONS.KEYWORD, `${poNumberPrefix}*`, [0, 1]);
      trace('Operation: searchOrders (line 860)');
      searchOrders(4, ORDER_SEARCH_OPTIONS.KEYWORD, '*101', [1]);
      trace('Operation: searchOrders (line 861)');
      searchOrders(4, ORDER_SEARCH_OPTIONS.KEYWORD, '*10*', [0, 1]);

      trace('<--- STEP 5: Repeat PO-number searches with the PO number index --->');
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
      ].forEach(([value, expected]) => {
        trace('Operation: searchOrders (line 875)');
        return searchOrders(5, ORDER_SEARCH_OPTIONS.PO_NUMBER, value, expected);
      });

      trace('<--- STEPS 6-7: Search by Date created and Date opened --->');
      [ORDER_SEARCH_OPTIONS.DATE_CREATED, ORDER_SEARCH_OPTIONS.DATE_OPENED].forEach((index) => {
        const step = index === ORDER_SEARCH_OPTIONS.DATE_CREATED ? 6 : 7;
        trace('Operation: searchOrders (line 880)');
        searchOrders(step, index, formatDate(flow.get(R.LOCALE), new Date()), [0, 1]);
        trace('Operation: searchOrders (line 881)');
        searchOrders(step, index, '12/31/2099', []);
        trace('Operation: searchOrders (line 882)');
        searchOrders(step, index, index === ORDER_SEARCH_OPTIONS.DATE_CREATED ? '25' : '-5', []);
        trace('Operation: searchOrders (line 883)');
        searchOrders(step, index, '*', []);
      });

      trace('<--- STEPS 8-10: Verify Fund code, Tags and Review period filters --->');
      trace('Operation: filterOrdersAndVerify (line 887)');
      filterOrdersAndVerify(8, ORDER_FILTER_LABELS.FUND_CODE, [fundA.code], [0, 1]);
      trace('Operation: filterOrdersAndVerify (line 888)');
      filterOrdersAndVerify(8, ORDER_FILTER_LABELS.FUND_CODE, [fundB.code], [1]);
      trace('Operation: filterOrdersAndVerify (line 889)');
      filterOrdersAndVerify(8, ORDER_FILTER_LABELS.FUND_CODE, [fundA.code, fundB.code], [0, 1]);
      trace('Operation: filterOrdersAndVerify (line 890)');
      filterOrdersAndVerify(9, ORDER_FILTER_LABELS.TAGS, [tag1.label], [0]);
      trace('Operation: filterOrdersAndVerify (line 891)');
      filterOrdersAndVerify(9, ORDER_FILTER_LABELS.TAGS, [tag2.label], [0]);
      trace('Operation: filterOrdersAndVerify (line 892)');
      filterOrdersAndVerify(9, ORDER_FILTER_LABELS.TAGS, [tag1.label, tag2.label], [0]);
      trace('Operation: filterOrdersAndVerify (line 893)');
      filterOrdersAndVerify(9, ORDER_FILTER_LABELS.TAGS, [tag3.label], []);

      [
        ['2', []],
        ['20', []],
        ['200', [0]],
      ].forEach(([value, expected]) => {
        trace('<--- STEP 10: Filter Orders by Review period --->');
        trace('Operation: Orders.resetAllFilters (line 901)');
        Orders.resetAllFilters();
        trace('Operation: filterAndWait (line 902)');
        filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => {
          trace('Operation: Orders.filterByMultiSelectOptions (line 902)');
          return Orders.filterByMultiSelectOptions(ORDER_FILTER_LABELS.TAGS, [
            flow.get(R.TAGS)[3].label,
          ]);
        });
        trace('Operation: filterAndWait (line 903)');
        filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDERS, () => {
          trace('Operation: Orders.filterByTextField (line 903)');
          return Orders.filterByTextField(ORDER_FILTER_LABELS.REVIEW_PERIOD, value);
        });
        trace('Operation: verifyOrders (line 904)');
        verifyOrders(expected);
      });
      trace('Operation: Orders.resetAllFilters (line 906)');
      Orders.resetAllFilters();

      /* ORDERS LINES */
      trace('<--- STEPS 11-16: Search PO lines by POL number and Vendor account --->');
      trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 910)');
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          trace('Operation: Orders.selectOrderLines (line 914)');
          Orders.selectOrderLines();
          trace('Operation: OrderLines.waitLoading (line 915)');
          OrderLines.waitLoading();
        },
      });

      trace('Operation: OrderLines.clearAllFilters (line 919)');
      OrderLines.clearAllFilters();
      trace('Operation: filterAndWait (line 920)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('Operation: OrderLines.filterByTags (line 920)');
        return OrderLines.filterByTags([isolationTag.label]);
      }); // Isolate test data

      [line1.poLineNumber, line1.poLineNumber.toLowerCase()].forEach((value) => {
        trace('Operation: searchLines (line 922)');
        return searchLines(11, KEYWORD, value, [0]);
      });
      trace('Operation: searchLines (line 923)');
      searchLines(12, KEYWORD, line2.poLineNumber, [1]);
      trace('Operation: searchLines (line 924)');
      searchLines(13, KEYWORD, '123-58', [0]);
      [poNumbers[0], `${poNumbers[1]}-`, '123', poNumberPrefix].forEach((value) => {
        trace('Operation: searchLines (line 925)');
        return searchLines(14, KEYWORD, value, []);
      });
      [
        ['*', [0, 1]],
        [`${poNumberPrefix}*`, [0, 1]],
      ].forEach(([value, expected]) => {
        trace('Operation: searchLines (line 929)');
        return searchLines(15, KEYWORD, value, expected);
      });

      trace(
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
      ].forEach(([value, expected]) => {
        trace('Operation: searchLines (line 944)');
        return searchLines(16, POL_NUMBER, value, expected);
      });
      [
        ['123-58', [0]],
        ['12*8', [0]],
        ['123', []],
        ['123*', [0]],
        ['123*8', [0]],
        ['*58', [0]],
        ['*3-5*', [0]],
        ['*', [0, 1]],
      ].forEach(([value, expected]) => {
        trace('Operation: searchLines (line 954)');
        return searchLines(16, VENDOR_ACCOUNT, value, expected);
      });

      trace('<--- STEP 17: Search every new PO-line text field through Keyword --->');
      trace('Operation: runPoLineTextSearchMatrix (line 957)');
      runPoLineTextSearchMatrix({
        step: 17,
        search: searchLines,
        dedicated: false,
      });
      trace('Operation: InteractorsTools.closeAllVisibleCallouts (line 962)');
      InteractorsTools.closeAllVisibleCallouts();
      trace('<--- STEP 18: Repeat every text-field matrix on its dedicated index --->');
      trace('Operation: runPoLineTextSearchMatrix (line 964)');
      runPoLineTextSearchMatrix({
        step: 18,
        search: searchLines,
        dedicated: true,
      });
      trace('Operation: InteractorsTools.closeAllVisibleCallouts (line 969)');
      InteractorsTools.closeAllVisibleCallouts();
      trace('Operation: searchLines (line 970)');
      searchLines(18, TITLE_OR_PACKAGE, 'Osterreich', [0]);

      trace('<--- STEPS 19-23: Apply Tags, Fund, Expense class and Location filters --->');
      trace('Operation: filterLinesAndVerify (line 973)');
      filterLinesAndVerify(19, ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label], []);
      trace('Operation: filterLinesAndVerify (line 974)');
      filterLinesAndVerify(19, ORDER_LINE_FILTER_LABELS.TAGS, [tag2.label], []);
      trace('Operation: filterLinesAndVerify (line 975)');
      filterLinesAndVerify(19, ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label, tag2.label], []);
      trace('Operation: filterLinesAndVerify (line 976)');
      filterLinesAndVerify(
        19,
        ORDER_LINE_FILTER_LABELS.TAGS,
        [tag1.label, tag2.label, tag3.label],
        [0],
      );
      trace('Operation: filterLinesAndVerify (line 982)');
      filterLinesAndVerify(19, ORDER_LINE_FILTER_LABELS.TAGS, [tag3.label], [0]);
      trace('Operation: filterLinesAndVerify (line 983)');
      filterLinesAndVerify(20, ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundA.code], [0, 1]);
      trace('Operation: filterLinesAndVerify (line 984)');
      filterLinesAndVerify(20, ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundB.code], [1]);
      trace('Operation: filterLinesAndVerify (line 985)');
      filterLinesAndVerify(
        20,
        ORDER_LINE_FILTER_LABELS.FUND_CODE,
        [fundA.code, fundB.code],
        [0, 1],
      );

      trace('<--- STEP 21: Add Expense class without resetting Fund filters --->');
      trace('Operation: filterAndWait (line 993)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('Operation: OrderLines.filterByMultiSelectOptions (line 993)');
        return OrderLines.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
          expenseClass1.name,
        ]);
      });
      trace('Operation: verifyLines (line 996)');
      verifyLines([0]);
      trace('Operation: filterAndWait (line 997)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('Operation: OrderLines.filterByMultiSelectOptions (line 997)');
        return OrderLines.filterByMultiSelectOptions(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
          expenseClass2.name,
        ]);
      });
      trace('Operation: verifyLines (line 1000)');
      verifyLines([0, 1]);
      trace('Operation: filterAndWait (line 1001)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('Operation: OrderLines.removeMultiSelectChips (line 1001)');
        return OrderLines.removeMultiSelectChips(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [
          expenseClass1.name,
        ]);
      });
      trace('Operation: verifyLines (line 1004)');
      verifyLines([1]);

      trace('<--- STEP 22: Add Location without resetting Fund or Expense-class filters --->');
      trace('Operation: filterAndWait (line 1007)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('Operation: OrderLines.selectLocationInFilters (line 1007)');
        return OrderLines.selectLocationInFilters(flow.get(R.LOCATIONS)[2].name);
      });
      trace('Operation: verifyLines (line 1008)');
      verifyLines([1]);
      trace('Operation: filterAndWait (line 1009)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('Operation: OrderLines.clearFilter (line 1009)');
        return OrderLines.clearFilter(ORDER_LINE_FILTER_LABELS.LOCATION);
      });
      trace('Operation: filterAndWait (line 1010)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('Operation: OrderLines.selectLocationInFilters (line 1010)');
        return OrderLines.selectLocationInFilters(flow.get(R.LOCATIONS)[0].name);
      });
      trace('Operation: verifyLines (line 1011)');
      verifyLines([]);
      trace('Operation: filterLinesByLocationsAndVerify (line 1012)');
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [0], expected: [0] });
      trace('Operation: filterLinesByLocationsAndVerify (line 1013)');
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [1], expected: [0] });
      trace('Operation: filterLinesByLocationsAndVerify (line 1014)');
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [0, 1], expected: [0] });
      trace('Operation: filterLinesByLocationsAndVerify (line 1015)');
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [0, 1, 2], expected: [0, 1] });
      trace('Operation: filterLinesByLocationsAndVerify (line 1016)');
      filterLinesByLocationsAndVerify({ step: 23, locationIndexes: [2], expected: [1] });
      trace('Operation: OrderLines.clearAllFilters (line 1017)');
      OrderLines.clearAllFilters();

      /* RECEIVING */
      trace('<--- STEPS 24-28: Repeat searches and filters in Receiving --->');
      trace('Operation: navigateAndWaitForFilters (line 1021)');
      navigateAndWaitForFilters({
        application: APPLICATION_NAMES.RECEIVING,
        pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
        waiter: Receiving.waitLoading,
      });

      trace('Operation: Receiving.clearAllFilters (line 1027)');
      Receiving.clearAllFilters();
      trace('Operation: filterAndWait (line 1028)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.ORDER_LINES, () => {
        trace('Operation: Receiving.filterByTags (line 1028)');
        return Receiving.filterByTags([isolationTag.label]);
      }); // Isolate test data

      receivingSearchCases.forEach(([index, value, expected]) => {
        trace('Operation: searchReceiving (line 1030)');
        return searchReceiving(24, index, value, expected);
      });
      receivingKeywordTextCases.forEach(([value, expected]) => {
        trace('Operation: searchReceiving (line 1031)');
        return searchReceiving(25, RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, value, expected);
      });
      receivingDedicatedTextCases.forEach(([index, value, expected]) => {
        trace('Operation: searchReceiving (line 1032)');
        return searchReceiving(26, index, value, expected);
      });
      trace('Operation: Receiving.assertResetAllButtonState (line 1033)');
      Receiving.assertResetAllButtonState({ disabled: false });

      trace('Operation: filterReceivingAndVerify (line 1035)');
      filterReceivingAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label], []);
      trace('Operation: filterReceivingAndVerify (line 1036)');
      filterReceivingAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag2.label], []);
      trace('Operation: filterReceivingAndVerify (line 1037)');
      filterReceivingAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label, tag2.label], []);
      trace('Operation: filterReceivingAndVerify (line 1038)');
      filterReceivingAndVerify(
        ORDER_LINE_FILTER_LABELS.TAGS,
        [tag1.label, tag2.label, tag3.label],
        [0],
      );
      trace('Operation: filterReceivingAndVerify (line 1043)');
      filterReceivingAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag3.label], [0]);
      trace('Operation: filterReceivingByLocationsAndVerify (line 1044)');
      filterReceivingByLocationsAndVerify([0], [0]);
      trace('Operation: filterReceivingByLocationsAndVerify (line 1045)');
      filterReceivingByLocationsAndVerify([1], [0]);
      trace('Operation: filterReceivingByLocationsAndVerify (line 1046)');
      filterReceivingByLocationsAndVerify([0, 1], [0]);
      trace('Operation: filterReceivingByLocationsAndVerify (line 1047)');
      filterReceivingByLocationsAndVerify([0, 1, 2], [0, 1]);
      trace('Operation: filterReceivingByLocationsAndVerify (line 1048)');
      filterReceivingByLocationsAndVerify([2], [1]);
      trace('Operation: filterReceivingByLocationsAndVerify (line 1049)');
      filterReceivingByLocationsAndVerify([0], [0], RECEIVING_PIECE_STATUSES.LATE);

      /* CLAIMING */
      trace(
        '<--- STEP 29: Repeat searches in Claiming and verify index change waits for Search --->',
      );
      trace('Operation: navigateAndWaitForFilters (line 1055)');
      navigateAndWaitForFilters({
        application: APPLICATION_NAMES.CLAIMING,
        pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
        waiter: Claiming.waitLoading,
      });

      trace('Operation: Claiming.clearAllFilters (line 1061)');
      Claiming.clearAllFilters();
      trace('Operation: filterAndWait (line 1062)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.CLAIMING, () => {
        trace('Operation: Claiming.filterByTags (line 1062)');
        return Claiming.filterByTags([isolationTag.label]);
      });

      receivingSearchCases.forEach(([index, value, expected]) => {
        trace('Operation: searchClaiming (line 1064)');
        return searchClaiming(index, value, expected);
      });
      receivingKeywordTextCases.forEach(([value, expected]) => {
        trace('Operation: searchClaiming (line 1065)');
        return searchClaiming(RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD, value, expected);
      });
      receivingDedicatedTextCases.forEach(([index, value, expected]) => {
        trace('Operation: searchClaiming (line 1066)');
        return searchClaiming(index, value, expected);
      });

      trace('Operation: verifySearchRunsOnSubmitOnly (line 1068)');
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

      trace('Operation: filterClaimingAndVerify (line 1079)');
      filterClaimingAndVerify(CLAIMING_FILTER_LABELS.TAGS, [tag1.label], []);
      trace('Operation: filterClaimingAndVerify (line 1080)');
      filterClaimingAndVerify(CLAIMING_FILTER_LABELS.TAGS, [tag2.label], []);
      trace('Operation: filterClaimingAndVerify (line 1081)');
      filterClaimingAndVerify(CLAIMING_FILTER_LABELS.TAGS, [tag1.label, tag2.label], []);
      trace('Operation: filterClaimingAndVerify (line 1082)');
      filterClaimingAndVerify(
        CLAIMING_FILTER_LABELS.TAGS,
        [tag1.label, tag2.label, tag3.label],
        [0],
      );
      trace('Operation: filterClaimingAndVerify (line 1087)');
      filterClaimingAndVerify(CLAIMING_FILTER_LABELS.TAGS, [tag3.label], [0]);
      trace('Operation: filterClaimingByLocationsAndVerify (line 1088)');
      filterClaimingByLocationsAndVerify([0], [0]);
      trace('Operation: filterClaimingByLocationsAndVerify (line 1089)');
      filterClaimingByLocationsAndVerify([1], [0]);
      trace('Operation: filterClaimingByLocationsAndVerify (line 1090)');
      filterClaimingByLocationsAndVerify([0, 1], [0]);
      trace('Operation: filterClaimingByLocationsAndVerify (line 1091)');
      filterClaimingByLocationsAndVerify([0, 1, 2], [0, 1]);
      trace('Operation: filterClaimingByLocationsAndVerify (line 1092)');
      filterClaimingByLocationsAndVerify([2], [1]);
      trace('Operation: filterClaimingByLocationsAndVerify (line 1093)');
      filterClaimingByLocationsAndVerify([0], [0], RECEIVING_PIECE_STATUSES.LATE);

      /* INVOICES */
      trace('<--- STEPS 30-34: Reuse the same PO-line search matrix in Select order lines --->');
      trace('Operation: navigateAndWaitForFilters (line 1097)');
      navigateAndWaitForFilters({
        application: APPLICATION_NAMES.INVOICES,
        pane: PANE_REQUEST_PROFILE_NAMES.INVOICES,
        waiter: Invoices.waitLoading,
      });
      trace('Operation: filterAndWait (line 1102)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.INVOICES, () => {
        trace('Operation: Invoices.searchByNumber (line 1102)');
        return Invoices.searchByNumber(invoice.vendorInvoiceNo);
      });
      trace('Operation: Invoices.selectInvoice (line 1103)');
      Invoices.selectInvoice(invoice.vendorInvoiceNo);
      trace('Operation: PaneRequestWaiter.waitForPaneRequests (line 1104)');
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          trace('Operation: InvoiceView.openSelectOrderLineModal (line 1107)');
          return InvoiceView.openSelectOrderLineModal();
        },
      });
      trace('Operation: SelectOrderLinesModal.verifyModalView (line 1109)');
      SelectOrderLinesModal.verifyModalView();
      trace('Operation: filterAndWait (line 1110)');
      filterAndWait(PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE, () => {
        trace('Operation: SelectOrderLinesModal.filterByTags (line 1110)');
        return SelectOrderLinesModal.filterByTags([isolationTag.label]);
      });

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
      ].forEach(([index, value, expected]) => {
        trace('Operation: searchPlugin (line 1137)');
        return searchPlugin(31, index, value, expected);
      });

      trace('Operation: verifySearchRunsOnSubmitOnly (line 1139)');
      verifySearchRunsOnSubmitOnly({
        step: 31,
        pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
        fragment: SelectOrderLinesModal,
        verifyResults: (lineIndexes) => {
          trace('Operation: SelectOrderLinesModal.assertSearchResults (line 1143)');
          return SelectOrderLinesModal.assertSearchResults(
            lineIndexes.map((lineIndex) => titles[lineIndex]),
          );
        },
        index: VENDOR_ACCOUNT,
        changedIndex: POL_NUMBER,
        value: '123-58',
        expected: [0],
      });

      trace('Operation: runPoLineTextSearchMatrix (line 1152)');
      runPoLineTextSearchMatrix({
        step: 32,
        search: searchPlugin,
        dedicated: false,
      });
      trace('Operation: runPoLineTextSearchMatrix (line 1157)');
      runPoLineTextSearchMatrix({
        step: 33,
        search: searchPlugin,
        dedicated: true,
        samples: poLineTextSamples.filter(({ index }) => index !== DONOR_DEPRECATED),
      });
      trace('Operation: searchPlugin (line 1163)');
      searchPlugin(33, TITLE_OR_PACKAGE, 'Osterreich', [0]);

      trace('<--- STEP 34: Repeat PO-line filters in Select order lines --->');
      trace('Operation: filterPluginAndVerify (line 1166)');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label], []);
      trace('Operation: filterPluginAndVerify (line 1167)');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag2.label], []);
      trace('Operation: filterPluginAndVerify (line 1168)');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag1.label, tag2.label], []);
      trace('Operation: filterPluginAndVerify (line 1169)');
      filterPluginAndVerify(
        ORDER_LINE_FILTER_LABELS.TAGS,
        [tag1.label, tag2.label, tag3.label],
        [0],
      );
      trace('Operation: filterPluginAndVerify (line 1174)');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.TAGS, [tag3.label], [0]);
      trace('Operation: filterPluginAndVerify (line 1175)');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundA.code], [0, 1]);
      trace('Operation: filterPluginAndVerify (line 1176)');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundB.code], [1]);
      trace('Operation: filterPluginAndVerify (line 1177)');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.FUND_CODE, [fundA.code, fundB.code], [0, 1]);
      trace('Operation: filterPluginAndVerify (line 1178)');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [expenseClass1.name], [0]);
      trace('Operation: filterPluginAndVerify (line 1179)');
      filterPluginAndVerify(
        ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS,
        [expenseClass1.name, expenseClass2.name],
        [0, 1],
      );
      trace('Operation: filterPluginAndVerify (line 1184)');
      filterPluginAndVerify(ORDER_LINE_FILTER_LABELS.EXPENSE_CLASS, [expenseClass2.name], [1]);
      trace('Operation: filterPluginByLocationsAndVerify (line 1185)');
      filterPluginByLocationsAndVerify([0], [0]);
      trace('Operation: filterPluginByLocationsAndVerify (line 1186)');
      filterPluginByLocationsAndVerify([1], [0]);
      trace('Operation: filterPluginByLocationsAndVerify (line 1187)');
      filterPluginByLocationsAndVerify([0, 1], [0]);
      trace('Operation: filterPluginByLocationsAndVerify (line 1188)');
      filterPluginByLocationsAndVerify([0, 1, 2], [0, 1]);
      trace('Operation: filterPluginByLocationsAndVerify (line 1189)');
      filterPluginByLocationsAndVerify([2], [1]);
      trace('Operation: SelectOrderLinesModal.closeModal (line 1190)');
      SelectOrderLinesModal.closeModal();

      trace('TEST: complete');
    },
  );
});
