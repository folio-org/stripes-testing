import getRandomPostfix from '../../utils/stringTools';
import {
  Button,
  TextArea,
  NavListItem,
  Checkbox,
  Select,
  Section,
  Link,
  TextInput
} from '../../../../interactors';

const actionsButton = Button('Actions');
const addNoticeButton = Button('Add notice');
const nameField = TextInput({ id: 'notice_policy_name' });

export default {
  defaultUiPatronNoticePolicies: {
    name: `Test_notice_${getRandomPostfix()}`,
    description: 'Created by autotest team',
    // optional properties:
    templateId: null,
    action: null,
    format: null,
  },

  getPatronNoticePolicyTemplate(patronNoticePolicy, templateId, action) {
    return { ...patronNoticePolicy, templateId, action };
  },

  createPolicy(patronNoticePolicy) {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    this.fillGeneralInformation(patronNoticePolicy);
  },

  addNotice(patronNoticePolicy) {
    cy.do([
      Section({ id: `edit${patronNoticePolicy.noticeName}Notices` }).find(addNoticeButton).click(),
      Select({ name: `${patronNoticePolicy.noticeId}Notices[0].templateId` }).choose(patronNoticePolicy.templateId),
      Select({ name: `${patronNoticePolicy.noticeId}Notices[0].format` }).choose(patronNoticePolicy.format),
      Select({ name: `${patronNoticePolicy.noticeId}Notices[0].sendOptions.sendWhen` }).choose(patronNoticePolicy.action),
    ]);
  },

  fillGeneralInformation: (patronNoticePolicy) => {
    cy.do([
      nameField.fillIn(patronNoticePolicy.name),
      Checkbox({ id: 'notice_policy_active' }).click(),
      TextArea({ id: 'notice_policy_description' }).fillIn(
        patronNoticePolicy.description
      ),
    ]);
  },

  savePolicy: () => {
    cy.do([
      Button({ id: 'footer-save-entity' }).click(),
      Button({ icon: 'times' }).click(),
    ]);
  },

  openNoticyToSide(patronNoticePolicy) {
    cy.do(Link(patronNoticePolicy.name).click());
  },

  checkPolicy: (patronNoticePolicyName) => {
    cy.expect(NavListItem(patronNoticePolicyName).exists());
  },

  choosePolicy: (patronNoticePolicy) => {
    cy.do(NavListItem(patronNoticePolicy.name).click());
  },

  editPolicy(patronNoticePolicy) {
    cy.do([
      NavListItem(patronNoticePolicy.name).click(),
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-edit-item' }).click(),
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
