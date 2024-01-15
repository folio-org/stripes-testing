import {
  PaneHeader,
  Button,
  Modal,
  Checkbox,
  HTML,
  NavListItem,
  Pane,
  MultiColumnListHeader,
  including,
  Warning,
  ListRow,
  Spinner
} from "../../../../interactors"

const selectMembersButton = Button('Select members');
const selectMembersModal = Modal('Select members');
const searchAndFilterPane = Pane('Search & filter');
const membersPane = Pane('Members');
const searchButton = Button('Search');
const resetAll = Button('Reset all');
const saveAndClose = Button('Save & close')

export const settingsItems = {
  users: 'Users'
};

export const usersItems = {
  departments: 'Departments'
};

export default {
  waitLoading() {
    cy.expect([
      PaneHeader({ title: 'Settings for selected members can be modified at the same time' }).exists(),
    ]);
  },

  clickSelectMembers() {
    cy.expect(Spinner().absent());
    cy.do(selectMembersButton.click());
  },

  verifySelectMembersModal(count) {
    cy.expect([
      selectMembersModal.find(searchAndFilterPane).exists(),
      selectMembersModal.find(membersPane).exists(),
      searchAndFilterPane.find(searchButton).has({ disabled: true }),
      searchAndFilterPane.find(resetAll).has({ disabled: true }),
      membersPane.find(HTML(`${count} members found`)).exists(),
      membersPane.find(Warning('Settings for the following selected members can be modified at the same time.')).exists(),
      membersPane.find(Checkbox({ ariaLabel: 'Select all members' })).has({ checked: true }),
      membersPane.find(HTML('End of list')).exists(),
      selectMembersModal.find(HTML(`Total selected: ${count}`)).exists(),
      selectMembersModal.find(Button({ icon: 'times' })).has({ disabled: false }),
      selectMembersModal.find(Button('Cancel')).has({ disabled: false }),
      selectMembersModal.find(saveAndClose).has({ disabled: false })
    ]);
  },

  selectAllMembers() {
    this.clickSelectMembers();
    cy.wait(2000);
    cy.get('[aria-label="Select all members"]')
      .invoke('is', ':checked')
      .then((checked) => {
        if (!checked) {
          cy.do([
            selectMembersModal.find(Checkbox({ ariaLabel: 'Select all members' })).click(),
          ]);
        }
      });
    cy.wait(2000);
    cy.do(saveAndClose.click());
  },

  selectMembers(member) {
    cy.do([
      selectMembersModal.find(ListRow(member)).find(Checkbox()).click(),
      saveAndClose.click()
    ]);
  },

  verifyPageAfterSelectingMembers(memberCount) {
    cy.expect(Modal().absent());
    cy.get('[class^="NavListItem"]').then((items) => {
      const textArray = items.get().map((el) => el.innerText);
      const sortedArray = [...textArray].sort((a, b) => a - b);
      expect(sortedArray).to.eql(textArray);
    });
    this.waitLoading();
    cy.expect([
      HTML(`${memberCount} members selected`).exists(),
      selectMembersButton.has({ disabled: false }),
      HTML('Choose settings').exists()
    ]);
  },

  chooseSettingsItem(item) {
    cy.do([
      NavListItem(item).click(),
      HTML('Choose settings').absent(),
      Pane(item).exists()
    ]);
  },

  chooseUsersItem(item) {
    cy.do([
      NavListItem(item).click(),
      Pane(item).exists(),
      HTML(including(item, { class: 'headline' })).exists(),
    ]);
    [
      'Name',
      'Code',
      'Last updated',
      '# of Users',
      'Member libraries',
      'Actions'
    ].forEach((header) => {
      cy.expect(MultiColumnListHeader(header).exists());
    });
  },
};
