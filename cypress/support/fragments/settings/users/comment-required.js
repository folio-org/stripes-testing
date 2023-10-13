import { Button, Form, Select, PaneHeader } from '../../../../../interactors';
import { REQUEST_METHOD } from '../../../constants';

const commentRequiredForm = Form({ id: 'form-require-comment' });
const requireCommentForPaidFee = commentRequiredForm.find(Select({ name: 'paid' }));
const requireCommentForWaivedFee = commentRequiredForm.find(Select({ name: 'waived' }));
const requireCommentForRefundedFee = commentRequiredForm.find(Select({ name: 'refunded' }));
const requireCommentForTransferredFee = commentRequiredForm.find(
  Select({ name: 'transferredManually' }),
);
const saveButton = Button({ id: 'clickable-save-comment' });

export default {
  getDefaultCommentRequiredFlags() {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.GET,
        path: 'comments',
      })
      .then((response) => response.body.comments[0]);
  },
  turnOffCommentRequiredFlags() {
    this.getDefaultCommentRequiredFlags().then((response) => {
      cy.okapiRequest({
        method: REQUEST_METHOD.PUT,
        path: `comments/${response.id}`,
        body: {
          id: response.id,
          paid: 'false',
          refunded: 'false',
          transferredManually: 'false',
          waived: 'false',
        },
        isDefaultSearchParamsRequired: false,
      });
    });
  },
  waitLoading: () => cy.expect(commentRequiredForm.find(PaneHeader('Fee/fine: Comment required')).exists()),
  clickSaveButton() {
    cy.do(saveButton.click());
    cy.wait(1500);
  },
  verifySaveButtonDisabled: () => cy.do(saveButton.has({ disabled: true })),
  requireCommentForPaidFeeChooseOption: (option) => cy.do(requireCommentForPaidFee.choose(option)),
  requireCommentForWaivedFeeChooseOption: (option) => cy.do(requireCommentForWaivedFee.choose(option)),
  requireCommentForRefundedFeeChooseOption: (option) => cy.do(requireCommentForRefundedFee.choose(option)),
  requireCommentForTransferredFeeChooseOption: (option) => cy.do(requireCommentForTransferredFee.choose(option)),
};
