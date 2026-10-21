import uuid from 'uuid';

import {
  APPLICATION_NAMES,
  ORDER_LINE_SEARCH_INDEX_LABELS,
  POL_CREATE_INVENTORY_SETTINGS,
  RECEIVING_TITLE_SEARCH_INDEX_LABELS,
} from '../../support/constants';
import Permissions from '../../support/dictionary/permissions';
import Claiming from '../../support/fragments/claiming/claiming';
import { BasicOrderLine, NewOrder, OrderLines, Orders } from '../../support/fragments/orders';
import SelectOrderLinesModal from '../../support/fragments/invoices/modal/selectOrderLinesModal';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import Receiving from '../../support/fragments/receiving/receiving';
import ReceivingEditForm from '../../support/fragments/receiving/receivingEditForm';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { ExecutionFlowManager, PaneRequestWaiter } from '../../support/utils';
import getRandomPostfix from '../../support/utils/stringTools';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import { OrderLinesLimit } from '../../support/fragments/settings/orders';

const trace = (message) => {
  trace('cy.task');
  return cy.task('log', `[C1385305] ${message}`);
};

const { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } = PaneRequestWaiter;
const { KEYWORD, PRODUCT_ID, PRODUCT_ID_ISBN } = ORDER_LINE_SEARCH_INDEX_LABELS;
const TAGS_FILTER_LABEL = 'Tags';

const R = {
  ORGANIZATION: 'organization',
  LOCATION: 'location',
  MATERIAL_TYPE: 'materialType',
  ACQUISITION_METHOD: 'acquisitionMethod',
  PRODUCT_ID_TYPES: 'productIdTypes',
  ORDERS: 'orders',
  LINES: 'lines',
  TAG: 'tag',
  USER: 'user',
};

