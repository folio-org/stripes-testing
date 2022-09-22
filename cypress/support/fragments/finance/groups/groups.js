import getRandomPostfix from '../../../utils/stringTools';
import { Button, Accordion, TextField, Section, KeyValue } from '../../../../../interactors';

const newButton = Button('New');
const nameField = TextField('Name*');
const codeField = TextField('Code*');

export default {

  defaultUiGroup: {
    name: `autotest_group_${getRandomPostfix()}`,
    code: getRandomPostfix(),
    status: 'Active'
  },

  createViaApi: (groupProperties) => {
    return cy
      .okapiRequest({
        path: 'finance/groups',
        body: groupProperties,
        method: 'POST'
      })
      .then((response) => {
        return response.body;
      });
  },

  createDefaultGroup(defaultGroup) {
    cy.do([
      newButton.click(),
      nameField.fillIn(defaultGroup.name),
      codeField.fillIn(defaultGroup.code),
      Button('Save & Close').click()
    ]);
    this.waitForGroupDetailsLoading();
  },

  waitForGroupDetailsLoading : () => {
    cy.do(Section({ id: 'pane-group-details' }).visible);
  },

  deleteGroupViaActions: () => {
    cy.do([
      Button('Actions').click(),
      Button('Delete').click(),
      Button('Delete', { id:'clickable-group-remove-confirmation-confirm' }).click()
    ]);
  },

  tryToCreateGroupWithoutMandatoryFields(groupName) {
    cy.do([
      newButton.click(),
      nameField.fillIn(groupName),
      Button('Save & Close').click(),
    ]);
    cy.expect(codeField.has({ error: 'Required!' }));
    cy.do([
      // try to navigate without saving
      Button('Agreements').click(),
      Button('Keep editing').click,
      Button('Cancel').click(),
      Button('Close without saving').click()
    ]);
  },

  checkCreatedGroup: (defaultGroup) => {
    cy.expect(Accordion({ id: 'information' }).find(KeyValue({ value: defaultGroup.name })).exists());
  },

  deleteGroupViaApi: (groupId) => cy.okapiRequest({
    method: 'DELETE',
    path: `finance/groups/${groupId}`,
    isDefaultSearchParamsRequired: false,
  }),
};
