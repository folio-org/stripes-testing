import { Button, Modal, TextField, Select } from '../../../../interactors';

const rootModal = Modal({ id: 'transfer-modal' });
const amountTextfield = rootModal.find(TextField({ id: 'amount' }));
const ownerSelect = rootModal.find(Select({ id: 'ownerId' }));
const transferAccountSelect = rootModal.find(Select({ name: 'method' }));
const transferButton = rootModal.find(Button({ id: 'submit-button' }));
const confirmModal = Modal('Confirm fee/fine transfer');
const confirmButton = confirmModal.find(Button('Confirm'));

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },
  setAmount: (amount) => cy.do(amountTextfield.fillIn(amount.toFixed(2))),
  setOwner: (owner) => cy.do(ownerSelect.choose(owner)),
  setTransferAccount: (account) => cy.do(transferAccountSelect.choose(account)),
  transferAndConfirm: () => {
    cy.do([
      transferButton.click(),
      confirmButton.click(),
    ]);
  },
};