// The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
// #freeze pipeline deadlock
describe('Orders', () => {
  const flow = new ExecutionFlowManager();
  const postfix = getRandomPostfix();
  const identifiers = {
    isbnQualified: '9780375806131 (hardcover)',
    isbn1: '9780375806131',
    isbn2Qualified: '9783110373929 (dvd)',
    isbn2: '9783110373929',
    lccn: '2013043507',
    issn: '2193-4231',
    isbnHyphenated: '978-3-11-033749-5',
  };

  const createLine = (order, lineData) => {
    const types = flow.get(R.PRODUCT_ID_TYPES);

    trace('OrderLines.createOrderLineViaApi');
    return OrderLines.createOrderLineViaApi({
      ...BasicOrderLine.defaultOrderLine,
      id: uuid(),
      purchaseOrderId: order.id,
      acquisitionMethod: flow.get(R.ACQUISITION_METHOD).id,
      titleOrPackage: lineData.title,
      claimingActive: true,
      claimingInterval: 30,
      cost: {
        ...BasicOrderLine.defaultOrderLine.cost,
        quantityPhysical: 1,
      },
      details: {
        productIds: lineData.productIds.map(({ id, qualifier, type }) => ({
          productId: id,
          productIdType: types[type].id,
          ...(qualifier && { qualifier }),
        })),
      },
      locations: [
        {
          locationId: flow.get(R.LOCATION).id,
          quantity: 1,
          quantityPhysical: 1,
        },
      ],
      physical: {
        createInventory: POL_CREATE_INVENTORY_SETTINGS.INSTANCE_HOLDING_ITEM,
        materialType: flow.get(R.MATERIAL_TYPE).id,
        materialSupplier: flow.get(R.ORGANIZATION).id,
        volumes: [],
      },
      tags: { tagList: [flow.get(R.TAG).label] },
    });
  };

  before('Create C1385305 preconditions', () => {
    trace('SETUP: start');

    trace('cy.getAdminToken');
    cy.getAdminToken();
    trace('cy.clearAllLocalStorage');
    cy.clearAllLocalStorage();

    flow
      .step(() => {
        trace('SETUP: step 1');

        trace('OrderLinesLimit.setPOLLimitViaApi');
        OrderLinesLimit.setPOLLimitViaApi(2);
      })
      .step((currentFlow) => {
        trace('SETUP: step 2');

        const label = `AT_C1385305_${postfix}`;

        trace('cy.createTagApi');
        return cy.createTagApi({ label }).then((id) => currentFlow.set(R.TAG, { id, label }, () => {
          trace('cy.deleteTagApi');
          return cy.deleteTagApi(id, true);
        }));
      })
      .step((currentFlow) => {
        trace('SETUP: step 3');

        const organization = {
          ...NewOrganization.defaultUiOrganizations,
          name: `AT_C1385305_Vendor_${postfix}`,
          tags: { tagList: [currentFlow.get(R.TAG).label] },
        };

        trace('Organizations.createOrganizationViaApi');
        return Organizations.createOrganizationViaApi(organization).then((id) => currentFlow.set(R.ORGANIZATION, { ...organization, id }, () => {
          trace('Organizations.deleteOrganizationViaApi');
          return Organizations.deleteOrganizationViaApi(id);
        }));
      })
      .step((currentFlow) => {
        trace('SETUP: step 4');

        trace('cy.getLocations');
        return cy
          .getLocations({ limit: 1 })
          .then((location) => currentFlow.set(R.LOCATION, location));
      })
      .step((currentFlow) => {
        trace('SETUP: step 5');

        trace('cy.getDefaultMaterialType');
        return cy
          .getDefaultMaterialType()
          .then((materialType) => currentFlow.set(R.MATERIAL_TYPE, materialType));
      })
      .step((currentFlow) => {
        trace('SETUP: step 6');

        trace('cy.getAcquisitionMethodsApi');
        return cy
          .getAcquisitionMethodsApi()
          .then(({ body }) => currentFlow.set(R.ACQUISITION_METHOD, body.acquisitionMethods[0]));
      })
      .step((currentFlow) => {
        trace('SETUP: step 7');

        const types = {};

        return cy
          .wrap(['ISBN', 'ISSN', 'LCCN'])
          .each((name) => {
            trace('cy.getProductIdTypes');
            return cy
              .getProductIdTypes({
                query: `name=="${name}"`,
              })
              .then((type) => {
                types[name] = type;
              });
          })
          .then(() => currentFlow.set(R.PRODUCT_ID_TYPES, types));
      })
      .step((currentFlow) => {
        trace('SETUP: step 8');

        const orders = [];

        return cy
          .wrap([1, 2])
          .each((number) => {
            trace('Orders.createOrderViaApi');
            return Orders.createOrderViaApi({
              ...NewOrder.getDefaultOrder({ vendorId: currentFlow.get(R.ORGANIZATION).id }),
              id: uuid(),
              notes: [`AT1385305-${number}-${postfix}`],
              tags: { tagList: [currentFlow.get(R.TAG).label] },
            }).then((order) => orders.push(order));
          })
          .then(() => currentFlow.set(R.ORDERS, orders, () => orders.forEach(({ id }) => {
            trace('Orders.deleteOrderViaApi');
            return Orders.deleteOrderViaApi(id, false);
          })));
      })
      .step((currentFlow) => {
        trace('SETUP: step 9');

        const [order1, order2] = currentFlow.get(R.ORDERS);
        const lines = [];

        trace('createLine');
        return createLine(order1, {
          title: `AT_C1385305_Title_1_${postfix}`,
          productIds: [{ id: identifiers.isbn1, qualifier: 'hardcover', type: 'ISBN' }],
        })
          .then((line) => lines.push(line))
          .then(() => {
            trace('createLine');
            return createLine(order1, {
              title: `AT_C1385305_Title_2_${postfix}`,
              productIds: [
                { id: identifiers.isbn2Qualified, type: 'ISBN' },
                { id: identifiers.lccn, type: 'LCCN' },
              ],
            }).then((line) => lines.push(line));
          })
          .then(() => {
            trace('createLine');
            return createLine(order2, {
              title: `AT_C1385305_Title_3_${postfix}`,
              productIds: [
                { id: identifiers.issn, type: 'ISSN' },
                { id: identifiers.isbnHyphenated, type: 'ISBN' },
              ],
            }).then((line) => lines.push(line));
          })
          .then(() => currentFlow.set(R.LINES, lines));
      })
      .step((currentFlow) => cy.wrap(currentFlow.get(R.ORDERS)).each((order) => {
        trace('Orders.updateOrderViaApi');
        return Orders.updateOrderViaApi({ ...order, workflowStatus: 'Open' }).then(({ body }) => {
          Object.assign(order, body);
        });
      }))
      .step((currentFlow) => {
        trace('SETUP: step 10');

        trace('cy.createTempUser');
        return cy
          .createTempUser([
            Permissions.uiOrdersView.gui,
            Permissions.uiReceivingViewEditCreate.gui,
            Permissions.uiClaimingView.gui,
            Permissions.uiTagsPermissionAll.gui,
          ])
          .then((user) => currentFlow.set(R.USER, user, () => {
            trace('Users.deleteViaApi');
            return Users.deleteViaApi(user.userId);
          }));
      })
      .step((currentFlow) => {
        trace('SETUP: step 11');

        trace('cy.login');
        return cy.login(currentFlow.get(R.USER).username, currentFlow.get(R.USER).password, {
          path: TopMenu.orderLinesPath,
          waiter: OrderLines.waitLoading,
        });
      });

    trace('SETUP: complete');
  });

  after('Delete C1385305 data', () => {
    trace('CLEANUP: start');

    trace('cy.getAdminToken');
    cy.getAdminToken();
    trace('flow.cleanup');
    flow.cleanup();

    trace('CLEANUP: complete');
  });

  const resolveTitles = (lineIndexes) => lineIndexes.map((lineIndex) => flow.get(R.LINES)[lineIndex].titleOrPackage);

  const poLineSearchScenarios = [
    { step: 1, value: identifiers.isbnQualified, expected: [[], [], [0]] },
    { step: 2, value: identifiers.isbn1, expected: [[0], [0], [0]] },
    { step: 3, value: identifiers.isbn1.slice(0, 10), expected: [[], [], []] },
    { step: 4, value: '*', expected: [[0, 1, 2], [0, 1, 2], []] },
    { step: 5, value: `${identifiers.isbn1.slice(0, 10)}*`, expected: [[0], [0], []] },
    { step: 6, value: identifiers.isbn2Qualified, expected: [[1], [1], [1]] },
    { step: 7, value: identifiers.isbn2, expected: [[1], [1], [1]] },
    { step: 8, value: identifiers.isbn2.slice(0, 10), expected: [[], [], []] },
    { step: 9, value: `${identifiers.isbn2.slice(0, 10)}*`, expected: [[1], [1], []] },
    { step: 10, value: identifiers.lccn, expected: [[1], [1], []] },
    { step: 11, value: identifiers.lccn.slice(0, 7), expected: [[], [], []] },
    { step: 12, value: `${identifiers.lccn.slice(0, 7)}*`, expected: [[1], [1], []] },
    { step: 13, value: identifiers.issn, expected: [[2], [2], []] },
    { step: 14, value: identifiers.issn.slice(0, 4), expected: [[2], [2], []] },
    { step: 15, value: `${identifiers.issn.slice(0, 7)}*`, expected: [[2], [2], []] },
    { step: 16, value: identifiers.isbnHyphenated, expected: [[2], [2], [2]] },
    { step: 17, value: identifiers.isbnHyphenated.slice(0, -2), expected: [[2], [2], []] },
    { step: 18, value: `${identifiers.isbnHyphenated.slice(0, -3)}*`, expected: [[2], [2], []] },
  ];

  const titleSearchScenarios = [
    { step: 20, value: identifiers.isbnQualified, expected: [] },
    { step: 21, value: identifiers.isbn1, expected: [0] },
    { step: 22, value: identifiers.isbn1.slice(0, 10), expected: [] },
    { step: 23, value: '*', expected: [0, 1, 2] },
    { step: 24, value: `${identifiers.isbn1.slice(0, 10)}*`, expected: [0] },
    { step: 25, value: identifiers.isbn2Qualified, expected: [1] },
    { step: 26, value: identifiers.isbn2, expected: [1] },
    { step: 27, value: identifiers.isbn2.slice(0, 10), expected: [] },
    { step: 28, value: `${identifiers.isbn2.slice(0, 10)}*`, expected: [1] },
    { step: 29, value: identifiers.lccn, expected: [1] },
    { step: 30, value: identifiers.lccn.slice(0, 7), expected: [] },
    { step: 31, value: `${identifiers.lccn.slice(0, 7)}*`, expected: [1] },
    { step: 32, value: identifiers.issn, expected: [2] },
    { step: 33, value: identifiers.issn.slice(0, 4), expected: [2] },
    { step: 34, value: `${identifiers.issn.slice(0, 6)}*`, expected: [2] },
    { step: 35, value: identifiers.isbnHyphenated, expected: [2] },
    { step: 36, value: identifiers.isbnHyphenated.slice(0, -2), expected: [2] },
    { step: 37, value: `${identifiers.isbnHyphenated.slice(0, -3)}*`, expected: [2] },
  ];

  const waitForSearch = ({ pane, index, trigger }) => {
    trace('PaneRequestWaiter.waitForPaneRequests');
    return PaneRequestWaiter.waitForPaneRequests({
      pane,
      conditions: { isbnConversion: index === PRODUCT_ID_ISBN },
      trigger,
    });
  };

  const searchOrderLinesAndVerify = ({ context = 'Orders', pane, search, assert }) => {
    const indexes = [KEYWORD, PRODUCT_ID, PRODUCT_ID_ISBN];

    poLineSearchScenarios.forEach(({ step, value, expected }) => {
      indexes.forEach((index, indexPosition) => {
        const expectedLineIndexes = expected[indexPosition];

        trace(`<--- ${context} STEP ${step}: Search ${index} --->`);
        trace('waitForSearch');
        waitForSearch({
          pane,
          index,
          trigger: () => {
            trace('search');
            return search(index, value);
          },
        });
        trace(`<--- ${context} STEP ${step}: Verify ${index} results --->`);
        trace('assert');
        assert(resolveTitles(expectedLineIndexes));
      });
    });
  };

  const searchTitlesAndVerify = ({
    context,
    pane,
    search,
    assert,
    indexes = [KEYWORD, PRODUCT_ID],
  }) => {
    titleSearchScenarios.forEach(({ step, value, expected }) => {
      indexes.forEach((index) => {
        trace(`<--- ${context} STEP ${step}: Search ${index} --->`);
        trace('waitForSearch');
        waitForSearch({
          pane,
          index,
          trigger: () => {
            trace('search');
            return search(index, value);
          },
        });
        trace(`<--- ${context} STEP ${step}: Verify ${index} results --->`);
        trace('assert');
        assert(resolveTitles(expected));
      });
    });
  };

  const filterByTagAndWait = ({ pane, trigger }) => {
    trace('PaneRequestWaiter.waitForPaneRequests');
    PaneRequestWaiter.waitForPaneRequests({
      pane,
      trigger,
    });
  };

  // The test is freezing in pipeline, so skipping it for now. Needs to be investigated and fixed.
  // #freeze pipeline deadlock
  it(
    'C1385305 Search PO lines by product IDs with new indexes (thunderjet)',
    { tags: ['extendedPathBroken', 'thunderjet', 'C1385305Broken'] },
    () => {
      trace('TEST: start');

      const tagLabel = flow.get(R.TAG).label;

      trace('<--- Filter order lines by tag to isolate test data --->');
      trace('filterByTagAndWait');
      filterByTagAndWait({
        pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
        trigger: () => {
          trace('OrderLines.filterByTags');
          return OrderLines.filterByTags([tagLabel]);
        },
      });

      trace('searchOrderLinesAndVerify');
      searchOrderLinesAndVerify({
        pane: PANE_REQUEST_PROFILE_NAMES.ORDER_LINES,
        search: (index, value) => {
          trace('OrderLines.searchByParameter');
          return OrderLines.searchByParameter(index, value);
        },
        assert: (titles) => {
          trace('OrderLines.assertTitlesInResults');
          return OrderLines.assertTitlesInResults(titles);
        },
      });

      trace('<--- STEP 19: Repeat searches in the Receiving POL look-up plugin --->');
      trace('PaneRequestWaiter.waitForPaneRequests');
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          trace('TopMenuNavigation.navigateToApp');
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.RECEIVING);
          trace('Receiving.waitLoading');
          Receiving.waitLoading();
        },
      });
      trace('Receiving.clickNewTitleOption');
      Receiving.clickNewTitleOption();
      trace('ReceivingEditForm.waitLoading');
      ReceivingEditForm.waitLoading({ timeout: 60_000 });
      trace('PaneRequestWaiter.waitForPaneRequests');
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          trace('Receiving.clickPOLNumberLookUpButton');
          return Receiving.clickPOLNumberLookUpButton();
        },
      });
      trace('SelectOrderLinesModal.verifyModalView');
      SelectOrderLinesModal.verifyModalView({ multiselect: false });
      trace('filterByTagAndWait');
      filterByTagAndWait({
        pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
        trigger: () => {
          trace('SelectOrderLinesModal.filterByMultiSelectOptions');
          return SelectOrderLinesModal.filterByMultiSelectOptions(TAGS_FILTER_LABEL, [tagLabel]);
        },
      });
      trace('searchOrderLinesAndVerify');
      searchOrderLinesAndVerify({
        context: 'Select order lines plugin (STEP 19 repeats)',
        pane: PANE_REQUEST_PROFILE_NAMES.FIND_PO_LINE,
        search: (index, value) => {
          trace('SelectOrderLinesModal.searchByParameter');
          return SelectOrderLinesModal.searchByParameter(index, value);
        },
        assert: (titles) => {
          trace('SelectOrderLinesModal.assertSearchResults');
          return SelectOrderLinesModal.assertSearchResults(titles);
        },
      });
      trace('SelectOrderLinesModal.closeModal');
      SelectOrderLinesModal.closeModal();
      trace('ReceivingEditForm.clickCancelButton');
      ReceivingEditForm.clickCancelButton();
      trace('Receiving.waitLoading');
      Receiving.waitLoading();

      trace('<--- STEPS 20-37: Repeat product-ID searches in Receiving --->');
      trace('Receiving.resetFilters');
      Receiving.resetFilters();
      trace('filterByTagAndWait');
      filterByTagAndWait({
        pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
        trigger: () => {
          trace('Receiving.filterByMultiSelectOptions');
          return Receiving.filterByMultiSelectOptions(TAGS_FILTER_LABEL, [tagLabel]);
        },
      });
      trace('searchTitlesAndVerify');
      searchTitlesAndVerify({
        context: 'Receiving',
        pane: PANE_REQUEST_PROFILE_NAMES.RECEIVING,
        search: (index, value) => {
          trace('Receiving.searchByParameter');
          return Receiving.searchByParameter({ parameter: index, value });
        },
        assert: (titles) => {
          trace('Receiving.assertReceivingResults');
          return Receiving.assertReceivingResults(titles);
        },
        indexes: [
          RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD,
          RECEIVING_TITLE_SEARCH_INDEX_LABELS.PRODUCT_ID,
        ],
      });

      trace('<--- STEP 38: Repeat product-ID searches in Claiming --->');
      trace('PaneRequestWaiter.waitForPaneRequests');
      PaneRequestWaiter.waitForPaneRequests({
        pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
        phase: PANE_REQUEST_PHASES.FILTERS,
        trigger: () => {
          trace('TopMenuNavigation.navigateToApp');
          TopMenuNavigation.navigateToApp(APPLICATION_NAMES.CLAIMING);
          trace('Claiming.waitLoading');
          Claiming.waitLoading();
        },
      });
      trace('Claiming.clearAllFilters');
      Claiming.clearAllFilters();
      trace('filterByTagAndWait');
      filterByTagAndWait({
        pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
        trigger: () => {
          trace('Claiming.filterByMultiSelectOptions');
          return Claiming.filterByMultiSelectOptions(TAGS_FILTER_LABEL, [tagLabel]);
        },
      });
      trace('searchTitlesAndVerify');
      searchTitlesAndVerify({
        context: 'Claiming (STEP 38 repeats)',
        pane: PANE_REQUEST_PROFILE_NAMES.CLAIMING,
        search: (index, value) => {
          trace('Claiming.searchByParameter');
          return Claiming.searchByParameter(index, value);
        },
        assert: (titles) => {
          trace('Claiming.assertPiecesWithTitlesDisplayed');
          return Claiming.assertPiecesWithTitlesDisplayed(titles);
        },
        indexes: [
          RECEIVING_TITLE_SEARCH_INDEX_LABELS.KEYWORD,
          RECEIVING_TITLE_SEARCH_INDEX_LABELS.PRODUCT_ID,
        ],
      });

      trace('TEST: complete');
    },
  );
});
