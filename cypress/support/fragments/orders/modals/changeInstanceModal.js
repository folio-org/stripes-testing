import { Button, Modal, Select, matching } from '../../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../../constants';
import InteractorsTools from '../../../utils/interactorsTools';
import OrderStates from '../orderStates';

const changeInstanceModal = Modal({ id: 'changing-instance-confirmation' });
const holdingOperationSelect = changeInstanceModal.find(Select({ name: 'holdingsOperation' }));
const cancelButton = changeInstanceModal.find(Button('Cancel'));
const submitButton = changeInstanceModal.find(Button('Submit'));

const content =
  'You have changed the title information of this purchase order line from (?:\\S+) to (?:\\S+). All related item records will be moved to the new instance. How would you like to address the related Holdings?';

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(changeInstanceModal.exists());
  },
  verifyModalView() {
    cy.expect([
      changeInstanceModal.has({ header: 'Change title' }),
      changeInstanceModal.has({ message: matching(content) }),
      holdingOperationSelect.exists(),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: true, visible: true }),
    ]);
  },
  selectHoldingOperation({ operation, shouldConfirm = true }) {
    cy.do(holdingOperationSelect.choose(operation));

    if (shouldConfirm) {
      this.clickSubmitButton();
    }
  },
  clickCancelButton() {
    cy.expect(cancelButton.has({ disabled: false }));
    cy.do(cancelButton.click());

    cy.expect(changeInstanceModal.absent());
  },
  clickSubmitButton({ updated = true } = {}) {
    cy.expect(submitButton.has({ disabled: false }));
    cy.do(submitButton.click());

    cy.expect(changeInstanceModal.absent());

    if (updated) {
      InteractorsTools.checkCalloutMessage(OrderStates.orderInstanceConnectionUpdatedSuccessfully);
    }
  },
};
