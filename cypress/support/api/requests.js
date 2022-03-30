import uuid from 'uuid';

Cypress.Commands.add('getItemRequestsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'circulation/requests',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('requests', body.requests);
    });
});

Cypress.Commands.add('createItemRequestApi', (data) => {
  cy
    .okapiRequest({
      method: 'POST',
      path: 'circulation/requests',
      body: data,
    })
    .then(({ body }) => {
      Cypress.env('request', body);
      return body;
    });
});

Cypress.Commands.add('changeItemRequestApi', (request) => {
  cy
    .okapiRequest({
      method: 'PUT',
      path: `circulation/requests/${request.id}`,
      body: request,
    })
    .then(({ body }) => {
      Cypress.env('request', body);
      return body;
    });
});

Cypress.Commands.add('getCancellationReasonsApi', (searchParams) => {
  cy
    .okapiRequest({
      path: 'cancellation-reason-storage/cancellation-reasons',
      searchParams,
    })
    .then(({ body }) => {
      Cypress.env('cancellationReasons', body.cancellationReasons);
      return body.cancellationReasons;
    });
});

/**
 * Creates a request with associated item (instance) and user.
 * Returns created request, item (instance) and user details.
 * @param {string} itemStatus - {@link https://s3.amazonaws.com/foliodocs/api/mod-inventory/inventory.html#inventory_items_post}
 * @param {('Page'|'Hold'|'Recall')} requestType
 * @param {'Item'|'Title'} requestLevel
  */
Cypress.Commands.add('createRequestApi', (
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
    instanceTitle : `instanceTitle-${uuid()}`,
    itemBarcode : `item-barcode-${uuid()}`,
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

  cy.wrap(Promise.resolve(true))
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
            materialType: { id:  instanceRecordData.materialTypeId },
          }],
        ],
      });
    })
    .then(() => {
      cy.createItemRequestApi(requestData).then(createdRequest => {
        return { createdUser, createdRequest, instanceRecordData, cancellationReasonId };
      });
    });
});
