import { HTML, including } from '@interactors/html';
import { Keyboard } from '@interactors/keyboard';
import uuid from 'uuid';
import {
  Accordion,
  Button,
  Checkbox,
  Heading,
  IconButton,
  KeyValue,
  Link,
  MultiColumnListCell,
  MultiColumnListHeader,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectOption,
  Pane,
  Section,
  Spinner,
  TextArea,
  TextField,
  ValueChipRoot,
} from '../../../../interactors';
import {
  FULFILMENT_PREFERENCES,
  ITEM_STATUS_NAMES,
  REQUEST_LEVELS,
  REQUEST_TYPES,
} from '../../constants';
import Helper from '../finance/financeHelper';
import inventoryHoldings from '../inventory/holdings/inventoryHoldings';
import ServicePoints from '../settings/tenant/servicePoints/servicePoints';
import users from '../users/users';

const requestsResultsSection = Section({ id: 'pane-results' });
const requestDetailsSection = Pane({ title: 'Request details' });
const appsButton = Button({ id: 'app-list-dropdown-toggle' });
const requestsPane = Pane({ title: 'Requests' });
const requestQueuePane = Pane({ id: 'request-queue' });
const pageCheckbox = Checkbox({ name: 'Page' });
const recallCheckbox = Checkbox({ name: 'Recall' });
const holdCheckbox = Checkbox({ name: 'Hold' });
const showTagsButton = Button({ id: 'clickable-show-tags' });
const tagsPane = Pane({ title: 'Tags' });
const addTagInput = MultiSelect({ id: 'input-tag' });
const actionsButtonInResultsPane = requestsResultsSection.find(Button('Actions'));
const exportSearchResultsToCsvOption = Button({ id: 'exportToCsvPaneHeaderBtn' });
const pickupServicePointCheckbox = Checkbox('Pickup service point');
const tagsAccordion = Accordion('Tags');
const tagsSelect = MultiSelect({ ariaLabelledby: including('tags') });
const resetAllButton = Button('Reset all');

const waitContentLoading = () => {
  cy.expect(Pane({ id: 'pane-filter' }).exists());
  cy.expect(
    requestsResultsSection
      .find(HTML(including('Choose a filter or enter a search query to show results.')))
      .exists(),
  );
};

/**
 * Creates a request with associated item (instance) and user.
 * Returns created request, item (instance) and user details.
 * @param {string} [itemStatus=Available] - {@link https://s3.amazonaws.com/foliodocs/api/mod-inventory/inventory.html#inventory_items_post}
 * @param {('Page'|'Hold'|'Recall')} [requestType=Page]
 * @param {('Item'|'Title')} [requestLevel=Item]
 * @returns {Object}
 */
