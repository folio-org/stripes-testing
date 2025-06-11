Cypress.Commands.add('enableVersionHistoryFeature', (enable) => {
  return cy
    .okapiRequest({
      method: 'PUT',
      path: 'audit/config/groups/audit.inventory/settings/enabled',
      body: {
        key: 'enabled',
        value: enable,
        type: 'BOOLEAN',
        description: 'Defines if the inventory audit is enabled',
        groupId: 'audit.inventory',
      },
    })
    .then((response) => {
      expect(response.status).to.equal(204);
    });
});
