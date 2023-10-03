const getHoldingSources = (searchParams) => cy
  .okapiRequest({
    path: 'holdings-sources',
    searchParams,
  })
  .then(({ body }) => body.holdingsRecordsSources);

export default {
  getHoldingSources,

  getHoldingsFolioSource: () => getHoldingSources().then(
    (holdingsSources) => holdingsSources.filter((specialSource) => specialSource.name === 'FOLIO')[0],
  ),

  getHoldingsViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'holdings-storage/holdings',
        searchParams,
      })
      .then(({ body }) => {
        return body.holdingsRecords;
      });
  },
  deleteHoldingsByInstanceId(instanceId) {
    return this.getHoldingsViaApi({ query: `"instanceId"="${instanceId}"` }).then((holdings) => {
      holdings.forEach(({ id }) => {
        this.deleteHoldingRecordViaApi(id);
      });
    });
  },
  deleteHoldingRecordViaApi: (holdingsRecordId) => {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `holdings-storage/holdings/${holdingsRecordId}`,
      isDefaultSearchParamsRequired: false,
    });
  },
};
