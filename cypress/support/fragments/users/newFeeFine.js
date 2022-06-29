import { Modal } from '../../../../interactors';

const rootModal = Modal({ id: 'new-modal' });
export default {
  waitLoading:() => {
    cy.expect(rootModal.exists());
  }
};

