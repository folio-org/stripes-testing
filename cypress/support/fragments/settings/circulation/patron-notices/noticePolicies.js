import uuid from 'uuid';
import getRandomPostfix, { getTestEntityValue } from '../../../../utils/stringTools';

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

export const getDefaultNoticePolicy = ({ id = uuid(), name, templateId } = {}) => ({
  id,
  name: name || `Policy_name_${getRandomPostfix()}`,
  description: `Policy_description_${getRandomPostfix()}`,
  active: true,
  loanNotices: templateId
    ? [
      {
        templateId,
        format: 'Email',
        realTime: false,
        sendOptions: {
          sendWhen: 'Check out',
        },
      },
    ]
    : [],
});

export const NOTICE_CATEGORIES = {
  loan: {
    name: 'Loan',
    id: 'loan',
    requestId: 'Loan',
  },
  request: {
    name: 'Request',
    id: 'request',
    requestId: 'Request',
  },
  AutomatedFeeFineCharge: {
    name: 'Automated fee/fine charge',
    id: 'automatedFeeFineCharge',
    requestId: 'AutomatedFeeFineCharge',
  },
  AutomatedFeeFineAdjustment: {
    name: 'Automated fee/fine adjustment (refund or cancel)',
    id: 'automatedFeeFineAdjustment',
    requestId: 'AutomatedFeeFineAdjustment',
  },
  FeeFineCharge: {
    name: 'Manual fee/fine charge',
    id: 'feeFineCharge',
    requestId: 'FeeFineCharge',
  },
  FeeFineAction: {
    name: 'Manual fee/fine action (pay, waive, refund, transfer or cancel/error)',
    id: 'feeFineAction',
    requestId: 'FeeFineAction',
  },
};

export default {
  createWithTemplateApi(policyProps = getDefaultNoticePolicy()) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'patron-notice-policy-storage/patron-notice-policies',
      body: policyProps,
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
