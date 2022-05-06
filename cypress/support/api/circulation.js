import uuid from 'uuid';
import moment from 'moment';

import getRandomPostfix from '../utils/stringTools';
import {
  CY_ENV,
  REQUEST_METHOD,
} from '../constants';

Cypress.Commands.add('createItemCheckout', (checkout) => {
  const checkoutId = uuid();

  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'circulation/check-out-by-barcode',
    body: {
      id: checkoutId,
      loanDate: moment.utc(),
      ...checkout,
    },
  });
});

Cypress.Commands.add('createItemCheckinApi', (data) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'circulation/check-in-by-barcode',
    body: {
      id: uuid(),
      ...data,
    },
  })
    .then(checkedOutItem => {
      Cypress.env(CY_ENV.CHECKOUT_ITEM, checkedOutItem.body);

      return checkedOutItem.body;
    });
});

Cypress.Commands.add('createFixedDueDateSchedule', (body) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'fixed-due-date-schedule-storage/fixed-due-date-schedules',
    body: {
      description: 'Automation schedule description',
      id: uuid(),
      name: `Automation schedule ${getRandomPostfix()}`,
      ...body,
    },
  })
    .then(createdSchedule => {
      Cypress.env(CY_ENV.FIXED_DUE_DATE_SCHEDULE, createdSchedule.body);

      return createdSchedule.body;
    });
});

Cypress.Commands.add('deleteFixedDueDateSchedule', (id) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `fixed-due-date-schedule-storage/fixed-due-date-schedules/${id}`,
  });
});

Cypress.Commands.add('getCirculationRules', () => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'circulation/rules',
  })
    .then(rules => {
      Cypress.env(CY_ENV.CIRCULATION_RULES, rules.body);

      return rules.body;
    });
});

Cypress.Commands.add('updateCirculationRules', (body) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.PUT,
    path: 'circulation/rules',
    body,
  });
});

Cypress.Commands.add('createLoanPolicy', (policy) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.POST,
    path: 'loan-policy-storage/loan-policies',
    body: {
      id: uuid(),
      name: `Automation loan policy ${getRandomPostfix()}`,
      ...policy,
    },
  })
    .then(createdPolicy => {
      Cypress.env(CY_ENV.LOAN_POLICY, createdPolicy.body);

      return createdPolicy.body;
    });
});

Cypress.Commands.add('deleteLoanPolicy', (id) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `loan-policy-storage/loan-policies/${id}`,
  });
});

Cypress.Commands.add('getRequestPolicy', (searchParams) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'request-policy-storage/request-policies',
    searchParams,
  })
    .then(policy => {
      Cypress.env(CY_ENV.REQUEST_POLICY, policy.body.requestPolicies);

      return policy.body.requestPolicies;
    });
});

Cypress.Commands.add('getNoticePolicy', (searchParams) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'patron-notice-policy-storage/patron-notice-policies',
    searchParams,
  })
    .then(policy => {
      Cypress.env(CY_ENV.NOTICE_POLICY, policy.body.patronNoticePolicies);

      return policy.body.patronNoticePolicies;
    });
});

Cypress.Commands.add('getOverdueFinePolicy', (searchParams) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'overdue-fines-policies',
    searchParams,
  })
    .then(policy => {
      Cypress.env(CY_ENV.OVERDUE_FINE_POLICY, policy.body.overdueFinePolicies);

      return policy.body.overdueFinePolicies;
    });
});

Cypress.Commands.add('getLostItemFeesPolicy', (searchParams) => {
  cy.okapiRequest({
    method: REQUEST_METHOD.GET,
    path: 'lost-item-fees-policies',
    searchParams,
  })
    .then(policy => {
      Cypress.env(CY_ENV.LOST_ITEM_FEES_POLICY, policy.body.lostItemFeePolicies);

      return policy.body.lostItemFeePolicies;
    });
});
