export default {
  getInstanceNoteTypesViaApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'instance-note-types',
        searchParams,
      })
      .then(({ body }) => body);
  },
};
