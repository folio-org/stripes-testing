const getHoldingSources = (searchParams) => {
  return cy
    .okapiRequest({
      path: 'holdings-sources',
      searchParams,
    })
    .then(({ body }) => {
      return body.holdingsRecordsSources;
    });
};

export default {
  getHoldingSources,

  getHoldingsFolioSource:() => getHoldingSources()
    .then(holdingsSources => holdingsSources.filter(specialSource => specialSource.name === 'FOLIO')[0])
};
