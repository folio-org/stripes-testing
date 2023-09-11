import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';

export const NOTICE_ACTIONS = {
  checkin: 'Check in',
  checkout: 'Check out',
};

export const defaultNoticePolicy = {
  name: getTestEntityValue(),
  description: 'description',
  active: true,
  id: uuid(),
};

export const NOTICE_CATEGORIES = {
  loan: {
    name: 'Loan',
    id: 'loan',
  },
  request: {
    name: 'Request',
    id: 'request',
  },
  AutomatedFeeFineCharge: {
    name: 'Automated fee/fine charge',
    id: 'automatedFeeFineCharge',
  },
  AutomatedFeeFineAdjustment: {
    name: 'Automated fee/fine adjustment (refund or cancel)',
    id: 'automatedFeeFineAdjustment',
  },
  FeeFineCharge: {
    name: 'Manual fee/fine charge',
    id: 'feeFineCharge',
  },
  FeeFineAction: {
    name: 'Manual fee/fine action (pay, waive, refund, transfer or cancel/error)',
    id: 'feeFineAction',
  },
};

export default {
  createWithTemplateApi(policyName, createdTemplateId, sendWhenOption) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'patron-notice-policy-storage/patron-notice-policies',
      body: {
        name: policyName,
        description: 'description',
        active: true,
        id: uuid(),
        loanNotices: [
          {
            format: 'Email',
            realTime: false,
            templateId: createdTemplateId,
            sendOptions: {
              sendWhen: sendWhenOption,
            },
          },
        ],
      },
    });
  },
  createApi() {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'patron-notice-policy-storage/patron-notice-policies',
        body: defaultNoticePolicy,
      })
      .then(({ body }) => {
        Cypress.env('noticePolicy', body);
        return body;
      });
  },
  getApi(searchParams) {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'patron-notice-policy-storage/patron-notice-policies',
        searchParams,
      })
      .then((policy) => {
        return policy.body.patronNoticePolicies;
      });
  },
  deleteViaApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `patron-notice-policy-storage/patron-notice-policies/${id}`,
    });
  },
};
