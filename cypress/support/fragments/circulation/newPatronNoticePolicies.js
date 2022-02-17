import getRandomPostfix from '../../utils/stringTools';
import { Button, TextField, TextArea, NavListItem, Checkbox } from '../../../../interactors';

const actionsButton = Button('Actions');
const nameField = TextField({ id: 'notice_policy_name' });

export default {
  defaultUiPatronNoticePolicies : {
    name: `Test_notice_${getRandomPostfix()}`,
    description: 'Created by autotest team',
  },
  create(patronNoticePolicy) {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    this.fillGeneralInformation(patronNoticePolicy);
  },
  fillGeneralInformation: (patronNoticePolicy) => {
    cy.do([
      nameField.fillIn(patronNoticePolicy.name),
      Checkbox({ id: 'notice_policy_active' }).click(),
      TextArea({ id: 'notice_policy_description' }).fillIn(patronNoticePolicy.description),
      Button({ id: 'footer-save-entity' }).click(),
    ]);
  },
  check: (patronNoticePolicy) => {
    cy.expect(NavListItem(patronNoticePolicy.name));
  },
  edit(patronNoticePolicy) {
    cy.do([
      NavListItem(patronNoticePolicy.name).click(),
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-edit-item' }).click(),
    ]);
    this.fillGeneralInformation(patronNoticePolicy);
  },
  duplicate: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-duplicate-item' }).click(),
      TextField({ id: 'notice_policy_name' }).fillIn('DUPLICATE'),
      Button({ id: 'footer-save-entity' }).click(),
    ]);
  },
  delete: () => {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  }
};
