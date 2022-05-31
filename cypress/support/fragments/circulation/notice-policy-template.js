import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

const defaultNoticeTemplateBody = {
  active: true,
  description: 'Notice_policy_template_description',
  id: uuid(),
  localizedTemplates: {
    en: { header: 'Email_subject', body: '<div>Email_body</div>' },
  },
  body: '<div> Email_body</div>',
  header: 'Ema il_subject',
  name: `Tempp late_name_${getRandomPostfix}`,
  outputFormats: ['text/html'],
  0: 'text/html',
  templateResolver: 'mustache',
};

export const TEMPLATE_CATEGORIES = {
  loan: 'Loan',
  request: 'Request',
  AutomatedFeeFineCharge: 'Automated fee/fine charge',
  AutomatedFeeFineAdjustment: 'Automated fee/fine adjustment (refund or cancel)',
  FeeFineCharge: 'Manual fee/fine charge',
  FeeFineAction: 'Manual fee/fine action (pay, waive, refund, transfer or cancel/error)'
};

export default {
  defaultNoticeTemplateBody,
  createViaApi(noticeTemplateCategory) {
    return cy.okapiRequest({ method: 'POST',
      path: 'templates',
      body: {
        category: noticeTemplateCategory,
        ...defaultNoticeTemplateBody
      },
      searchParams:  {
        query: '(cq l.allRecords=1) and category=""',
        limit: 1000,
      } }).then(({ res }) => {
      return res;
    });
  },

  deleteViaApi(templateId) {
    return cy.okapiRequest({ method: 'DELETE',
      path: `templates/${templateId}`,
      searchParams: {
        query: '(cql.allRecords=1) and category=""'
      } });
  },
};
