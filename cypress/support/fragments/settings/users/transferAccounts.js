import uuid from 'uuid';
import { getTestEntityValue } from '../../../utils/stringTools';

export const getNewTransferAccount = (name, desc) => ({
  accountName: name ? getTestEntityValue(name) : getTestEntityValue(),
  desc: desc ? getTestEntityValue(desc) : getTestEntityValue(),
  id: uuid(),
});

export default {
  createViaApi: (transferAccount) => cy.okapiRequest({ method: 'POST',
    path: 'transfers',
    body: transferAccount,
    isDefaultSearchParamsRequired: false }),
  deleteViaApi:  (id) => {
    cy.okapiRequest({
      method: 'DELETE',
      path: `transfers/${id}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
