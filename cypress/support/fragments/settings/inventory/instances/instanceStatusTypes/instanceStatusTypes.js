export default {
  deleteViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `instance-statuses/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
