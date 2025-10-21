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
  RadioButton,
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
const keyName = 'Patron notice policy name';
const keyDescription = 'Description';

export const actionsButtons = {
  edit: Button({ id: 'dropdown-clickable-edit-item' }),
  duplicate: Button({ id: 'dropdown-clickable-duplicate-item' }),
  delete: Button({ id: 'dropdown-clickable-delete-item' }),
};

export default {
  getDefaultUI() {
    return {
      name: `Test_notice_${getRandomPostfix()}`,
      description: 'Created by autotest team',
    };
  },

  openTabCirculationPatronNoticePolicies() {
    cy.do(NavListItem('Circulation').click());
    cy.do(NavListItem('Patron notice policies').click());
  },

  waitLoading() {
    cy.do(Link('Patron notice policies').click());
    return cy.expect(Heading('Patron notice policies').exists());
  },

  openToSide(patronNoticePolicy) {
    cy.do(Link(patronNoticePolicy.name).click());
  },
  fillGeneralInformation: (patronNoticePolicy) => {
    cy.wait(500);
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
    cy.do(
      Section({ id: `edit${patronNoticePolicy.noticeName}Notices` })
        .find(addNoticeButton)
        .click(),
    );
    cy.wait(1500);
    cy.do(
      Select({ name: `${patronNoticePolicy.noticeId}Notices[${index}].templateId` }).choose(
        patronNoticePolicy.templateName,
      ),
    );
    cy.wait(1500);
    cy.do(
      Select({ name: `${patronNoticePolicy.noticeId}Notices[${index}].format` }).choose(
        patronNoticePolicy.format,
      ),
    );
    cy.wait(1500);
    cy.do(
      Select({
        name: `${patronNoticePolicy.noticeId}Notices[${index}].sendOptions.sendWhen`,
      }).choose(patronNoticePolicy.action),
    );
    cy.wait(1500);
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
      } else if (patronNoticePolicy.send === 'Upon/At' && patronNoticePolicy.realTimeOption) {
        cy.do(
          RadioButton({
            name: `${patronNoticePolicy.noticeId}Notices[${index}].realTime`,
            label: patronNoticePolicy.realTimeOption,
          }).click(),
        );
      }
      if (patronNoticePolicy.action.includes('Lost item fee(s)')) {
        const option = Math.random() < 0.5 ? 'longTermRadioButton' : 'shortTermRadioButton';
        cy.get(`input[data-testid="${option}"] + span + label`).then((elements) => {
          elements[index].click();
          cy.wait(1000);
        });
      }
    }
  },

  checkPolicyName: (patronNoticePolicy) => {
    return cy.expect(NavListItem(patronNoticePolicy.name).exists());
  },

  verifyNoticePolicyInTheList(patronNoticePolicy) {
    cy.expect(KeyValue(keyName, { value: patronNoticePolicy.name }).exists());
    cy.expect(KeyValue(keyDescription, { value: patronNoticePolicy.description }).exists());
  },

  verifyNoticePolicyNotInTheList: (patronNoticePolicy) => {
    return cy.expect(NavListItem(patronNoticePolicy.name).absent());
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
    cy.wait(1000);
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());
    cy.wait(2000);
  },

  choosePolicy: (patronNoticePolicy) => {
    cy.do(NavListItem(patronNoticePolicy.name).click());
    cy.wait(1000);
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
  editPolicy(patronNoticePolicy, newPatronNoticePolicy) {
    cy.do(NavListItem(patronNoticePolicy.name).click());
    cy.wait(500);
    cy.do(actionsButton.click());
    cy.wait(500);
    cy.do(actionsButtons.edit.click());
    this.fillGeneralInformation(newPatronNoticePolicy);
  },
  duplicatePolicy() {
    cy.do([actionsButton.click(), Button({ id: 'dropdown-clickable-duplicate-item' }).click()]);
    cy.wait(1000);
    cy.do(nameField.fillIn(`DUPLICATETest_notice_${getRandomPostfix()}`));
    this.save();
  },

  duplicateAndFillPolicy(patronNoticePolicy) {
    cy.do([actionsButton.click(), Button({ id: 'dropdown-clickable-duplicate-item' }).click()]);
    cy.wait(2000);
    this.fillGeneralInformation(patronNoticePolicy);
  },

  deletePolicy() {
    cy.do([
      actionsButton.click(),
      Button({ id: 'dropdown-clickable-delete-item' }).click(),
      Button({ id: 'clickable-delete-item-confirmation-confirm' }).click(),
    ]);
  },

  clickEditNoticePolicy(patronNoticePolicy) {
    cy.do([
      NavListItem(patronNoticePolicy.name).click(),
      actionsButton.click(),
      actionsButtons.edit.click(),
    ]);
    cy.wait(2000);
  },

  getPatronNoticePoliciesByNameViaAPI() {
    return cy
      .okapiRequest({
        method: 'GET',
        path: 'patron-notice-policy-storage/patron-notice-policies',
      })
      .then((response) => {
        return response.body.patronNoticePolicies;
      });
  },

  deletePatronNoticePolicyByNameViaAPI(name) {
    this.getPatronNoticePoliciesByNameViaAPI().then((policies) => {
      const policy = policies.find((p) => p.name === name);
      if (policy !== undefined) {
        this.deleteApi(policy.id);
      }
    });
  },

  deleteApi(id) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `patron-notice-policy-storage/patron-notice-policies/${id}`,
    });
  },
};
