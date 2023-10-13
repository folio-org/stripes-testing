import { Button, Modal } from '../../../../../../interactors';

const exceptionDeleteModal = Modal({ id: 'delete-matchProfiles-exception-modal' });

export default {
  closeException: () => cy.do(exceptionDeleteModal.find(Button('Close')).click()),
  verifyExceptionMessage: () => cy.expect(
    exceptionDeleteModal.has({
      message:
          'This match profile cannot be deleted, as it is in use by one or more job profiles.',
      header: 'Cannot delete match profile',
    }),
  ),
};
