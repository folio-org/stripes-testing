import {
  Button,
  Section,
  TextField,
  TextArea,
  Checkbox,
  NavListItem,
} from '../../../../../interactors';
import { REQUEST_METHOD } from '../../../constants';

export default {
  createViaApi: (templateBody) => cy
    .okapiRequest({
      method: REQUEST_METHOD.POST,
      path: 'manual-block-templates',
      body: templateBody,
      isDefaultSearchParamsRequired: false,
    })
    .then((response) => response.body),

  deleteViaApi: (id) => cy.okapiRequest({
    method: REQUEST_METHOD.DELETE,
    path: `manual-block-templates/${id}`,
    isDefaultSearchParamsRequired: false,
  }),

  newPatronTemplate() {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
  },

  verifyAddNewNotAvailable() {
    cy.expect(Button({ id: 'clickable-create-entry' }).absent());
  },

  fillInPatronTemplateInformation(name, description) {
    cy.do([
      TextField({ name: 'name' }).fillIn(name),
      Section({ id: 'blockInformation' })
        .find(TextArea({ name: 'blockTemplate.desc' }))
        .fillIn(description),
      Checkbox('Borrowing').click(),
      Button('Save & close').click(),
    ]);
  },

  findPatronTemplate(templateName) {
    cy.do(NavListItem(templateName).click());
  },

  editPatronTemplate() {
    cy.do(Button({ id: 'clickable-edit-item' }).click());
  },

  deletePatronTemplate() {
    cy.do(Button({ id: 'clickable-delete-block-template' }).click());
    cy.wait(1000);
    cy.do(Button({ id: 'clickable-delete-block-template-confirmation-confirm' }).click());
    cy.wait(2000);
  },
};
