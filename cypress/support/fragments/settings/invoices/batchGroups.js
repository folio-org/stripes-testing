import uuid from 'uuid';
import getRandomPostfix from '../../../utils/stringTools';

export default {
  getDefaultBatchGroup({ name, description } = {}) {
    return {
      id: uuid(),
      name: name || `autotest_bg_name_${getRandomPostfix()}`,
      description: description || `autotest_bg_description_${getRandomPostfix()}`,
    };
  },
  getBatchGroupsViaApi(searchParams) {
    return cy
      .okapiRequest({
        path: 'batch-groups',
        searchParams,
        isDefaultSearchParamsRequired: false,
      })
      .then(({ body }) => {
        return body.batchGroups;
      });
  },
  createBatchGroupViaApi(batchGroup) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'batch-groups',
        body: batchGroup,
      })
      .then(({ body }) => body);
  },
  deleteBatchGroupViaApi(batchGroupId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `batch-groups/${batchGroupId}`,
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },
};
