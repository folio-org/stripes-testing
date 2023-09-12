import { Button, Modal, TextArea, CheckboxInTable } from '../../../../../interactors';
import getRandomPostfix from '../../../utils/stringTools';

const additionalInformation = `autoTestText_${getRandomPostfix()}`;
const overrideModal = Modal('Override & renew');

export default {
  confirmOverrideItem: () => {
    cy.do(overrideModal.find(CheckboxInTable({ name: 'check-all' })).click());
    cy.do(overrideModal.find(TextArea('Additional information*')).fillIn(additionalInformation));
    cy.do(overrideModal.find(Button('Override')).click());
  },
};
