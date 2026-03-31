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

Cypress.Commands.add('getVersionHistorySettings', () => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: 'audit/config/groups/audit.inventory/settings',
    })
    .then((response) => {
      return response.body.settings;
    });
});

Cypress.Commands.add('setVersionHistoryRecordsPerPage', (recordsCountPerPage) => {
  cy.enableVersionHistoryFeature(true);

  return cy.getVersionHistorySettings().then((settings) => {
    const currentSetting = settings.find((setting) => setting.key === 'records.page.size');
    currentSetting.value = recordsCountPerPage;

    return cy
      .okapiRequest({
        method: 'PUT',
        path: 'audit/config/groups/audit.inventory/settings/records.page.size',
        body: currentSetting,
      })
      .then((response) => {
        expect(response.status).to.equal(204);
      });
  });
});
