import uuid from 'uuid';

export default {
  generateApprovalConfig(isApprovePayEnabled = false) {
    return {
      id: uuid(),
      key: 'approvals',
      value: JSON.stringify({ isApprovePayEnabled }),
    };
  },
  getApprovalConfigViaApi() {
    return cy
      .okapiRequest({
        path: 'invoice-storage/settings',
        searchParams: { query: 'key=="approvals"', limit: '1' },
      })
      .then(({ body }) => {
        const items = body?.settings ?? body;
        return Array.isArray(items) ? items : [];
      });
  },
  setApprovePayValue(isApprovePayEnabled) {
    const nextValue = JSON.stringify({ isApprovePayEnabled });

    return this.getApprovalConfigViaApi().then((configs) => {
      const current = configs[0];

      if (current) {
        return cy.okapiRequest({
          method: 'PUT',
          path: `invoice-storage/settings/${current.id}`,
          body: {
            ...current,
            value: nextValue,
          },
        });
      }

      const setting = this.generateApprovalConfig(isApprovePayEnabled);
      return cy.okapiRequest({
        method: 'POST',
        path: 'invoice-storage/settings',
        body: setting,
      });
    });
  },
};
