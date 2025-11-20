import uuid from 'uuid';
import CirculationPane from '../baseCirculationPane';
import getRandomPostfix from '../../../../utils/stringTools';
import { Button, Modal, including } from '../../../../../../interactors';
import { NOTICE_CATEGORIES } from './noticePolicies';

const getDefaultTemplate = ({ id = uuid(), category = NOTICE_CATEGORIES.loan } = {}) => ({
  id,
  category: category.requestId,
  active: true,
  description: 'Notice policy template description',
  localizedTemplates: {
    en: { header: 'Email subject: Loan', body: '<div>Email body {{item.title}}</div>' },
  },
  body: '<div> Email body {{item.title}} </div>',
  header: 'Email subject: Loan',
  name: `Template_name_${getRandomPostfix()}`,
  outputFormats: ['text/html'],
  0: 'text/html',
  templateResolver: 'mustache',
});

const previewModal = Modal({ id: 'preview-modal' });

export default {
  ...CirculationPane,
  waitLoading() {
    CirculationPane.waitLoading('Patron notice templates');
  },
  getDefaultTemplate,
  checkPreview(previewText) {
    cy.wait(1000);
    cy.do(Button('Preview').click());
    cy.wait(2000);
    cy.expect([
      previewModal.has({ header: including('Preview of patron notice template') }),
      previewModal.has({ content: including(previewText) }),
    ]);
    cy.do(Button('Close').click());
  },
  collapseAll() {
    cy.do(Button('Collapse all').click());
    cy.wrap(['General information', 'Email or print']).each((accordion) => {
      cy.expect(Button(accordion).has({ ariaExpanded: 'false' }));
    });
  },
  expandAll() {
    cy.do(Button('Expand all').click());
    cy.wrap(['General information', 'Email or print']).each((accordion) => {
      cy.expect(Button(accordion).has({ ariaExpanded: 'true' }));
    });
  },
  createViaApi(template = getDefaultTemplate()) {
    return CirculationPane.createViaApi({
      path: 'templates',
      body: template,
    });
  },
  getViaApi(query) {
    return cy
      .okapiRequest({
        path: 'templates',
        searchParams: query,
      })
      .then((res) => {
        return res.body.templates[0]?.id;
      });
  },
  deleteViaApi(templateId) {
    cy.okapiRequest({
      method: 'DELETE',
      path: `templates/${templateId}`,
      searchParams: {
        query: '(cql.allRecords=1) and category=""',
      },
      isDefaultSearchParamsRequired: false,
      failOnStatusCode: false,
    });
  },
};
