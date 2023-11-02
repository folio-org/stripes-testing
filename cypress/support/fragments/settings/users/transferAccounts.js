import { getTestEntityValue } from '../../../utils/stringTools';

export default {
  getDefaultNewTransferAccount: (id, name, desc) => ({
    accountName: getTestEntityValue(name),
    desc: getTestEntityValue(desc),
    // required field
    id,
  }),
  createViaApi: (transferAccount) => cy.okapiRequest({
    method: 'POST',
    path: 'transfers',
    body: transferAccount,
    isDefaultSearchParamsRequired: false,
  }),
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `transfers/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
