export default {
  deleteFieldMappingProfileViaApi: (id) => cy.okapiRequest({
    method: 'DELETE',
    path: `data-export/mapping-profiles/${id}`,
    isDefaultSearchParamsRequired: false,
  }),
};
