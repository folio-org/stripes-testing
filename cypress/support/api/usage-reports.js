Cypress.Commands.add('getUsageReportTitles', () => {
  return cy.okapiRequest({
    path: 'eusage-reports/report-titles',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getUsageReportPackages', () => {
  return cy.okapiRequest({
    path: 'eusage-reports/report-packages',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getUsageReportTitleData', () => {
  return cy.okapiRequest({
    path: 'eusage-reports/title-data',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getUsageReportData', () => {
  return cy.okapiRequest({
    path: 'eusage-reports/report-data',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getUsageReportUseOverTime', () => {
  return cy.okapiRequest({
    path: 'eusage-reports/stored-reports/use-over-time',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getUsageReportReqsByDateOfUse', () => {
  return cy.okapiRequest({
    path: 'eusage-reports/stored-reports/reqs-by-date-of-use',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getUsageReportReqsByPubYear', () => {
  return cy.okapiRequest({
    path: 'eusage-reports/stored-reports/reqs-by-pub-year',
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getUsageReportCostPerUse', () => {
  return cy.okapiRequest({
    path: 'eusage-reports/stored-reports/cost-per-use',
    isDefaultSearchParamsRequired: false,
  });
});
