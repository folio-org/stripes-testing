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
  Pane,
  DropdownMenu,
  HTML,
  including,
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
const newButton = Button({ id: 'clickable-create-entry' });
const activeCheckbox = Checkbox({ id: 'notice_policy_active' });
const keyName = 'Patron notice policy name';
const keyDescription = 'Description';
const noticeSections = {
  loan: {
    id: 'editLoanNotices',
    label: 'Loan notices - sent to borrower',
    noticeId: 'loan',
  },
  feeFine: {
    id: 'editFeeFineNotices',
    label: 'Fee/fine notices',
    noticeId: 'feeFine',
  },
  request: {
    id: 'editRequestNotices',
    label: 'Request notices - sent to requester',
    noticeId: 'request',
  },
};

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

  verifyPoliciesListPane() {
    cy.expect(Heading('Patron notice policies').exists());
  },

  verifyNewButtonLabel() {
    cy.expect([newButton.exists(), newButton.has({ text: 'New', visible: true })]);
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
    return cy.do(newButton.click());
  },

  verifyNewPolicyForm() {
    cy.expect([
      Heading('New patron notice policy').exists(),
      nameField.exists(),
      descriptionField.exists(),
      activeCheckbox.exists(),
    ]);
    Object.values(noticeSections).forEach(({ id, label }) => {
      cy.expect(Section({ id }).has({ label: including(label) }));
    });
  },

  expandNoticeSection(sectionName) {
    const { id } = noticeSections[sectionName];
    const section = Section({ id });

    cy.expect(section.exists());
    cy.do(
      section.perform((element) => {
        const content = element.querySelector('[class^=content-wrap]');
        if (!content.className.includes('expanded')) {
          element.querySelector('[class^=defaultCollapseButton-]').click();
        }
      }),
    );
    cy.expect(section.has({ expanded: true }));
  },

  addEmptyNotice(sectionName, index = 0) {
    const { id } = noticeSections[sectionName];
    const section = Section({ id });

    cy.expect(section.find(addNoticeButton).exists());
    cy.do(section.find(addNoticeButton).click());
    this.verifyNoticeRowHasNoSelection(sectionName, index);
  },

  noticeFields(sectionName, index = 0) {
    const { noticeId } = noticeSections[sectionName];
    return {
      template: Select({ name: `${noticeId}Notices[${index}].templateId` }),
      format: Select({ name: `${noticeId}Notices[${index}].format` }),
      trigger: Select({ name: `${noticeId}Notices[${index}].sendOptions.sendWhen` }),
    };
  },

  verifyNoticeRowHasNoSelection(sectionName, index = 0) {
    const fields = this.noticeFields(sectionName, index);
    cy.expect([
      fields.template.has({ value: '' }),
      fields.format.has({ value: '' }),
      fields.trigger.has({ value: '' }),
    ]);
  },

  verifyNoticeFormatOptions(sectionName, index = 0) {
    const formatField = this.noticeFields(sectionName, index).format;
    cy.do(formatField.click());
    cy.expect(formatField.has({ optionsText: ['Email', 'Text message'] }));
  },

  openPolicy(policyName) {
    cy.expect(NavListItem(policyName).exists());
    cy.do(NavListItem(policyName).click());
    cy.expect(Pane(policyName).exists());
  },

  verifyPolicyNoticeDetails(policyName, templateName, format) {
    const policyPane = Pane(policyName);
    cy.expect([
      policyPane.exists(),
      policyPane.find(HTML({ text: including(templateName) })).exists(),
      policyPane.find(HTML({ text: including(format) })).exists(),
    ]);
  },

  openPolicyForEditing(policyName, templateName) {
    const policyPane = Pane(policyName);
    const editButton = DropdownMenu().find(actionsButtons.edit);
    const noticeFields = this.noticeFields('loan');

    cy.do(policyPane.find(actionsButton).click());
    cy.expect(DropdownMenu().exists());
    cy.expect(editButton.exists());
    cy.do(editButton.click());
    cy.expect([
      nameField.has({ value: policyName }),
      noticeFields.template.has({ selectedOptionLabel: templateName }),
      noticeFields.format.has({ selectedOptionLabel: 'Email' }),
    ]);
  },

  selectNoticeFormat(sectionName, format, index = 0) {
    const formatField = this.noticeFields(sectionName, index).format;
    cy.do(formatField.choose(format));
    cy.expect(formatField.has({ selectedOptionLabel: format }));
  },

  saveAndClosePolicy() {
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());
    cy.expect(noticePolicyForm.absent());
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
