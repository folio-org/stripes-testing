import {
  Button,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  matching,
  including,
} from '../../../../../interactors';
import InteractorsTools from '../../../utils/interactorsTools';
import InvoiceStates from '../invoiceStates';

const approveInvoiceConfirmationModal = Modal({
  id: matching(/approve(?:-pay)*-invoice-confirmation/),
});
const cancelButton = approveInvoiceConfirmationModal.find(Button('Cancel'));
const submitButton = approveInvoiceConfirmationModal.find(Button('Submit'));
const duplicateInvoiceList = MultiColumnList({ id: 'duplicate-invoice-list' });

export default {
  verifyModalView({ isApprovePayEnabled = false } = {}) {
    cy.expect([
      approveInvoiceConfirmationModal.has({
        header: `Approve ${isApprovePayEnabled ? '& pay ' : ''}invoice`,
      }),
      approveInvoiceConfirmationModal.has({
        message: `Are you sure you want to approve ${
          isApprovePayEnabled ? 'and pay ' : ''
        }invoice?`,
      }),
      cancelButton.has({ disabled: false, visible: true }),
      submitButton.has({ disabled: false, visible: true }),
    ]);
  },
  verifyModalViewForDuplicateInvoice({ isApprovePayEnabled = false } = {}, vendorInvoiceNo) {
    cy.expect([
      approveInvoiceConfirmationModal.has({
        header: `Approve ${isApprovePayEnabled ? '& pay ' : ''}invoice`,
      }),
      approveInvoiceConfirmationModal.has({
        message: including(
          `Are you sure you want to approve ${isApprovePayEnabled ? 'and pay ' : ''}invoice?`,
        ),
      }),
      approveInvoiceConfirmationModal.has({
        message: including('Possible duplicate invoice'),
      }),
      approveInvoiceConfirmationModal.find(duplicateInvoiceList).exists(),
      approveInvoiceConfirmationModal
        .find(duplicateInvoiceList)
        .find(MultiColumnListCell(vendorInvoiceNo))
        .exists(),
    ]);
  },
  closeModal() {
    cy.do(cancelButton.click());
    cy.expect(approveInvoiceConfirmationModal.absent());
  },
  clickSubmitButton({ isApprovePayEnabled = false } = {}) {
    cy.do(submitButton.click());
    cy.expect(approveInvoiceConfirmationModal.absent());
    InteractorsTools.checkCalloutMessage(
      isApprovePayEnabled
        ? InvoiceStates.invoiceApprovedAndPaidMessage
        : InvoiceStates.invoiceApprovedMessage,
    );
  },
  clickOnlySubmitButton() {
    cy.do(submitButton.click());
    cy.expect(approveInvoiceConfirmationModal.absent());
  },
};
