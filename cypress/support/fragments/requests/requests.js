import uuid from 'uuid';
import {
  Button,
  MultiColumnListCell,
  MultiSelect,
  Pane,
  IconButton,
  TextArea,
  ValueChipRoot,
  Checkbox,
  TextField,
  Badge
} from '../../../../interactors';

/**
 * Creates a request with associated item (instance) and user.
 * Returns created request, item (instance) and user details.
 * @param {string} [itemStatus=Available] - {@link https://s3.amazonaws.com/foliodocs/api/mod-inventory/inventory.html#inventory_items_post}
 * @param {('Page'|'Hold'|'Recall')} [requestType=Page]
 * @param {('Item'|'Title')} [requestLevel=Item]
 * @returns {Object}
 */
const createRequestApi = (
  itemStatus = 'Available',
  requestType = 'Page',
  requestLevel = 'Item',
) => {
  const userData = {
    active: true,
    barcode: uuid(),
    personal: {
      preferredContactTypeId: '002',
      lastName: `testUser-${uuid()}`,
      email: 'test@folio.org',
      addresses: [{ addressTypeId: null, primaryAddress: true }]
    },
    departments: [],
    patronGroup: null,
  };
  const userRequestPreferences = {
    id: uuid(),
    fulfillment: 'Delivery',
    defaultDeliveryAddressTypeId: null,
    defaultServicePointId: null,
    delivery: true,
    holdShelf: true,
    userId: null,
  };
  const instanceRecordData = {
    instanceTitle: `instanceTitle-${uuid()}`,
    itemBarcode: `item-barcode-${uuid()}`,
    instanceId: uuid(),
    itemId: uuid(),
    holdingId: uuid(),
    instanceTypeId: null,
    holdingsTypeId: null,
    permanentLocationId: null,
    sourceId: null,
    permanentLoanTypeId: null,
    materialTypeId: null
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
    fulfilmentPreference: 'Hold Shelf',
    pickupServicePointId: null,
  };
  let createdUser;
  let cancellationReasonId;

  return cy.wrap(Promise.resolve(true))
    .then(() => {
      cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' }).then(servicePoints => {
        requestData.pickupServicePointId = servicePoints[0].id;
      });
      cy.getAddressTypesApi({ limit: 1 }).then(addressTypes => {
        userData.personal.addresses[0].addressTypeId = addressTypes[0].id;
        userRequestPreferences.defaultDeliveryAddressTypeId = addressTypes[0].id;
      });
      cy.getUserGroups({ limit: 1 }).then(patronGroup => {
        userData.patronGroup = patronGroup;
      });
      cy.getLoanTypes({ limit: 1 }).then(loanTypes => {
        instanceRecordData.permanentLoanTypeId = loanTypes[0].id;
      });
      cy.getMaterialTypes({ limit: 1 }).then(materialType => {
        instanceRecordData.materialTypeId = materialType.id;
      });
      cy.getLocations({ limit: 1 }).then(location => {
        instanceRecordData.permanentLocationId = location.id;
      });
      cy.getHoldingTypes({ limit: 1 }).then(holdingsTypes => {
        instanceRecordData.holdingsTypeId = holdingsTypes[0].id;
      });
      cy.getHoldingSources({ limit: 1 }).then(holdingsSources => {
        instanceRecordData.sourceId = holdingsSources[0].id;
      });
      cy.getInstanceTypes({ limit: 1 }).then(instanceTypes => {
        instanceRecordData.instanceTypeId = instanceTypes[0].id;
      });
      cy.getCancellationReasonsApi({ limit: 1 }).then(cancellationReasons => {
        cancellationReasonId = cancellationReasons[0].id;
      });
    })
    .then(() => {
      cy.createUserApi(userData).then(user => {
        createdUser = user;
        requestData.requesterId = user.id;
        userRequestPreferences.userId = user.id;
      });
    })
    .then(() => {
      cy.createUserRequestPreferencesApi(userRequestPreferences);
    })
    .then(() => {
      cy.createInstance({
        instance: {
          instanceId: instanceRecordData.instanceId,
          instanceTypeId: instanceRecordData.instanceTypeId,
          title: instanceRecordData.instanceTitle,
        },
        holdings: [{
          holdingId: instanceRecordData.holdingId,
          holdingsTypeId: instanceRecordData.holdingsTypeId,
          permanentLocationId: instanceRecordData.permanentLocationId,
          sourceId: instanceRecordData.sourceId,
        }],
        items: [
          [{
            itemId: instanceRecordData.itemId,
            barcode: instanceRecordData.itemBarcode,
            status: { name: itemStatus },
            permanentLoanType: { id: instanceRecordData.permanentLoanTypeId },
            materialType: { id: instanceRecordData.materialTypeId },
          }],
        ],
      });
    })
    .then(() => {
      cy.createItemRequestApi(requestData).then(createdRequest => {
        return {
          createdUser,
          createdRequest,
          instanceRecordData,
          cancellationReasonId
        };
      });
    });
};


export default {
  createRequestApi,

  removeCreatedRequest() {
    cy.do([
      Pane({ title: 'Request Detail' }).find(Button('Actions')).click(),
      Button({ id: 'clickable-cancel-request' }).click(),
      TextArea('Additional information for patron *').fillIn('test'),
      Button('Confirm').click(),
    ]);
  },

  findCreatedRequest(title) {
    cy.do(TextField({ id: 'input-request-search' }).fillIn(title));
    cy.do(Pane({ title: 'Search & filter' }).find(Button('Search')).click());
  },

  resetAllFilters() {
    cy.do(Button('Reset all').click());
  },

  selectAwaitingDeliveryRequest() {
    cy.do(Checkbox({ name: 'Open - Awaiting delivery' }).click());
  },

  selectAwaitingPickupRequest() {
    cy.do(Checkbox({ name: 'Open - Awaiting pickup' }).click());
  },

  selectInTransitRequest() {
    cy.do(Checkbox({ name: 'Open - In transit' }).click());
  },

  selectNotYetFilledRequest() {
    cy.do(Checkbox({ name: 'Open - Not yet filled' }).click());
  },

  selectAllOpenRequests() {
    this.selectAwaitingDeliveryRequest();
    this.selectAwaitingPickupRequest();
    this.selectInTransitRequest();
    this.selectNotYetFilledRequest();
  },

  selectFirstRequest(title) {
    cy.do(Pane({ title: 'Requests' }).find(MultiColumnListCell({ row: 0, column: title })).click());
  },

  openTagsPane() {
    cy.do(Button({ id: 'clickable-show-tags' }).click());
  },

  selectTags(tag) {
    this.waitLoadingTags();
    cy.do(Pane({ title: 'Tags' }).find(MultiSelect()).select(tag));
  },

  closePane(title) {
    cy.do(Pane({ title }).find(IconButton({ ariaLabel: 'Close ' })).click());
  },

  verifyAssignedTags(tag) {
    cy.expect(Button({ id: 'clickable-show-tags' }).find(Badge()).has({ value: '1' }));
    cy.expect(Pane({ title: 'Tags' }).find(ValueChipRoot(tag)).exists());
  },

  waitLoadingTags() {
    cy.expect(Pane({ title: 'Tags' }).exists());
    cy.intercept({
      method: 'GET',
      url: '/tags?limit=10000',
    }).as('getTags');
    cy.wait('@getTags');
  },

};
