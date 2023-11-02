import uuid from 'uuid';
import moment from 'moment';
import { Button, Modal, TextArea } from '../../../../interactors';
import FeeFines from './feeFines';

const rootModal = Modal('Staff information');
const commentTextArea = rootModal.find(TextArea({ name: 'comment' }));
export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
    cy.expect(commentTextArea.exists());
  },
  fillIn: (info) => cy.do(commentTextArea.fillIn(info)),
  submit: () => cy.do(rootModal.find(Button('Save')).click()),
  checkStaffInfoModalClosed: () => cy.expect(rootModal.absent()),

  addNewStaffInfoViaApi: (userId, staffText, source) => {
    FeeFines.getUserFeesFines(userId).then((res) => {
      cy.okapiRequest({
        method: 'POST',
        path: 'feefineactions',
        body: {
          ...res.feefineactions[0],
          comments: `STAFF : ${staffText}`,
          dateAction: moment.utc().format(),
          id: uuid(),
          source,
          transactionInformation: '',
          typeAction: 'Staff info only',
        },
      });
    });
  },
};
