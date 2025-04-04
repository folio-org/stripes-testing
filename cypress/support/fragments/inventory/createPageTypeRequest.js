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
import { ITEM_STATUS_NAMES, REQUEST_TYPES } from '../../constants';

const actionsButton = Button('Actions');
const newRequestButton = Button('New request');
const selectUserModal = Modal('Select User');
const loanAndAvailabilitySection = Section({ id: 'acc06' });
const itemInfoSection = Section({ id: 'item-info' });
const requestInfoSection = Section({ id: 'new-requester-info' });

export default {
  itemStatusesToCreate() {
    return [ITEM_STATUS_NAMES.AVAILABLE];
  },

  filterRequesterLookup(patronGroupName = 'faculty') {
    cy.do([Checkbox(patronGroupName).click(), Checkbox('Active').click()]);
  },

  selectUser(username) {
    cy.do(selectUserModal.find(TextField({ name: 'query' })).fillIn(username));
    cy.do(selectUserModal.find(Button('Search')).click());
    cy.do(MultiColumnListCell({ row: 0, content: username }).click());
  },

  verifyInventoryDetailsPage(barcode) {
    cy.expect(
      Heading({
        level: 2,
        text: `Item • ${barcode} • Paged`,
      }).exists(),
    );
  },

  clickItemBarcodeLink(barcode) {
    cy.do(Link(barcode).click());
    cy.wait(500);
    this.verifyInventoryDetailsPage(barcode);
  },

  findAvailableItem(instance, itemBarcode) {
    MarkItemAsMissing.findAndOpenInstance(instance.instanceTitle);
    cy.wait(1000);
    MarkItemAsMissing.openHoldingsAccordion(instance.holdingId);
    cy.wait(1000);
    MarkItemAsMissing.openItem(itemBarcode);
    cy.wait(2000);
  },

  verifyRequestsCountOnItemRecord() {
    cy.expect(
      loanAndAvailabilitySection.find(HTML('Requests')).assert((el) => {
        const count = +el.parentElement.querySelector('a').textContent;
        expect(count).to.be.greaterThan(0);
      }),
    );
  },

  verifyUserRecordPage(username) {
    cy.expect(Heading({ level: 2, text: including(username) }).exists());
  },

  verifyNewRequest() {
    cy.expect(itemInfoSection.find(Link('1')).exists());
    cy.expect(itemInfoSection.find(HTML('Paged')).exists());
  },

  verifyRequesterDetailsPopulated(username, patronGroupName = 'faculty') {
    cy.expect(requestInfoSection.find(Link(including(username))).exists());
    cy.expect(requestInfoSection.find(HTML(patronGroupName)).exists());
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
    // eslint-disable-next-line spaced-comment
    //cy.expect(Section({ id: 'new-request-info' }).find(HTML('Page')).exists());
  },

  waitForInstanceOrItemSpinnerToDisappear() {
    cy.wait(1000);
    cy.get('#new-item-info [class^="spinner"]').should('not.exist');
    cy.wait(500);
  },

  clickNewRequest(itemBarcode) {
    cy.wait(500);
    cy.do(actionsButton.click());
    cy.wait(500);
    cy.do(newRequestButton.click());
    cy.wait(500);
    cy.do([
      TextField({ name: 'item.barcode' }).fillIn(itemBarcode),
      Button({ id: 'clickable-select-item' }).click(),
    ]);
    this.waitForInstanceOrItemSpinnerToDisappear();
    this.verifyItemDetailsPrePopulated(itemBarcode);
  },

  selectActiveFacultyUser(username, patronGroupName = 'faculty') {
    cy.do(Button('Requester look-up').click());
    this.checkModalExists(true);
    this.filterRequesterLookup(patronGroupName);
    cy.wait(1000);
    this.selectUser(username);
    this.checkModalExists(false);
    this.verifyRequesterDetailsPopulated(username, patronGroupName);
  },

  saveAndClose(servicePointName = 'Circ Desk 1') {
    newRequest.chooseRequestType(REQUEST_TYPES.PAGE);
    cy.wait(500);
    Requests.verifyFulfillmentPreference();
    newRequest.choosePickupServicePoint(servicePointName);
    cy.wait(1000);
    newRequest.saveRequestAndClose();
    cy.wait(500);
    Requests.verifyRequestsPage();
    this.verifyNewRequest();
  },

  clickRequestsCountLink() {
    cy.do(
      loanAndAvailabilitySection.find(HTML('Requests')).perform((el) => {
        el.parentElement.querySelector('a').click();
      }),
    );
    Requests.verifyRequestsPage();
    cy.expect(MultiColumnList().has({ rowCount: 1 }));
  },

  clickRequesterBarcode(instance, username) {
    cy.wait(1000);
    cy.do(
      MultiColumnListCell({ row: 0, content: including(instance) })
        .find(Link(including(instance)))
        .click(),
    );
    cy.do(
      Section({ id: 'requester-info' })
        .find(Link(including(username)))
        .click(),
    );
    this.verifyUserRecordPage(username);
  },

  verifyOpenRequestCounts() {
    cy.do(Accordion('Requests').clickHeader());
    cy.expect(
      Link({ id: 'clickable-viewopenrequests' }).assert((el) => {
        const count = +el.textContent.match(/\d+/)[0];
        expect(count).to.be.greaterThan(0);
      }),
    );
  },

  clickOpenRequestsCountLink() {
    cy.do(Link({ id: 'clickable-viewopenrequests' }).click());
    Requests.verifyRequestsPage();
  },
};
