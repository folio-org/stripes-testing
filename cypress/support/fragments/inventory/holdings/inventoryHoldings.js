const getHoldingSources = (searchParams) => cy.okapiRequest({
  path: 'holdings-sources',
  searchParams,
})
  .then(({ body }) => body.holdingsRecordsSources);

export default {
  getHoldingSources,

  getHoldingsFolioSource:() => getHoldingSources()
    .then(holdingsSources => holdingsSources.filter(specialSource => specialSource.name === 'FOLIO')[0])
};
