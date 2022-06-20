import uuid from 'uuid';

export default {
  viaApi() {
    cy
      .okapiRequest({
        method: 'POST',
        path: 'configurations/entries',
        body: {
          module:'ORDERS',
          configName:'orderNumber',
          value: { canUserEditOrderNumber: true },
          id: uuid()
        },
        isDefaultSearchParamsRequired : false
      });
  },
};
