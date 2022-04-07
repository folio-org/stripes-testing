import uuid from 'uuid';
import { HTML, including, Link } from '@interactors/html';
import {
  Button,
  KeyValue,
  Modal,
  MultiColumnListCell, PaneHeader,
  Section,
  TextField
} from '../../../../interactors';

const actionsButton = Button('Actions');
const markAsMissingButton = Button('Mark as missing');
const confirmItemMissingModal = Modal('Confirm item status: Missing');
const itemStatusKeyValue = KeyValue('Item status');

export default {
  itemStatuses: [
    'Available',
    'On order',
    'In process',
    'Checked out',
    'In transit',
    'Awaiting pickup',
    'Claimed returned',
    'Declared lost',
    'Lost and paid',
    'Paged',
    'Awaiting delivery',
    'Order closed',
    'Withdrawn',
  ],

  itemsToNotMarkAsMissing: [
    'On order',
    'In process',
    'Checked out',
    'Claimed returned',
    'Declared lost',
    'Order closed',
  ],

  getItemsToMarkAsMissing(items) {
    return items.filter(item => !this.itemsToNotMarkAsMissing.includes(item.status.name));
  },

  itemToRequestMap: {
    'Awaiting pickup': 'Open - awaiting pickup',
    'Awaiting delivery': 'Open - awaiting delivery',
    'In transit': 'Open - in transit'
  },

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
      const items = this.itemStatuses.map(status => ({
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
        holdings: [{
          holdingId: instanceRecordData.holdingId,
          holdingsTypeId: instanceRecordData.holdingsTypeId,
          permanentLocationId: instanceRecordData.permanentLocationId,
          sourceId: instanceRecordData.sourceId,
        }],
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
    return cy.wrap(Promise.resolve(true)).then(() => {
      cy.getServicePointsApi({ limit: 1, query: 'pickupLocation=="true"' }).then(servicePoints => {
        requestData.pickupServicePointId = servicePoints[0].id;
      });
      cy.getUserGroups({ limit: 1 }).then(patronGroup => {
        userData.patronGroup = patronGroup;
      });
    }).then(() => {
      cy.createUserApi(userData).then(user => {
        createdUserId = user.id;
        requestData.requesterId = user.id;
      });
    }).then(() => {
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

  clickMarkAsMissing() {
    cy.do([actionsButton.click(), markAsMissingButton.click()]);
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
    const now = new Date();
    now.setHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    this.getStatusUpdatedValue().then(value => {
      const statusDateInMs = new Date(value).getTime();
      const nowInUTCMs = now.getTime();
      // check is updated status is close to +/- 1 minute from now
      expect(statusDateInMs).to.be.closeTo(nowInUTCMs, 30000);
    });
  },

  closeItemView() {
    cy.do(Button({ icon: 'times' }).click());
  }
};
