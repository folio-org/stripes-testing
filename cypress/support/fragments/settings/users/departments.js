import { REQUEST_METHOD } from '../../../constants';
import { PaneHeader } from '../../../../../interactors';

export default {
  waitLoading: () => cy.expect(PaneHeader('Departments').exists()),

  createViaApi: (body) => {
    return cy
      .okapiRequest({
        method: REQUEST_METHOD.POST,
        path: 'departments',
        isDefaultSearchParamsRequired: false,
        body,
      })
      .then((response) => response.body.id);
  },

  deleteViaApi: (id) => {
    return cy.okapiRequest({
      method: REQUEST_METHOD.DELETE,
      path: `departments/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
