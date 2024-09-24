import { Button, Link, Modal, Section, TextArea } from '../../../../../interactors';
import RichTextEditor from '../../../../../interactors/rich-text-editor';

const routingListConfigurationSection = Section({ id: 'routing-list-configuration-template-pane' });
const previewModal = Modal({ id: 'preview-modal' });

export default {
  waitLoading() {
    cy.expect(routingListConfigurationSection.exists());
  },

  edit() {
    cy.wait(2000);
    cy.do(routingListConfigurationSection.find(Button('Edit')).click());
  },

  preview() {
    cy.wait(2000);
    cy.do(routingListConfigurationSection.find(Button('Preview')).click());
    cy.expect(previewModal.exists());
  },

  save() {
    cy.do(Button({ id: 'routing-list-configuration-save-button' }).click());
  },

  fillInfoSectionFields(descripription, body) {
    cy.wait(2000);
    cy.do(TextArea({ name: 'description' }).fillIn(descripription));
    cy.do(RichTextEditor().fillIn(body));
  },

  addLinkInBody: () => {
    cy.get('.ql-container > .ql-editor').type('{selectAll}');
    cy.do(Button({ ariaLabel: 'link' }).click());
    cy.get('.ql-action').click();
  },

  clickOnLinkInBody(linkName) {
    cy.wait(2000);
    cy.do(routingListConfigurationSection.find(Link(linkName)).click());
  },

  clickOnLinkInPreview(linkName) {
    cy.wait(2000);
    cy.do(previewModal.find(Link(linkName)).click());
  },
};
