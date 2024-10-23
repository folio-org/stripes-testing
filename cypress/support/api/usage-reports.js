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

Cypress.Commands.add('getUsageReportUseOverTime', (agreementId, startDate, endDate) => {
  const UpdatedUrl = encodeURI(
    `eusage-reports/stored-reports/use-over-time?agreementId=${agreementId}&startDate=${startDate}&endDate=${endDate}`,
  );
  return cy.okapiRequest({
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add('getUsageReportReqsByDateOfUse', (agreementId, startDate, endDate) => {
  const UpdatedUrl = encodeURI(
    `eusage-reports/stored-reports/reqs-by-date-of-use?agreementId=${agreementId}&startDate=${startDate}&endDate=${endDate}`,
  );
  return cy.okapiRequest({
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});

Cypress.Commands.add(
  'getUsageReportReqsByPubYear',
  (agreementId, startDate, endDate, periodOfUse) => {
    const UpdatedUrl = encodeURI(
      `eusage-reports/stored-reports/reqs-by-pub-year?agreementId=${agreementId}&startDate=${startDate}&endDate=${endDate}&periodOfUse=${periodOfUse}`,
    );
    return cy.okapiRequest({
      path: UpdatedUrl,
      isDefaultSearchParamsRequired: false,
    });
  },
);

Cypress.Commands.add('getUsageReportCostPerUse', (agreementId, startDate, endDate) => {
  const UpdatedUrl = encodeURI(
    `eusage-reports/stored-reports/cost-per-use?agreementId=${agreementId}&startDate=${startDate}&endDate=${endDate}`,
  );
  return cy.okapiRequest({
    path: UpdatedUrl,
    isDefaultSearchParamsRequired: false,
  });
});
