export default {
  updateViaApi: (value) => {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'configurations/entries?query=(module==FAST_ADD%20and%20configName==fastAddSettings)',
        isDefaultSearchParamsRequired: false
      })
      .then((fastAddResp) => {
        const id = fastAddResp.body.configs[0].id;

        cy.okapiRequest({
          method: 'PUT',
          path: `configurations/entries/${id}`,
          body: {
            module:'FAST_ADD',
            configName:'fastAddSettings',
            enabled: true,
            value:
              `{"instanceStatusCode":"${value}","defaultDiscoverySuppress":"true"}`
          },
          isDefaultSearchParamsRequired: false,
        });
      });
  }
};
