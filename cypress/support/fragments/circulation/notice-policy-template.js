import uuid from 'uuid';
import getRandomPostfix from '../../utils/stringTools';

const defaultNoticeTemplateBody = {
  active: true,
  description: 'Notice_policy_template_description',
  id: uuid(),
  localizedTemplates: {
    en: { header: 'Email subject: Loan', body: '<div>Email body {{item.title}}</div>' },
  },
  body: '<div> Email body {{item.title}} </div>',
  header: 'Email subject: Loan',
  name: `Template_name_${getRandomPostfix}`,
  outputFormats: ['text/html'],
  0: 'text/html',
  templateResolver: 'mustache',
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
  getViaApi(query) {
    return cy.okapiRequest({
      path: 'templates',
      searchParams: query
    }).then((res) => {
      return res.body.templates[0].id;
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
