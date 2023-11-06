import { Modal } from '../../../../interactors';

const rootModal = Modal({ id: 'error-modal' });

export default {
  waitLoading: () => {
    cy.expect(rootModal.exists());
  },

  cancelFeeFineViaApi: (apiBody, feeFineId) => cy.okapiRequest({
    method: 'POST',
    path: `accounts/${feeFineId}/cancel`,
    body: apiBody,
    isDefaultSearchParamsRequired: false,
  }),
};
