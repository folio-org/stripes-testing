export default {
  getIdByTitle: (title) => {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'search/linked-data/works',
        isDefaultSearchParamsRequired: false,
        searchParams: {
          limit: 1,
          query: `"title"=="${title}"`,
        },
      })
      .then((response) => response.body.content[0].id);
  },

  deleteById: (id) => {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `resource/${id}`,
    });
  },
};