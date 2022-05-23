import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, NavListItem, Checkbox, Select } from '../../../../interactors';

const actionsButton = Button('Actions');
const addNoticeButton = Button('Add notice')
const nameField = TextField({ id: 'notice_policy_name' });
const templateSelect = Select({ id: 'select-45'})

export default {
  defaultUiPatronNoticePolicies : {
    name: `Test_notice_${getRandomPostfix()}`,
    description: 'Created by autotest team',
    template: null,
  },

  getTemplate(patronNoticePolicy,  template) {
    return { ...patronNoticePolicy, template }
  },

  createPolicy(patronNoticePolicy) {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    addNoticeButton.click()
    this.fillGeneralInformation(patronNoticePolicy);
  },

  fillPolicyTemplate(patronNoticePolicy) {
    cy.do([
      addNoticeButton.click(),
      cy.log('should find button "Add notice"'),
      cy.log(patronNoticePolicy.template),
      templateSelect.select( ` ${patronNoticePolicy.template} `)
    ])
    },

  fillGeneralInformation: (patronNoticePolicy) => {
    cy.do([
      nameField.fillIn(patronNoticePolicy.name),
      Checkbox({ id: 'notice_policy_active' }).click(),
      TextArea({ id: 'notice_policy_description' }).fillIn(patronNoticePolicy.description),
    ]);
  },

  savePolicy: () => {
    cy.do([
      Button({ id: 'footer-save-entity' }).click(),
      Button({ icon: 'times' }).click(),
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

  deletePolicy: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  }
};
