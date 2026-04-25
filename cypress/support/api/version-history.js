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

Cypress.Commands.add('enableMarcAuthorityVersionHistoryFeature', (enable) => {
  return cy
    .okapiRequest({
      method: 'PUT',
      path: 'audit/config/groups/audit.authority/settings/enabled',
      body: {
        key: 'enabled',
        value: enable,
        type: 'BOOLEAN',
        description: 'Defines if the authority audit is enabled',
        groupId: 'audit.authority',
      },
    })
    .then((response) => {
      expect(response.status).to.equal(204);
    });
});

Cypress.Commands.add('getMarcAuthorityVersionHistorySettings', () => {
  return cy
    .okapiRequest({
      method: 'GET',
      path: 'audit/config/groups/audit.authority/settings',
    })
    .then((response) => {
      return response.body.settings;
    });
});

Cypress.Commands.add('setMarcAuthorityVersionHistoryRecordsPerPage', (recordsCountPerPage) => {
  cy.enableMarcAuthorityVersionHistoryFeature(true);

  return cy.getMarcAuthorityVersionHistorySettings().then((settings) => {
    const currentSetting = settings.find((setting) => setting.key === 'records.page.size');
    currentSetting.value = recordsCountPerPage;

    return cy
      .okapiRequest({
        method: 'PUT',
        path: 'audit/config/groups/audit.authority/settings/records.page.size',
        body: currentSetting,
      })
      .then((response) => {
        expect(response.status).to.equal(204);
      });
  });
});
