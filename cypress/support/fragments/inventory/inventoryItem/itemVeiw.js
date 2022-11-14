import {
  Accordion,
  KeyValue,
  Button,
  HTML,
  including,
  TextField,
  MultiColumnList
} from '../../../../../interactors';
import dateTools from '../../../utils/dateTools';
import ConfirmItemMissingModal from './confirmItemMissingModal';

const itemStatuses = {
  onOrder: 'On order',
  inProcess: 'In process',
  available: 'Available',
  missing: 'Missing',
  inTransit: 'In transit',
  paged: 'Paged',
  awaitingPickup: 'Awaiting pickup',
  checkedOut: 'Checked out',
  declaredLost: 'Declared lost',
  awaitingDelivery: 'Awaiting delivery'
};

const loanAccordion = Accordion('Loan and availability');

const waitLoading = () => {
  cy.expect(Button('Actions').exists());
};

const closeDetailView = () => {
  cy.do(Button({ icon: 'times' }).click());
};

const verifyItemStatus = (itemStatus) => {
  cy.expect(loanAccordion.find(HTML(including(itemStatus))).exists());
};

export default {
  itemStatuses,
  waitLoading,
  closeDetailView,
  verifyItemStatus,

  verifyUpdatedItemDate:() => {
    cy.do(loanAccordion.find(KeyValue('Item status')).perform(element => {
      const rawDate = element.innerText;
      const parsedDate = Date.parse(rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0]);
      // For local run it needs to add 18000000
      // The time on the server and the time on the yuai differ by 3 hours. It was experimentally found that it is necessary to add 18000000 sec
      dateTools.verifyDate(parsedDate, 18000000);
    }));
  },

  clickMarkAsMissing:() => {
    cy.do(Button('Actions').click());
    cy.do(Button('Mark as missing').click());
    ConfirmItemMissingModal.confirmModal();
  },

  addPieceToItem:(numberOfPieces) => {
    cy.do(TextField({ name:'numberOfPieces' }).fillIn(numberOfPieces));
    cy.do(Button('Save and close').click());
  },

  checkEffectiveLocation:(location) => {
    cy.expect(Accordion('Location').find(KeyValue('Effective location for item')).has({ value: location }));
  },

  checkItemAdministrativeNote:(note) => {
    cy.expect(MultiColumnList({ id: 'administrative-note-list' }).find(HTML(including(note))).exists());
  },

  checkMaterialType:(type) => {
    cy.expect(Accordion('Item data').find(HTML(including(type))).exists());
  },

  checkItemNote:(note) => {
    cy.expect(Accordion('Item notes').find(KeyValue('Note')).has({ value: note }));
  }
};
