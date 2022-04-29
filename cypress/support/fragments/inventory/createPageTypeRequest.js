import uuid from 'uuid';
import { including, Link } from '@interactors/html';
import {
  Button,
  KeyValue,
  MultiColumnListCell,
  PaneHeader,
  Section,
  TextField
} from '../../../../interactors';

const actionsButton = Button('Actions');
const newRequestButton = Button('New Request');

export default {
  createItemsForGivenStatusesApi() {
    let materialTypeValue = '';
    const instanceRecordData = {
      instanceTitle: `inst_title-${uuid()}`,
      instanceId: uuid(),
      holdingId: uuid(),
      instanceTypeId: null,
      holdingsTypeId: null,
      permanentLocationId: null,
      sourceId: null,
      permanentLoanTypeId: null,
      materialTypeId: null
    };

    return cy.wrap(Promise.resolve(true)).then(() => {
      cy.getMaterialTypes({ limit: 1 }).then(materialType => {
        instanceRecordData.materialTypeId = materialType.id;
        materialTypeValue = materialType.name;
      });
      cy.getLoanTypes({ limit: 1 }).then(loanTypes => {
        instanceRecordData.permanentLoanTypeId = loanTypes[0].id;
      });
      cy.getHoldingTypes({ limit: 1 }).then(holdingsTypes => {
        instanceRecordData.holdingsTypeId = holdingsTypes[0].id;
      });
      cy.getLocations({ limit: 1 }).then(location => {
        instanceRecordData.permanentLocationId = location.id;
      });
      cy.getHoldingSources({ limit: 1 }).then(holdingsSources => {
        instanceRecordData.sourceId = holdingsSources[0].id;
      });
      cy.getInstanceTypes({ limit: 1 }).then(instanceTypes => {
        instanceRecordData.instanceTypeId = instanceTypes[0].id;
      });
    }).then(() => {
      const item = {
        itemId: uuid(),
        barcode: uuid(),
        status: { name: 'Available' },
        permanentLoanType: { id: instanceRecordData.permanentLoanTypeId },
        materialType: { id: instanceRecordData.materialTypeId },
      };

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
        items: [[item]],
      });
      cy.wrap({ item, instanceRecordData, materialTypeValue });
    });
  },

  createRequestForGivenItemApi(item, { holdingId, instanceId }, requestStatus) {
    let createdUserId = '';
    let createdRequestId = '';
    const userData = {
      active: true,
      barcode: uuid(),
      personal: {
        preferredContactTypeId: '002',
        lastName: `test_user_${uuid()}`,
        email: 'test@folio.org',
      },
      departments: [],
      patronGroup: null,
    };
    const requestData = {
      id: uuid(),
      requestType: 'Hold',
      requesterId: null,
      holdingsRecordId: holdingId,
      instanceId,
      requestLevel: 'Item',
      itemId: item.itemId,
      requestDate: new Date().toISOString(),
      fulfilmentPreference: 'Hold Shelf',
      pickupServicePointId: null,
      status: requestStatus,
    };
    return cy.wrap(Promise.resolve(true))
      .then(() => {
        cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' }).then(servicePoints => {
          requestData.pickupServicePointId = servicePoints[0].id;
        });
        cy.getUserGroups({ limit: 1 }).then(patronGroup => {
          userData.patronGroup = patronGroup;
        });
      })
      .then(() => {
        cy.createUserApi(userData).then(user => {
          createdUserId = user.id;
          requestData.requesterId = user.id;
        });
      })
      .then(() => {
        cy.createItemRequestApi(requestData).then(({ id }) => {
          createdRequestId = id;
          return { createdUserId, createdRequestId };
        });
      });
  },

  findAndOpenInstance(instanceTitle) {
    cy.do([
      TextField({ id: 'input-inventory-search' }).fillIn(instanceTitle),
      Button('Search').click(),
      MultiColumnListCell({ row: 0, column: instanceTitle }).click(),
    ]);
    cy.expect(Section({ id: 'pane-instancedetails' }).exists());
  },

  openHoldingsAccordion(holdingId) {
    cy.do(Button({ id: `accordion-toggle-button-${holdingId}` }).click());
  },

  openItem(itemBarcode) {
    cy.do(Link(itemBarcode).click());
  },

  clickNewRequest() {
    cy.do([actionsButton.click(), newRequestButton.click()]);
  },

  verifyItemStatus(status) {
    cy.expect(PaneHeader(including(status)).exists());
  },

  closeItemView() {
    cy.do(Button({ icon: 'times' }).click());
  },

  verifyRequestStatus(value) {
    cy.expect(KeyValue('Request status').has({ value }));
  }
};