function createRequestApi(
  itemStatus = ITEM_STATUS_NAMES.AVAILABLE,
  requestType = REQUEST_TYPES.PAGE,
  requestLevel = REQUEST_LEVELS.ITEM,
  namePrefix = '',
) {
  const userData = {
    active: true,
    barcode: uuid(),
    username: `testUser-${uuid()}`,
    personal: {
      preferredContactTypeId: '002',
      lastName: `testUser-${uuid()}`,
      email: 'test@folio.org',
      addresses: [{ addressTypeId: null, primaryAddress: true }],
    },
    departments: [],
    patronGroup: null,
    type: 'staff',
  };
  const userRequestPreferences = {
    id: uuid(),
    fulfillment: FULFILMENT_PREFERENCES.DELIVERY,
    defaultDeliveryAddressTypeId: null,
    defaultServicePointId: null,
    delivery: true,
    holdShelf: true,
    userId: null,
  };
  const instanceRecordData = {
    instanceTitle: `${namePrefix}autoTestInstanceTitle ${Helper.getRandomBarcode()}`,
    itemBarcode: `item-barcode-${uuid()}`,
    instanceId: uuid(),
    itemId: uuid(),
    holdingId: uuid(),
    instanceTypeId: null,
    holdingsTypeId: null,
    permanentLocationId: null,
    sourceId: null,
    permanentLoanTypeId: null,
    materialTypeId: null,
  };
  const requestData = {
    id: uuid(),
    requestType,
    requesterId: null,
    holdingsRecordId: instanceRecordData.holdingId,
    instanceId: instanceRecordData.instanceId,
    requestLevel,
    itemId: instanceRecordData.itemId,
    requestDate: new Date().toISOString(),
    fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
    pickupServicePointId: null,
  };

  let createdUser;
  let cancellationReasonId;

  return cy
    .wrap(Promise.resolve(true))
    .then(() => {
      ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then(
        (servicePoints) => {
          requestData.pickupServicePointId = servicePoints[0].id;
        },
      );
      cy.getAddressTypesApi({ limit: 1 }).then((addressTypes) => {
        userData.personal.addresses[0].addressTypeId = addressTypes[0].id;
        userRequestPreferences.defaultDeliveryAddressTypeId = addressTypes[0].id;
      });
      cy.getUserGroups({ limit: 1 }).then((patronGroup) => {
        userData.patronGroup = patronGroup;
      });
      cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
        instanceRecordData.permanentLoanTypeId = loanTypes[0].id;
      });
      cy.getMaterialTypes({ limit: 1 }).then((materialType) => {
        instanceRecordData.materialTypeId = materialType.id;
      });
      cy.getLocations({ limit: 1 }).then((location) => {
        instanceRecordData.permanentLocationId = location.id;
      });
      cy.getHoldingTypes({ limit: 1 }).then((holdingsTypes) => {
        instanceRecordData.holdingsTypeId = holdingsTypes[0].id;
      });
      inventoryHoldings.getHoldingSources({ limit: 1 }).then((holdingsSources) => {
        instanceRecordData.sourceId = holdingsSources[0].id;
      });
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        instanceRecordData.instanceTypeId = instanceTypes[0].id;
      });
      cy.getCancellationReasonsApi({ limit: 1 }).then((cancellationReasons) => {
        cancellationReasonId = cancellationReasons[0].id;
      });
    })
    .then(() => {
      users
        .createViaApi(userData)
        .then((user) => {
          createdUser = user;
          requestData.requesterId = user.id;
          userRequestPreferences.userId = user.id;
        })
        .then(() => {
          cy.createUserRequestPreferencesApi(userRequestPreferences);
        });
    })
    .then(() => {
      cy.createInstance({
        instance: {
          instanceId: instanceRecordData.instanceId,
          instanceTypeId: instanceRecordData.instanceTypeId,
          title: instanceRecordData.instanceTitle,
        },
        holdings: [
          {
            holdingId: instanceRecordData.holdingId,
            holdingsTypeId: instanceRecordData.holdingsTypeId,
            permanentLocationId: instanceRecordData.permanentLocationId,
            sourceId: instanceRecordData.sourceId,
          },
        ],
        items: [
          [
            {
              itemId: instanceRecordData.itemId,
              barcode: instanceRecordData.itemBarcode,
              status: { name: itemStatus },
              permanentLoanType: { id: instanceRecordData.permanentLoanTypeId },
              materialType: { id: instanceRecordData.materialTypeId },
            },
          ],
        ],
      });
    })
    .then(() => {
      cy.createItemRequestApi(requestData).then((createdRequest) => {
        return {
          createdUser,
          createdRequest,
          instanceRecordData,
          cancellationReasonId,
        };
      });
    });
}

function deleteRequestViaApi(requestId) {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `circulation/requests/${requestId}`,
    isDefaultSearchParamsRequired: false,
    failOnStatusCode: false,
  });
}

function getRequestApi(searchParams) {
  return cy
    .okapiRequest({
      path: 'circulation/requests',
      searchParams,
    })
    .then(({ body }) => {
      return body.requests;
    });
}

function deleteRequestPolicyApi(policyId) {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `request-policy-storage/request-policies/${policyId}`,
    isDefaultSearchParamsRequired: false,
  });
}

function waitLoadingTags() {
  cy.expect(tagsPane.exists());
  cy.intercept({
    method: 'GET',
    url: '/tags?limit=10000',
  }).as('getTags');
  cy.wait('@getTags');
  cy.wait(1000);
}

