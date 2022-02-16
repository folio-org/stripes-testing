import { Button, TextField, TextArea, NavListItem, Checkbox, Accordion } from '../../../../interactors';

export default {
  settingsCirculationPath: {
    circulationRules: '/rules',
    otherSettings: '/checkout',
    staffSlips: '/staffslips',
    fixedDueDateSchedules: '/fixed-due-date-schedules',
    loanHistory:  '/loan-history',
    loanPolicies: '/loan-policies',
    overdueFinePolicies: '/fine-policies',
    lostItemFeePolicy:'/lost-item-fee-policy',
    patronNoticePolicies:'/notice-policies',
    patronNoticeTemplates:'/patron-notices',
    requestCancellationReasons:'/cancellation-reasons',
    requestPolicies:'/request-policies',
    titleLevelRequests:'/title-level-requests'
  },

  createNewPatronNoticePolicies(patronNoticePolicy) {
    cy.do(Button({ id: 'clickable-create-entry' }).click());
    this.fillGeneralInformation(patronNoticePolicy);
  },
  fillGeneralInformation: (patronNoticePolicy) => {
    cy.do([
      TextField({ id: 'notice_policy_name' }).fillIn(patronNoticePolicy.name),
      Checkbox({ id: 'notice_policy_active' }).click(),
      TextArea({ id: 'notice_policy_description' }).fillIn(patronNoticePolicy.description),
      Button({ id: 'footer-save-entity' }).click(),
    ]);
  },
  checkPatronNoticePolicies: (patronNoticePolicy) => {
    cy.expect(NavListItem(patronNoticePolicy.name));
  },
  editPatronNoticePolicies(patronNoticePolicy) {
    cy.do([
      NavListItem(patronNoticePolicy.name).click(),
      Button('Actions').click(),
      Button({ id: 'dropdown-clickable-edit-item' }).click(),
    ]);
    this.fillGeneralInformation(patronNoticePolicy);
  },
  duplicatePatronNoticePolicies: () => {
    cy.do([
      Button('Actions').click(),
      Button({ id: 'dropdown-clickable-duplicate-item' }).click(),
      TextField({ id: 'notice_policy_name' }).fillIn('DUPLICATE'),
      Button({ id: 'footer-save-entity' }).click(),
    ]);
  },
  deletePatronNoticePolicies: () => {
    cy.do([
      Button('Actions').click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  },
};
