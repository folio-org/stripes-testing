import uuid from 'uuid';

export default {
  getViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'configurations/entries',
        searchParams,
      })
      .then(({ body }) => {
        return body.configs;
      });
  },

  editViaApi(id) {
    cy
      .okapiRequest({
        method: 'PUT',
        path: `configurations/entries/${id}`,
        body: {
          module:'ORDERS',
          configName:'orderNumber',
          value: '{canUserEditOrderNumber:true}',
          id: uuid()
        },
        isDefaultSearchParamsRequired : false
      });
  },
};