function selectSpecifiedRequestLevel(parameter) {
  return cy.do(Checkbox({ name: parameter }).click());
}

export default {
  createRequestApi,
  deleteRequestViaApi,
  deleteRequestPolicyApi,
  getRequestApi,
  waitContentLoading,
  waitLoadingTags,

  waitLoading: () => cy.expect(Pane({ title: 'Requests' }).exists()),
  resetAllFilters() {
    cy.do(Button('Reset all').click());
    cy.wait(1000);
  },
  selectAwaitingDeliveryRequest: () => cy.do(Checkbox({ name: 'Open - Awaiting delivery' }).click()),
  selectAwaitingPickupRequest: () => cy.do(Checkbox({ name: 'Open - Awaiting pickup' }).click()),
  selectInTransitRequest: () => cy.do(Checkbox({ name: 'Open - In transit' }).click()),
  selectNotYetFilledRequest: () => cy.do(Checkbox({ name: 'Open - Not yet filled' }).click()),
  selectClosedCancelledRequest: () => cy.do(Checkbox({ name: 'Closed - Cancelled' }).click()),
  selectItemRequestLevel: () => selectSpecifiedRequestLevel('Item'),
  selectTitleRequestLevel: () => selectSpecifiedRequestLevel('Title'),
  selectFirstRequest: (title) => cy.do(
    requestsPane
      .find(MultiColumnListCell({ row: 0, content: title }))
      .find(Link(including(title)))
      .click(),
  ),

  selectExactRequest: (title, rowIndex) => cy.do(
    requestsPane
      .find(MultiColumnListCell({ row: rowIndex, content: title }))
      .find(Link(including(title)))
      .click(),
  ),

  selectRequest: (title, rowIndex) => cy.do(
    requestsPane
      .find(
        MultiColumnListCell({
          row: rowIndex,
          content: title,
        }),
      )
      .click(),
  ),

  openTagsPane: () => cy.do(showTagsButton.click()),
  closePane: (title) => cy.do(
    Pane({ title })
      .find(IconButton({ ariaLabel: 'Close ' }))
      .click(),
  ),
  selectHoldsRequestType: () => cy.do(holdCheckbox.click()),
  selectPagesRequestType: () => cy.do(pageCheckbox.click()),
  selectRecallsRequestType: () => cy.do(recallCheckbox.click()),
  verifyNoResultMessage: (noResultMessage) => cy.expect(requestsResultsSection.find(HTML(including(noResultMessage))).exists()),
  navigateToApp(appName) {
    cy.wait(1000);
    cy.do([appsButton.click(), Button(appName).click()]);
    cy.wait(2000);
  },
  verifyCreatedRequest: (title) => cy.expect(requestsPane.find(MultiColumnListCell({ row: 0, content: title })).exists()),
  verifyColumnsPresence() {
    cy.expect([
      [...this.columns, this.sortingColumns].forEach(({ title }) => MultiColumnListHeader(title).exists()),
    ]);
  },

  cancelRequest() {
    cy.do([
      requestDetailsSection.find(Button('Actions')).click(),
      Button({ id: 'clickable-cancel-request' }).click(),
      TextArea('Additional information for patron  ').fillIn('test'),
      Button('Confirm').click(),
    ]);
  },

  findCreatedRequest(title) {
    cy.expect(Pane({ id: 'pane-filter' }).exists());
    cy.expect(
      Pane({ title: 'Search & filter' })
        .find(TextField({ id: 'input-request-search' }))
        .exists(),
    );
    cy.wait(1500);
    cy.do(TextField({ id: 'input-request-search' }).fillIn(title));
    cy.do(Pane({ title: 'Search & filter' }).find(Button('Search')).click());
    cy.wait(3000);
  },

  selectAllOpenRequests() {
    this.selectAwaitingDeliveryRequest();
    this.selectAwaitingPickupRequest();
    this.selectInTransitRequest();
    this.selectNotYetFilledRequest();
  },

  filterRequestsByTag(tag) {
    cy.wait(2000);
    cy.do(
      Pane({ title: 'Search & filter' })
        .find(MultiSelect({ ariaLabelledby: 'tags' }))
        .choose(tag),
    );
  },

  enterTag: (tag) => {
    cy.then(() => tagsAccordion.open()).then((isOpen) => {
      if (!isOpen) {
        cy.do(tagsAccordion.clickHeader());
      }
    });
    cy.do([tagsSelect.focus(), Keyboard.type(tag), Keyboard.press({ code: 'Enter' })]);
  },

  addTag(tag) {
    waitLoadingTags();
    cy.wait(1000);
    cy.do(tagsPane.find(MultiSelect({ id: 'input-tag' })).choose(tag));
    // TODO investigate what to wait
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000);
  },

  addNewTag(tag) {
    cy.do([addTagInput.fillIn(tag), cy.wait(3000), MultiSelectOption(including(tag)).click()]);
  },

  clearSelectedTags() {
    cy.do(tagsAccordion.find(Button({ icon: 'times-circle-solid' })).click());
  },

  verifyAssignedTags(tag) {
    cy.expect(Spinner().absent());
    // need to wait until number of tags is displayed
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(1000);
    cy.expect(tagsPane.find(ValueChipRoot(tag)).exists());
  },

  REQUEST_TYPE_CELL: { columnIndex: 6 },
  verifyIsFilteredByRequestType(requestType) {
    const values = [];
    cy.get('[data-row-index]')
      .each(($row) => {
        cy.get(`[class*="mclCell-"]:nth-child(${this.REQUEST_TYPE_CELL.columnIndex})`, {
          withinSubject: $row,
        })
          .invoke('text')
          .then((cellValue) => {
            values.push(cellValue);
          });
      })
      .then(() => {
        const isFiltered = values.every((value) => value === requestType);
        expect(isFiltered).to.equal(true);
      });
  },

  waitUIFilteredByRequestType() {
    cy.intercept('GET', 'circulation/requests*').as('getFilteredRequests');
    cy.wait('@getFilteredRequests');
  },

  checkRequestType(requestType) {
    cy.wait(500);
    if (requestType === REQUEST_TYPES.PAGE) {
      this.selectPagesRequestType();
    } else if (requestType === REQUEST_TYPES.HOLD) {
      this.selectHoldsRequestType();
    } else if (requestType === REQUEST_TYPES.RECALL) {
      this.selectRecallsRequestType();
    }
    cy.wait(500);
  },

  checkRequestStatus(requestStatus) {
    cy.expect(KeyValue('Request status').has({ value: requestStatus }));
  },

  checkActionDropdownHidden: () => {
    cy.expect(requestDetailsSection.find(Button('Actions')).absent());
  },

  verifyRequestTypeChecked(requestType) {
    if (requestType === REQUEST_TYPES.PAGE) {
      cy.expect(pageCheckbox.has({ checked: true }));
    } else if (requestType === REQUEST_TYPES.HOLD) {
      cy.expect(holdCheckbox.has({ checked: true }));
    } else if (requestType === REQUEST_TYPES.RECALL) {
      cy.expect(recallCheckbox.has({ checked: true }));
    }
  },

  sortingColumns: [
    {
      title: 'Title',
      id: 'title',
      columnIndex: 3,
    },
    {
      title: 'Type',
      id: 'type',
      columnIndex: 6,
    },
    {
      title: 'Item barcode',
      id: 'itembarcode',
      columnIndex: 5,
    },
    {
      title: 'Requester',
      id: 'requester',
      columnIndex: 9,
    },
    {
      title: 'Requester barcode',
      id: 'requesterbarcode',
      columnIndex: 10,
    },
  ],

  columns: [
    {
      title: 'Request date',
      id: 'requestdate',
      columnIndex: 1,
    },
    {
      title: 'Year',
      id: 'year',
      columnIndex: 3,
    },
    {
      title: 'Request status',
      id: 'requeststatus',
      columnIndex: 6,
    },
    {
      title: 'Queue position',
      id: 'position',
      columnIndex: 7,
    },
    {
      title: 'Proxy',
      id: 'proxy',
      columnIndex: 10,
    },
  ],

  checkAllRequestTypes() {
    Object.values(REQUEST_TYPES).forEach((requestType) => {
      cy.do(Checkbox({ name: requestType }).click());
      cy.wait('@getRequests');
    });
  },

  validateRequestTypesChecked() {
    cy.expect(recallCheckbox.checked);
    cy.expect(pageCheckbox.checked);
    cy.expect(holdCheckbox.checked);
  },

  validateNumsAscendingOrder(prev) {
    const itemsClone = [...prev];
    itemsClone.sort((a, b) => a - b);
    cy.expect(itemsClone).to.deep.equal(prev);
  },

  validateNumsDescendingOrder(prev) {
    const itemsClone = [...prev];
    itemsClone.sort((a, b) => b - a);
    cy.expect(itemsClone).to.deep.equal(prev);
  },

  validateStringsAscendingOrder(prev) {
    const itemsClone = [...prev];

    itemsClone.sort((a, b) => {
      // when sorting move falsy values to the end and localeCompare truthy values
      if (!a) return 1;
      if (!b) return -1;
      return a.localeCompare(b);
    });
    expect(prev).to.deep.equal(itemsClone);
  },

  validateStringsDescendingOrder(prev) {
    const itemsClone = [...prev];
    // when sorting move falsy values to the beginning and localeCompare truthy values
    itemsClone.sort((a, b) => {
      if (!a) return -1;
      if (!b) return 1;
      return b.localeCompare(a);
    });
    expect(prev).to.deep.equal(itemsClone);
  },

  // TODO: redesign to interactors
  getMultiColumnListCellsValues(cell) {
    const cells = [];
    // get MultiColumnList rows and loop over
    return cy
      .get('[data-row-index]')
      .each(($row) => {
        // from each row, choose specific cell
        cy.get(`[class*="mclCell-"]:nth-child(${cell})`, { withinSubject: $row })
          // extract its text content
          .invoke('text')
          .then((cellValue) => {
            cells.push(cellValue);
          });
      })
      .then(() => cells);
  },

  getSortOrder(headerId) {
    let order;
    return cy
      .do(
        MultiColumnListHeader({ id: 'list-column-' + headerId }).perform((el) => {
          order = el.attributes.getNamedItem('aria-sort').value;
        }),
      )
      .then(() => order);
  },

  validateRequestsDateSortingOrder(order) {
    this.getMultiColumnListCellsValues(1).then((cells) => {
      const dates = cells.map((cell) => new Date(cell));
      if (order === 'ascending') this.validateNumsAscendingOrder(dates);
      else if (order === 'descending') this.validateNumsDescendingOrder(dates);
    });
  },

  validateRequestsSortingOrder({ headerId, columnIndex }) {
    this.waitLoadingRequests();

    this.getSortOrder(headerId).then((order) => {
      this.getMultiColumnListCellsValues(columnIndex).then((cells) => {
        if (order === 'ascending') this.validateStringsAscendingOrder(cells);
        else if (order === 'descending') this.validateStringsDescendingOrder(cells);
      });
    });
  },

  verifyRequestsPage() {
    cy.expect(Heading({ level: 2, text: 'Requests' }).exists());
  },

  verifyFulfillmentPreference() {
    cy.expect(
      cy
        .get('[name="fulfillmentPreference"]')
        .find('option:selected')
        .should('have.text', FULFILMENT_PREFERENCES.HOLD_SHELF),
    );
  },

  waitLoadingRequests() {
    cy.wait('@getRequests');
    /*
      ***
        - REASON: cy.wait(300)
        It awaits for the api to resolve but as previous MultiColumnCellValues are already present
        It does not wait for UI to update cellValues and some test fails randomly.
        cy.wait(300) awaits for UI to update.
      ***
    */

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(2000);
  },

  getRequestIdViaApi: (searchParams) => cy
    .okapiRequest({
      path: 'circulation/requests',
      searchParams,
    })
    .then((res) => res.body.requests[0].id),

  verifyShowTagsButtonIsDisabled: () => {
    cy.expect(showTagsButton.has({ disabled: true }));
  },

  createNewRequestViaApi: (requestBody) => cy.okapiRequest({
    method: 'POST',
    path: 'circulation/requests',
    body: requestBody,
    isDefaultSearchParamsRequired: false,
  }),

  createNewEcsRequestViaApi: (requestBody) => cy.okapiRequest({
    method: 'POST',
    path: 'circulation-bff/requests',
    body: requestBody,
    isDefaultSearchParamsRequired: false,
  }),

  filterRequestsByServicePoints(servicePoint) {
    cy.wait(5000);
    const pickupServicePointFilterSelector = 'req-pickup-service-point-filter';
    cy.do(HTML({ id: pickupServicePointFilterSelector }).click());
    cy.wait(1000);
    cy.do(MultiSelect({ id: pickupServicePointFilterSelector }).fillIn(servicePoint));
    cy.wait(1000);
    cy.do(MultiSelect({ id: pickupServicePointFilterSelector }).choose(servicePoint));
    cy.wait(1000);
  },

  selectTheFirstRequest() {
    cy.do(
      requestsResultsSection
        .find(MultiColumnListRow({ index: 0 }))
        .find(Link())
        .click(),
    );
  },

  verifyRequestIsPresent(itemData) {
    cy.expect(
      requestsResultsSection.find(MultiColumnListRow({ content: including(itemData) })).exists(),
    );
  },

  verifyRequestIsAbsent(barcode) {
    cy.expect(
      requestsResultsSection.find(MultiColumnListRow({ content: including(barcode) })).absent(),
    );
  },

  clickResetAllButton() {
    cy.expect(resetAllButton.has({ disabled: false }));
    cy.do(resetAllButton.click());
    cy.wait(2000);
    cy.expect(
      HTML({ className: including('noResultsMessage-') }).has({
        text: 'Choose a filter or enter a search query to show results.',
      }),
    );
  },

  exportRequestToCsv: () => {
    cy.wait(1000);
    cy.do([actionsButtonInResultsPane.click(), exportSearchResultsToCsvOption.click()]);
  },

  selectPickupServicePointColumn(select = true) {
    cy.wait(500);
    cy.do(actionsButtonInResultsPane.click());
    cy.wait(500);
    if (select) {
      cy.do(pickupServicePointCheckbox.checkIfNotSelected());
    } else {
      cy.do(pickupServicePointCheckbox.uncheckIfSelected());
    }
    cy.wait(500);
    cy.do(actionsButtonInResultsPane.click());
    cy.wait(500);
  },

  verifyPickupServicePointColumnIsPresent(present = true) {
    if (present) {
      cy.expect(MultiColumnListHeader('Pickup service point').exists());
    } else {
      cy.expect(MultiColumnListHeader('Pickup service point').absent());
    }
  },

  verifyPickupServicePoint(servicePoint, present = true) {
    if (present) {
      cy.expect(MultiColumnListCell({ content: servicePoint }).exists());
    } else {
      cy.expect(MultiColumnListCell({ content: servicePoint }).absent());
    }
  },

  checkCellInCsvFileContainsValue(fileName, rowNumber = 1, columnNumber, value) {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(3000); // wait for the file to load
    cy.readFile(`cypress/downloads/${fileName}`).then((fileContent) => {
      // Split the contents of a file into lines
      const fileRows = fileContent.split('\n');
      const actualData = fileRows[rowNumber].trim().split(',');
      expect(actualData[columnNumber]).to.contains(value);
    });
  },

  deleteDownloadedFile(fileName) {
    const filePath = `cypress\\downloads\\${fileName}`;
    cy.exec(`del "${filePath}"`, { failOnNonZeroExit: false });
  },

  closeRequestQueue() {
    cy.do(requestQueuePane.find(Button({ ariaLabel: 'Close New Request' })).click());
  },

  clickInstanceDescription() {
    cy.do(requestQueuePane.find(Link({ text: including('Instance') })).click());
  },
};
