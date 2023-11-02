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
    this.verifyInventoryDetailsPage(barcode);
  },

  findAvailableItem(instance, itemBarcode) {
    MarkItemAsMissing.findAndOpenInstance(instance.instanceTitle);
    MarkItemAsMissing.openHoldingsAccordion(instance.holdingId);
    MarkItemAsMissing.openItem(itemBarcode);
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

  clickNewRequest(itemBarcode) {
    cy.do([actionsButton.click(), newRequestButton.click()]);
    this.verifyItemDetailsPrePopulated(itemBarcode);
  },

  selectActiveFacultyUser(username, patronGroupName = 'faculty') {
    cy.do(Button('Requester look-up').click());
    this.checkModalExists(true);
    this.filterRequesterLookup(patronGroupName);
    this.selectUser(username);
    this.checkModalExists(false);
    this.verifyRequesterDetailsPopulated(username, patronGroupName);
  },

  saveAndClose(servicePointName = 'Circ Desk 1') {
    newRequest.chooseRequestType(REQUEST_TYPES.PAGE);
    Requests.verifyFulfillmentPreference();
    newRequest.choosepickupServicePoint(servicePointName);
    newRequest.saveRequestAndClose();
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

  clickRequesterBarcode(username) {
    cy.do(MultiColumnListCell({ row: 0, content: including(username) }).click());
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
