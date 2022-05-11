import uuid from 'uuid';
import { HTML, including } from '@interactors/html';
import {
  Button,
  MultiColumnListCell,
  Section,
  TextField,
  Modal,
  Checkbox,
  Heading,
  Link,
  Pane,
  Accordion,
  MultiColumnList,
} from '../../../../interactors';
import getRandomPostfix from '../../utils/stringTools';

const actionsButton = Button('Actions');
const saveAndCloseButton = Button({ id: 'clickable-save-request' });
const newRequestButton = Button('New Request');
const selectUserModal = Modal('Select User');
const loanAndAvailabilitySection = Section({ id: 'acc06' });
const inventorySearch = TextField({ id: 'input-inventory-search' });
const searchButton = Button('Search');

function deleteRequestApi(requestId) {
  return cy.okapiRequest({
    method: 'DELETE',
    path: `circulation/requests/${requestId}`,
    isDefaultSearchParamsRequired: false,
  });
}

export default {
  deleteRequestApi,
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

  findAndOpenInstance(instanceTitle) {
    cy.do([
      inventorySearch.fillIn(instanceTitle),
      searchButton.click(),
      MultiColumnListCell({ row: 0, column: instanceTitle, columnIndex: 1 }).click(),
    ]);
    cy.expect(Section({ id: 'pane-instancedetails' }).exists());
  },

  openHoldingsAccordion(holdingId) {
    cy.do(Button({ id: `accordion-toggle-button-${holdingId}` }).click());
  },

  openItem(itemBarcode) {
    cy.do(Link(itemBarcode).click());
  },

  filterRequesterLookup() {
    cy.do([
      Checkbox('faculty').click(),
      Checkbox('Active').click()
    ]);
  },

  selectUser(username) {
    cy.do([
      TextField({ name: 'query' }).fillIn(username),
      Button('Search').click(),
      MultiColumnListCell({ row: 0, column: username }).click(),
    ]);
  },

  selectPickupServicePoint() {
    cy.do(cy.get('[name="pickupServicePointId"]').select('Circ Desk 1'));
  },

  verifyInventoryDetailsPage(barcode) {
    cy.expect(Heading({
      level: 2,
      text: `Item • ${barcode} • Paged`,
    }).exists());
  },

  clickItemBarcodeLink(barcode) {
    cy.do(Link(barcode).click());
    this.verifyInventoryDetailsPage(barcode);
  },

  getRequestsCountLink() {
    let requestsCountLink;
    return cy.get(Section({ id: 'acc06' }).find(HTML('Requests')).perform(el => {
      requestsCountLink = el.parentElement.querySelector('a');
    })).then(() => requestsCountLink);
  },

  findAvailableItem(instance, itemBarcode) {
    this.findAndOpenInstance(instance.instanceTitle);
    this.openHoldingsAccordion(instance.holdingId);
    this.openItem(itemBarcode);
  },

  verifyrequestsCountOnItemRecord() {
    cy.expect(loanAndAvailabilitySection.find(HTML('Requests')).assert(el => {
      const count = +el.parentElement.querySelector('a').textContent;
      expect(count).to.be.greaterThan(0);
    }));
  },

  verifyUserRecordPage(username) {
    cy.expect(Heading({ level: 2, text: including(username) }).exists());
  },

  verifyRequestsPage() {
    cy.expect(Heading({ level: 2, text: 'Requests' }).exists());
  },

  verifyNewRequest() {
    cy.expect(Section({ id: 'item-info' }).find(Link('1')).exists());
    cy.expect(Section({ id: 'item-info' }).find(HTML('Paged')).exists());
  },

  verifyRequesterDetailsPopulated(username) {
    cy.expect(Section({ id: 'new-requester-info' }).find(Link(including(username))).exists());
    cy.expect(Section({ id: 'new-requester-info' }).find(HTML('faculty')).exists());
  },

  verifyFulfillmentPreference() {
    cy.expect(cy.get('[name="fulfilmentPreference"]').find('option:selected').should('have.text', 'Hold Shelf'));
  },

  checkModalExists(isExist) {
    if (isExist) {
      cy.expect(selectUserModal.exists());
    } else {
      cy.expect(selectUserModal.absent());
    }
  },

  verifyItemDetailsPrepopulated(itemBarcode) {
    cy.expect(Link(itemBarcode).exists());
    cy.expect(Section({ id: 'new-request-info' }).find(HTML('Page')).exists());
  },

  clickNewRequest(itemBarcode) {
    cy.do([actionsButton.click(), newRequestButton.click()]);
    this.verifyItemDetailsPrepopulated(itemBarcode);
  },

  selectActiveFacultyUser(username) {
    cy.do(Button('Requester look-up').click());
    this.checkModalExists(true);
    this.filterRequesterLookup();
    this.selectUser(username);
    this.checkModalExists(false);
  },

  saveAndClose() {
    this.verifyFulfillmentPreference();
    this.selectPickupServicePoint();
    cy.do(saveAndCloseButton.click());
    this.verifyRequestsPage();
    this.verifyNewRequest();
  },

  clickRequestsCountLink() {
    cy.do(loanAndAvailabilitySection.find(HTML('Requests')).perform(el => {
      el.parentElement.querySelector('a').click();
    }));
    this.verifyRequestsPage();
    cy.expect(MultiColumnList().has({ rowCount: 1 }));
  },

  clickRequesterBarcode(username) {
    cy.do(MultiColumnListCell({ row: 0, column: including(username) }).click());
    cy.do(Pane({ id: 'instance-details' }).find(Link(including(username))).click());
    this.verifyUserRecordPage(username);
  },

  verifyOpenRequestCounts() {
    cy.do(Accordion('Requests').clickHeader());
    cy.expect(Link({ id: 'clickable-viewopenrequests' }).assert(el => {
      const count = +el.textContent.match(/\d+/)[0];
      expect(count).to.be.greaterThan(0);
    }));
  },

  clickOpenRequestsCountLink() {
    cy.do(Link({ id: 'clickable-viewopenrequests' }).click());
    this.verifyRequestsPage();
  },
};
