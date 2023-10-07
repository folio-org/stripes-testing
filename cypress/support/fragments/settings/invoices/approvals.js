import uuid from 'uuid';

export default {
  generateApprovalConfig(isApprovePayEnabled = false) {
    return {
      value: JSON.stringify({ isApprovePayEnabled }),
      module: 'INVOICE',
      configName: 'approvals',
      id: uuid(),
    };
  },
  getApprovalConfigViaApi() {
    return cy
      .okapiRequest({
        path: 'configurations/entries',
        searchParams: { query: '(module==INVOICE and configName==approvals)' },
      })
      .then(({ body }) => body.configs);
  },
  createApprovalConfigViaApi(config) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'configurations/entries',
        body: config,
      })
      .then(({ body }) => body);
  },
  updateApprovalConfigViaApi(config) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `configurations/entries/${config.id}`,
      body: config,
    });
  },
  setApprovePayValue(isApprovePayEnabled) {
    this.getApprovalConfigViaApi().then((configs) => {
      if (configs[0]) {
        this.updateApprovalConfigViaApi({
          ...configs[0],
          value: JSON.stringify({ isApprovePayEnabled }),
        });
      } else {
        const config = this.generateApprovalConfig(isApprovePayEnabled);
        this.createApprovalConfigViaApi(config);
      }
    });
  },
};
