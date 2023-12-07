import { including, matching } from '@interactors/html';
import {
  Button,
  CheckboxInTable,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  TextArea,
  TextField,
} from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const additionalInformation = `autoTestText_${getRandomPostfix()}`;
const overrideModal = Modal('Override & renew');

export default {
  confirmOverrideItem: (additionalInfo = additionalInformation) => {
    cy.do(overrideModal.find(CheckboxInTable({ name: 'check-all' })).click());
    cy.do(overrideModal.find(TextArea('Additional information*')).fillIn(additionalInfo));
    cy.do(overrideModal.find(Button('Override')).click());
  },

  fillDateAndTime: (dateString, timeString = '11:59 PM') => {
    cy.do([TextField('Date*').fillIn(dateString), TextField('Time*').fillIn(timeString)]);
  },

  verifyModalInfo: (loansToCheck) => {
    cy.expect([overrideModal.exists(), Button('Cancel')]);
    loansToCheck.forEach((loan) => {
      cy.expect(
        overrideModal
          .find(MultiColumnListRow({ text: matching(loan.itemBarcode), isContainer: false }))
          .find(MultiColumnListCell({ column: 'Renewal status' }))
          .has({ content: including(loan.status) }),
      );
    });
  },

  verifyModalIsClosed() {
    cy.expect(overrideModal.absent());
  },
};
