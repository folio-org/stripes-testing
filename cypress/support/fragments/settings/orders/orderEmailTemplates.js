import {
  Accordion,
  Button,
  DropdownMenu,
  KeyValue,
  NavListItem,
  Pane,
  PaneHeader,
  including,
  matching,
} from '../../../../../interactors';
import { COMMON_BUTTON_LABELS } from '../../../constants';

// An empty key-value is rendered as "No value set-"
const populatedValue = matching(/^(?!No value set)\S/);

const listPane = Pane('Order email templates');

const generalInformationAccordion = Accordion('General information');
const templateContentAccordion = Accordion('Template content');
const recordLastUpdatedAccordion = Accordion(including('Record last updated'));

export default {
  waitLoading() {
    cy.expect(listPane.exists());
  },

  verifyListPane(templateName) {
    cy.expect([
      listPane.find(Button('New')).exists(),
      listPane.find(NavListItem(templateName)).exists(),
    ]);
  },

  selectTemplate(templateName) {
    cy.do(listPane.find(NavListItem(templateName)).click());
    cy.expect(Pane(templateName).exists());
  },

  verifyDetailPaneHeader(templateName) {
    cy.expect([
      PaneHeader(templateName).exists(),
      Pane(templateName).find(Button(COMMON_BUTTON_LABELS.ACTIONS)).exists(),
    ]);
  },

  verifyAccordionsExpanded() {
    cy.expect([
      generalInformationAccordion.has({ open: true }),
      templateContentAccordion.has({ open: true }),
    ]);
  },

  verifyGeneralInformation({ templateName, active }) {
    cy.expect([
      generalInformationAccordion.find(KeyValue('Template name')).has({ value: templateName }),
      generalInformationAccordion.find(KeyValue('Active')).has({ value: active }),
      generalInformationAccordion.find(KeyValue('Description')).has({ value: populatedValue }),
    ]);
  },

  verifyTemplateContent() {
    cy.expect([
      templateContentAccordion.find(KeyValue('Email subject')).has({ value: populatedValue }),
      templateContentAccordion.find(KeyValue('Email body')).has({ value: populatedValue }),
      templateContentAccordion.find(Button('Preview')).exists(),
    ]);
  },

  verifyRecordLastUpdated() {
    cy.expect(recordLastUpdatedAccordion.exists());
  },

  openActionsMenu(templateName) {
    cy.do(Pane(templateName).find(Button(COMMON_BUTTON_LABELS.ACTIONS)).click());
    cy.expect(DropdownMenu({ visible: true }).exists());
  },

  verifyActionsMenuOptions(options) {
    options.forEach((option) => {
      cy.expect(DropdownMenu({ visible: true }).find(Button(option)).exists());
    });
    cy.then(() => DropdownMenu({ visible: true }).buttons()).then((buttons) => {
      expect(Array.from(buttons).map((button) => button.textContent.trim())).to.deep.equal(options);
    });
  },
};
