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
  Accordion,
  MultiColumnList,
} from '../../../../interactors';
import MarkItemAsMissing from './markItemAsMissing';
import Requests from '../requests/requests';
import newRequest from '../requests/newRequest';

const actionsButton = Button('Actions');
const newRequestButton = Button('New Request');
const selectUserModal = Modal('Select User');
const loanAndAvailabilitySection = Section({ id: 'acc06' });

export default {
  itemStatusesToCreate() { return ['Available']; },

  filterRequesterLookup() {
    cy.do([
      Checkbox('faculty').click(),
      Checkbox('Active').click()
    ]);
  },

  selectUser(username) {
    cy.do(Modal('Select User').find(TextField({ name: 'query' })).fillIn(username));
    cy.do(Modal('Select User').find(Button('Search')).click());
    cy.do(MultiColumnListCell({ row: 0, content: username }).click());
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

  findAvailableItem(instance, itemBarcode) {
    MarkItemAsMissing.findAndOpenInstance(instance.instanceTitle);
    MarkItemAsMissing.openHoldingsAccordion(instance.holdingId);
    MarkItemAsMissing.openItem(itemBarcode);
  },

  verifyRequestsCountOnItemRecord() {
    cy.expect(loanAndAvailabilitySection.find(HTML('Requests')).assert(el => {
      const count = +el.parentElement.querySelector('a').textContent;
      expect(count).to.be.greaterThan(0);
    }));
  },

  verifyUserRecordPage(username) {
    cy.expect(Heading({ level: 2, text: including(username) }).exists());
  },

  verifyNewRequest() {
    cy.expect(Section({ id: 'item-info' }).find(Link('1')).exists());
    cy.expect(Section({ id: 'item-info' }).find(HTML('Paged')).exists());
  },

  verifyRequesterDetailsPopulated(username) {
    cy.expect(Section({ id: 'new-requester-info' }).find(Link(including(username))).exists());
    cy.expect(Section({ id: 'new-requester-info' }).find(HTML('faculty')).exists());
  },

  checkModalExists(isExist) {
    if (isExist) {
      cy.expect(selectUserModal.exists());
    } else {
      cy.expect(selectUserModal.absent());
    }
  },

  verifyItemDetailsPrePopulated(itemBarcode) {
    cy.expect(Link(itemBarcode).exists());
    cy.expect(Section({ id: 'new-request-info' }).find(HTML('Page')).exists());
  },

  clickNewRequest(itemBarcode) {
    cy.do([actionsButton.click(), newRequestButton.click()]);
    this.verifyItemDetailsPrePopulated(itemBarcode);
  },

  selectActiveFacultyUser(username) {
    cy.do(Button('Requester look-up').click());
    this.checkModalExists(true);
    this.filterRequesterLookup();
    this.selectUser(username);
    this.checkModalExists(false);
    this.verifyRequesterDetailsPopulated(username);
  },

  saveAndClose() {
    Requests.verifyFulfillmentPreference();
    newRequest.choosepickupServicePoint('Circ Desk 1');
    newRequest.saveRequestAndClose();
    Requests.verifyRequestsPage();
    this.verifyNewRequest();
  },

  clickRequestsCountLink() {
    cy.do(loanAndAvailabilitySection.find(HTML('Requests')).perform(el => {
      el.parentElement.querySelector('a').click();
    }));
    Requests.verifyRequestsPage();
    cy.expect(MultiColumnList().has({ rowCount: 1 }));
  },

  clickRequesterBarcode(username) {
    cy.do(MultiColumnListCell({ row: 0, content: including(username) }).click());
    cy.do(Section({ id: 'requester-info' }).find(Link(including(username))).click());
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
    Requests.verifyRequestsPage();
  },
};
