import getRandomPostfix from '../../utils/stringTools';
import {
  Button,
  TextArea,
  NavListItem,
  Checkbox,
  Select,
  Section,
  Link,
  TextInput,
  Heading,
  PaneSet,
  KeyValue,
} from '../../../../interactors';

const actionsButton = Button('Actions');
const addNoticeButton = Button('Add notice');
const nameField = TextInput({ id: 'notice_policy_name' });
const descriptionField = TextArea({ id: 'notice_policy_description' });
const sections = {
  section1: Section({ id: 'editLoanNotices' }),
  section2: Section({ id: 'editRequestNotices' }),
  section3: Section({ id: 'editFeeFineNotices' }),
};
const activeCheckbox = Checkbox({ id: 'notice_policy_active' });

export const actionsButtons = {
  edit: Button({ id: 'dropdown-clickable-edit-item' }),
  duplicate: Button({ id: 'dropdown-clickable-duplicate-item' }),
  delete: Button({ id: 'dropdown-clickable-delete-item' }),
};

export default {
  defaultUi: {
    name: `Test_notice_${getRandomPostfix()}`,
    description: 'Created by autotest team',
  },

  waitLoading() {
    cy.do(Link('Patron notice policies').click());
    cy.expect(Heading('Patron notice policies').exists());
  },

  openToSide(patronNoticePolicy) {
    cy.do(Link(patronNoticePolicy.name).click());
  },

  fillGeneralInformation: (patronNoticePolicy) => {
    cy.do([
      nameField.fillIn(patronNoticePolicy.name),
      activeCheckbox.click(),
      descriptionField.fillIn(
        patronNoticePolicy.description
      ),
    ]);
  },

  create(patronNoticePolicy) {
    this.fillGeneralInformation(patronNoticePolicy);
  },

  startAdding() {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
  },

  addNotice(patronNoticePolicy) {
    cy.do([
      Section({ id: `edit${patronNoticePolicy.noticeName}Notices` }).find(addNoticeButton).click(),
      Select({ name: `${patronNoticePolicy.noticeId}Notices[0].templateId` }).choose(patronNoticePolicy.templateName),
      Select({ name: `${patronNoticePolicy.noticeId}Notices[0].format` }).choose(patronNoticePolicy.format),
      Select({ name: `${patronNoticePolicy.noticeId}Notices[0].sendOptions.sendWhen` }).choose(patronNoticePolicy.action),
    ]);
  },

  check: (patronNoticePolicy) => {
    cy.expect(NavListItem(patronNoticePolicy.name).exists());
  },

  checInitialState() {
    cy.expect([
      Heading('New patron notice policy').exists(),
      nameField.exists(),
      nameField.has({ value: '' }),
      descriptionField.exists(),
      descriptionField.has({ value: '' }),
      activeCheckbox.has({ checked:false }),
    ]);
    Object.values(sections).forEach((specialSection) => cy.expect(specialSection.find(addNoticeButton).has({ disabled: false, visible: true })));
  },
  checkAfterSaving: (patronNoticePolicy) => {
    Object.values(patronNoticePolicy).forEach((prop) => cy.expect(PaneSet().find(KeyValue({ value: prop }))));
  },

  checkNoticeActions(patronNoticePolicy) {
    cy.expect([
      this.openToSide(patronNoticePolicy),
      actionsButton.click(),
      actionsButton.click(),
      actionsButtons.duplicate.exists(),
      actionsButtons.duplicate.has({ visible: true }),
      actionsButtons.edit.exists(),
      actionsButtons.duplicate.exists({ visible: true }),
      actionsButtons.delete.exists(),
      actionsButtons.duplicate.exists({ visible: true }),
    ]);
  },

  save: () => {
    cy.do([
      Button({ id: 'footer-save-entity' }).click(),
      Button({ icon: 'times' }).click(),
    ]);
  },

  choosePolicy: (patronNoticePolicy) => {
    cy.do(NavListItem(patronNoticePolicy.name).click());
  },

  editPolicy(patronNoticePolicy) {
    cy.do([
      NavListItem(patronNoticePolicy.name).click(),
      actionsButton.click(),
      actionsButtons.edit.click(),
    ]);
    this.fillGeneralInformation(patronNoticePolicy);
  },

  duplicatePolicy: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-duplicate-item' }).click(),
      nameField.fillIn('DUPLICATE'),
      Button({ id: 'footer-save-entity' }).click(),
    ]);
  },

  deletePolicy: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  },
};
