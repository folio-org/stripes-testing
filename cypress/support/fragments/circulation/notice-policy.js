import uuid from 'uuid';
import { getTestEntityValue } from '../../utils/stringTools';

export const NOTICE_ACTIONS = {
  checkin: 'Check in',
  checkout: 'Check out'
};

const loanNotice = {
  'format': 'Email',
  'realTime': false,
};

export const defaultNoticePolicy = {
  name: getTestEntityValue(),
  description: 'description',
  active: true,
  id: uuid(),
};

export default {
  createWithTemplateApi(createdTemplateId, sendWhenOption) {
    return cy
      .okapiRequest({
        method: 'POST',
        path: 'patron-notice-policy-storage/patron-notice-policies',
        body: {
          ...defaultNoticePolicy,
          loanNotices:
            [{
              ...loanNotice,
              templateId: createdTemplateId,
              sendOptions: {
                sendWhen: sendWhenOption,
              },
            }]
        },
      })
      .then(({ body }) => {
        return body;
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
  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `patron-notice-policy-storage/patron-notice-policies/${id}`,
    });
  },
};
