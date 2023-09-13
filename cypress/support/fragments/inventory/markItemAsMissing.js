import uuid from 'uuid';
import { HTML, including, Link } from '@interactors/html';
import {
  Button,
  KeyValue,
  Modal,
  MultiColumnListCell,
  PaneHeader,
  Section,
  TextField,
} from '../../../../interactors';
import { FULFILMENT_PREFERENCES, REQUEST_LEVELS, REQUEST_TYPES } from '../../constants';
import getRandomPostfix from '../../utils/stringTools';
import users from '../users/users';
import InventoryHoldings from './holdings/inventoryHoldings';
import ServicePoints from '../settings/tenant/servicePoints/servicePoints';

const actionsButton = Button('Actions');
const markAsMissingButton = Button('Missing');
const confirmItemMissingModal = Modal('Confirm item status: Missing');
const itemStatusKeyValue = KeyValue('Item status');

export default {
  itemsToMarkAsMissing: [
    'Available',
    'In process',
    'Paged',
    'Awaiting pickup',
    'Awaiting delivery',
    'In transit',
    'Withdrawn',
  ],

  itemsNotToMarkAsMissing: [
    'On order',
    'Checked out',
    'Claimed returned',
    'Declared lost',
    'Order closed',
  ],

  itemStatusesToCreate() {
    return this.itemsToMarkAsMissing.concat(this.itemsNotToMarkAsMissing);
  },

  itemToRequestMap: {
    'Awaiting pickup': 'Open - awaiting pickup',
    'Awaiting delivery': 'Open - awaiting delivery',
    'In transit': 'Open - in transit',
  },

  getItemsToCreateRequests(items) {
    return items.filter(({ status: { name } }) => name in this.itemToRequestMap);
  },

  getItemsToMarkAsMissing(items) {
    return items.filter(({ status: { name } }) => this.itemsToMarkAsMissing.includes(name));
  },

  getItemsNotToMarkAsMissing(items) {
    return items.filter(({ status: { name } }) => this.itemsNotToMarkAsMissing.includes(name));
  },

  createItemsForGivenStatusesApi() {
    let materialTypeValue = '';
    const instanceRecordData = {
      instanceTitle: `Automation test instance title ${getRandomPostfix()}`,
      instanceId: uuid(),
      holdingId: uuid(),
      instanceTypeId: null,
      holdingsTypeId: null,
      permanentLocationId: null,
      sourceId: null,
      permanentLoanTypeId: null,
      materialTypeId: null,
    };

    return cy
      .wrap(Promise.resolve(true))
      .then(() => {
        cy.getMaterialTypes({ query: 'name="video recording"' }).then((materialType) => {
          instanceRecordData.materialTypeId = materialType.id;
          materialTypeValue = materialType.name;
        });
        cy.getLoanTypes({ limit: 1 }).then((loanTypes) => {
          instanceRecordData.permanentLoanTypeId = loanTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingsTypes) => {
          instanceRecordData.holdingsTypeId = holdingsTypes[0].id;
        });
        cy.getLocations({ limit: 1 }).then((location) => {
          instanceRecordData.permanentLocationId = location.id;
        });
        InventoryHoldings.getHoldingSources({ limit: 1 }).then((holdingsSources) => {
          instanceRecordData.sourceId = holdingsSources[0].id;
        });
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          instanceRecordData.instanceTypeId = instanceTypes[0].id;
        });
      })
      .then(() => {
        const items = this.itemStatusesToCreate().map((status) => ({
          itemId: uuid(),
          barcode: uuid(),
          status: { name: status },
          permanentLoanType: { id: instanceRecordData.permanentLoanTypeId },
          materialType: { id: instanceRecordData.materialTypeId },
        }));

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
          items: [items],
        });
        cy.wrap({ items, instanceRecordData, materialTypeValue });
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
      requestType: REQUEST_TYPES.HOLD,
      requesterId: null,
      holdingsRecordId: holdingId,
      instanceId,
      requestLevel: REQUEST_LEVELS.ITEM,
      itemId: item.itemId,
      requestDate: new Date().toISOString(),
      fulfillmentPreference: FULFILMENT_PREFERENCES.HOLD_SHELF,
      pickupServicePointId: null,
      status: requestStatus,
    };
    return cy
      .wrap(Promise.resolve(true))
      .then(() => {
        ServicePoints.getViaApi({ limit: 1, query: 'pickupLocation=="true"' }).then(
          (servicePoints) => {
            requestData.pickupServicePointId = servicePoints[0].id;
          },
        );
        cy.getUserGroups({ limit: 1 }).then((patronGroup) => {
          userData.patronGroup = patronGroup;
        });
      })
      .then(() => {
        users.createViaApi(userData).then((user) => {
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
      Button({ type: 'submit' }).click(),
      MultiColumnListCell({ row: 0, content: instanceTitle }).click(),
    ]);
    cy.expect(Section({ id: 'pane-instancedetails' }).exists());
  },

  openHoldingsAccordion(holdingId) {
    cy.do(Button({ id: `accordion-toggle-button-${holdingId}` }).click());
  },

  openItem(itemBarcode) {
    cy.do(Link(itemBarcode).click());
  },

  checkIsMarkAsMissingExist(isExist) {
    cy.do(actionsButton.click());
    if (isExist) {
      cy.expect(markAsMissingButton.exists());
    } else {
      cy.expect(markAsMissingButton.absent());
    }
    cy.do(actionsButton.click());
  },

  checkIsConfirmItemMissingModalExist(instanceTitle, itemBarcode, materialType) {
    const modalContent = `${instanceTitle} (${materialType}) (Barcode: ${itemBarcode})'s item status will be marked as Missing.`;
    cy.expect(confirmItemMissingModal.find(HTML(including(modalContent))).exists());
    cy.expect(confirmItemMissingModal.find(Button('Cancel')).exists());
    cy.expect(confirmItemMissingModal.find(Button('Confirm')).exists());
  },

  cancelModal() {
    cy.do(confirmItemMissingModal.find(Button('Cancel')).click());
  },

  confirmModal() {
    cy.do(confirmItemMissingModal.find(Button('Confirm')).click());
  },

  verifyItemStatus(status) {
    cy.expect(PaneHeader(including(status)).exists());
  },

  getStatusUpdatedValue() {
    return cy.then(() => itemStatusKeyValue.subValue());
  },

  verifyItemStatusUpdatedDate() {
    this.getStatusUpdatedValue().then((value) => {
      const now = new Date();
      now.setHours(
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds(),
        now.getUTCMilliseconds(),
      );

      const statusDateInMs = new Date(value).getTime();
      const nowInUTCMs = now.getTime();

      // check is updated status is close to +/- 2 minute from now
      expect(statusDateInMs).to.be.closeTo(nowInUTCMs, 120_000);
    });
  },

  verifyRequestStatus(value) {
    cy.expect(KeyValue('Request status').has({ value }));
  },
};
