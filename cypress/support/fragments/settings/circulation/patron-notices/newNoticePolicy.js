import getRandomPostfix from '../../../../utils/stringTools';
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
  TextField,
  Form,
} from '../../../../../../interactors';

const actionsButton = Button('Actions');
const addNoticeButton = Button('Add notice');
const nameField = TextInput({ id: 'notice_policy_name' });
const descriptionField = TextArea({ id: 'notice_policy_description' });
const sections = {
  section1: Section({ id: 'editLoanNotices' }),
  section2: Section({ id: 'editRequestNotices' }),
  section3: Section({ id: 'editFeeFineNotices' }),
};

const noticePolicyForm = Form({ testId: 'form' });
const saveButton = noticePolicyForm.find(Button('Save & close'));
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
    return cy.expect(Heading('Patron notice policies').exists());
  },

  openToSide(patronNoticePolicy) {
    cy.do(Link(patronNoticePolicy.name).click());
  },
  fillGeneralInformation: (patronNoticePolicy) => {
    cy.do([
      nameField.fillIn(patronNoticePolicy.name),
      activeCheckbox.click(),
      descriptionField.fillIn(patronNoticePolicy.description),
    ]);
  },

  startAdding() {
    return cy.do(Button({ id: 'clickable-create-entry' }).click());
  },

  addNotice(patronNoticePolicy, index = 0) {
    cy.do([
      Section({ id: `edit${patronNoticePolicy.noticeName}Notices` })
        .find(addNoticeButton)
        .click(),
      Select({ name: `${patronNoticePolicy.noticeId}Notices[${index}].templateId` }).choose(
        patronNoticePolicy.templateName,
      ),
      Select({ name: `${patronNoticePolicy.noticeId}Notices[${index}].format` }).choose(
        patronNoticePolicy.format,
      ),
      Select({
        name: `${patronNoticePolicy.noticeId}Notices[${index}].sendOptions.sendWhen`,
      }).choose(patronNoticePolicy.action),
    ]);
    // add check for alert "div[role=alert]" 'Always sent at the end of a session and loans are bundled into a single notice for each patron.'
    if (patronNoticePolicy.send !== undefined) {
      cy.do(
        Select({
          name: `${patronNoticePolicy.noticeId}Notices[${index}].sendOptions.sendHow`,
        }).choose(patronNoticePolicy.send),
      );
      if (patronNoticePolicy.send === 'After' || patronNoticePolicy.send === 'Before') {
        cy.do([
          TextField({
            name: `${patronNoticePolicy.noticeId}Notices[${index}].sendOptions.sendBy.duration`,
          }).fillIn(patronNoticePolicy.sendBy.duration),
          Select({
            name: `${patronNoticePolicy.noticeId}Notices[${index}].sendOptions.sendBy.intervalId`,
          }).choose(patronNoticePolicy.sendBy.interval),
          Select({ name: `${patronNoticePolicy.noticeId}Notices[${index}].frequency` }).choose(
            patronNoticePolicy.frequency,
          ),
        ]);
        if (patronNoticePolicy.frequency === 'Recurring') {
          cy.do([
            TextField({
              name: `${patronNoticePolicy.noticeId}Notices[${index}].sendOptions.sendEvery.duration`,
            }).fillIn(patronNoticePolicy.sendEvery.duration),
            Select({
              name: `${patronNoticePolicy.noticeId}Notices[${index}].sendOptions.sendEvery.intervalId`,
            }).choose(patronNoticePolicy.sendEvery.interval),
          ]);
        }
      }
    }
  },

  checkPolicyName: (patronNoticePolicy) => {
    return cy.expect(NavListItem(patronNoticePolicy.name).exists());
  },

  checkInitialState() {
    cy.expect([
      Heading('New patron notice policy').exists(),
      nameField.exists(),
      nameField.has({ value: '' }),
      descriptionField.exists(),
      descriptionField.has({ value: '' }),
      activeCheckbox.has({ checked: false }),
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
      actionsButtons.duplicate.exists(),
      actionsButtons.duplicate.has({ visible: true }),
      actionsButtons.edit.exists(),
      actionsButtons.edit.has({ visible: true }),
      actionsButtons.delete.exists(),
      actionsButtons.delete.has({ visible: true }),
    ]);
  },

  save() {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());
  },

  choosePolicy: (patronNoticePolicy) => {
    cy.do(NavListItem(patronNoticePolicy.name).click());
  },

  createPolicy({ noticePolicy, noticeTemplates = [] }) {
    this.startAdding();
    this.checkInitialState();
    this.fillGeneralInformation(noticePolicy);
    noticeTemplates.forEach((template, index) => {
      this.addNotice(template.notice, index);
    });
    this.save();
    cy.expect(noticePolicyForm.absent());
  },
  editPolicy(patronNoticePolicy) {
    cy.do([
      NavListItem(patronNoticePolicy.name).click(),
      actionsButton.click(),
      actionsButtons.edit.click(),
    ]);
    this.fillGeneralInformation(patronNoticePolicy);
  },
  duplicatePolicy() {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-duplicate-item' }).click(),
      nameField.fillIn(`DUPLICATETest_notice_${getRandomPostfix()}`),
    ]);
    this.save();
  },

  deletePolicy() {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  },
};
