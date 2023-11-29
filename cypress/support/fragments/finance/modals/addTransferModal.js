import {
  Button,
  ConfirmationModal,
  Modal,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  Selection,
  SelectionList,
  TextArea,
  TextField,
  including,
  matching,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import States from '../states';

const addTransferModal = Modal({ id: 'add-transfer-modal' });
const fromSelection = addTransferModal.find(Selection('From'));
const toSelection = addTransferModal.find(Selection('To'));
const amountTextField = addTransferModal.find(TextField({ name: 'amount' }));
const tagsMultiSelect = addTransferModal.find(MultiSelect({ label: 'Tags' }));
const descriptionTextArea = addTransferModal.find(TextArea({ name: 'description' }));

const cancelButton = addTransferModal.find(Button('Cancel'));
const confirmButton = addTransferModal.find(Button('Confirm'));

export default {
  verifyModalView() {
    cy.expect([
      addTransferModal.has({ header: 'Transfer' }),
      fromSelection.exists(),
      toSelection.exists(),
      amountTextField.exists(),
      tagsMultiSelect.exists(),
      descriptionTextArea.exists(),
      cancelButton.has({ disabled: false, visible: true }),
      confirmButton.has({ disabled: false, visible: true }),
    ]);
  },
  fillTransferDetails({ fromFund, toFund, amount, tag, description } = {}) {
    if (fromFund) {
      this.selectDropDownValue('From', fromFund);
    }
    if (toFund) {
      this.selectDropDownValue('To', toFund);
    }
    if (amount) {
      cy.do(amountTextField.fillIn(amount));
    }
    if (tag) {
      cy.do([tagsMultiSelect.toggle(), MultiSelectMenu().find(MultiSelectOption(tag)).click()]);
    }
    if (description) {
      cy.do(descriptionTextArea.fillIn(description));
    }
  },
  selectDropDownValue(label, option) {
    cy.do([
      Selection(including(label)).open(),
      SelectionList().filter(option),
      SelectionList().select(including(option)),
    ]);
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(addTransferModal.absent());
  },
  clickConfirmButton({ transferCreated = true, confirmNegative } = {}) {
    cy.do(confirmButton.click());

    if (confirmNegative) {
      const confirmationModal = ConfirmationModal({
        header: 'Negative available amount',
        message: matching(new RegExp(States.transferConfirmation)),
      });
      cy.expect(confirmationModal.exists());

      if (confirmNegative.confirm) {
        cy.do(confirmationModal.confirm());
      } else {
        cy.do(confirmationModal.cancel());
      }
    }

    if (transferCreated) {
      InteractorsTools.checkCalloutMessage(
        matching(new RegExp(States.transferCreatedSuccessfully)),
      );
    }
  },
};
