export default {
  getErrorsInImportQueryString({ filter }) {
    const status = filter === 'Yes' ? 'ERROR' : 'COMMITTED';
    return `limit=100&sortBy=completed_date%2Cdesc&statusAny=${status}`;
  },

  getDateQueryString({ from, end }) {
    return `completedAfter=${from}&completedBefore=${end}&limit=100&sortBy=completed_date%2Cdesc&statusAny=COMMITTED&statusAny=ERROR&statusAny=CANCELLED`;
  },

  getSingleJobProfileQueryString() {
    return 'limit=100&sortBy=completed_date%2Cdesc&statusAny=COMMITTED&statusAny=ERROR&statusAny=CANCELLED';
  },

  getJobProfileQueryString({ profileId }) {
    return `limit=100&profileIdAny=${profileId}&sortBy=completed_date%2Cdesc&statusAny=COMMITTED&statusAny=ERROR&statusAny=CANCELLED`;
  },

  getUserQueryString({ userId }) {
    return `limit=100&sortBy=completed_date%2Cdesc&statusAny=COMMITTED&statusAny=ERROR&&statusAny=CANCELLED&userId=${userId}`;
  },

  getInventorySingleRecordImportsQueryString({ filter }) {
    if (filter === 'Yes') {
      return (
        'limit=100&' +
        'profileIdAny=d0ebb7b0-2f0f-11eb-adc1-0242ac120002&' +
        'profileIdAny=91f9b8d6-d80e-4727-9783-73fb53e3c786&' +
        'sortBy=completed_date%2Cdesc&' +
        'statusAny=COMMITTED&statusAny=ERROR&statusAny=CANCELLED'
      );
    }
    return (
      'limit=100&' +
      'profileIdNotAny=d0ebb7b0-2f0f-11eb-adc1-0242ac120002&' +
      'profileIdNotAny=91f9b8d6-d80e-4727-9783-73fb53e3c786&' +
      'sortBy=completed_date%2Cdesc&' +
      'statusAny=COMMITTED&statusAny=ERROR&statusAny=CANCELLED'
    );
  },

  getErrorsInImportAndUserQueryString({ filter, userId }) {
    const status = filter === 'Yes' ? 'ERROR' : 'COMMITTED';
    return `limit=100&sortBy=completed_date%2Cdesc&statusAny=${status}&userId=${userId}`;
  },

  getSearchByIdQueryString({ id }) {
    return `hrId=${id}%2A&limit=100&sortBy=completed_date%2Cdesc&statusAny=COMMITTED&statusAny=ERROR&statusAny=CANCELLED`;
  },
};
