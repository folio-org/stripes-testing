export default {
  getHoldingSources:(searchParams) => {
    return cy
      .okapiRequest({
        path: 'holdings-sources',
        searchParams,
      })
      .then(({ body }) => {
        return body.holdingsRecordsSources;
      });
  }
};
