import { Button, Modal, TextArea } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const additionalInformation = `autoTestText_${getRandomPostfix()}`;
const confirmModal = Modal('Confirm item status: Declared lost');

export default {
  confirmItemStatus:() => {
    cy.do(confirmModal.find(TextArea('Additional information*')).fillIn(additionalInformation));
    cy.do(confirmModal.find(Button('Confirm')).click());
  },
};
