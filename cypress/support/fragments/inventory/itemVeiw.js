import { Accordion, KeyValue } from '../../../../interactors';
import dateTools from '../../utils/dateTools';

const itemStatuses = {
  onOrder: 'On order',
  inProcess: 'In process',
  available: 'Available',

};

export default {
  itemStatuses,

  verifyUpdatedItemDate:() => {
    cy.do(Accordion('Loan and availability').find(KeyValue('Item status')).perform(element => {
      const rawDate = element.innerText;
      const parsedDate = Date.parse(rawDate.match(/\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{1,2}\s\w{2}/gm)[0]);
      // For local run it needs to add 18000000
      dateTools.verifyDate(parsedDate, 18000000);
    }));
  },

  verifyItemStatus(status) {
    cy.expect(Accordion('Loan and availability').find(KeyValue({ value: status })).exists());
  },


};
