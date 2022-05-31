import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, NavListItem, Checkbox, Link } from '../../../../interactors';

const actionsButton = Button('Actions');
const nameField = TextField({ id: 'notice_policy_name' });

export default {
  defaultUiPatronNoticePolicies: {
    name: `Test_notice_${getRandomPostfix()}`,
    description: 'Created by autotest team',
  },

  createPolicy(patronNoticePolicy) {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    this.fillGeneralInformation(patronNoticePolicy);
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
      Button({ id: 'footer-save-entity' }).click()
    ]);
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

  openNoticyToSide(patronNoticePolicy) {
    cy.do(Link(patronNoticePolicy.name).click());
  },

  deletePolicy: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  },
};
