import {
  Button,
  Modal,
  TextField,
  including,
  HTML,
  Pane,
  Checkbox,
  ListRow,
  SelectionOption,
} from '../../../../../interactors';
import textField from '../../../../../interactors/text-field';
import ConsortiumManagerApp from '../consortiumManagerApp';

const selectMembersModal = Modal({ id: 'find-consortium-member-modal' });
const searchAndFilterPane = selectMembersModal.find(
  Pane({ id: 'find-consortium-member-filters-pane' }),
);
const membersPane = selectMembersModal.find(Pane('Members'));
const selectAllCheckbox = Checkbox({ ariaLabel: 'Select all members' });
const searchButton = searchAndFilterPane.find(Button('Search'));
const resetAllButton = searchAndFilterPane.find(Button('Reset all'));
const closeButton = selectMembersModal.find(
  Button({ id: 'find-consortium-member-modal-close-button' }),
);
const saveButton = selectMembersModal.find(Button('Save & close'));
const cancelButton = selectMembersModal.find(Button('Cancel'));

const alertText = 'Settings for the following selected members can be modified at the same time.';

export default {
  waitLoading() {
    cy.expect([selectMembersModal.exists(), searchAndFilterPane.exists(), membersPane.exists()]);
  },

  verifyInitialStatusOfSearchAndFilterPane() {
    cy.expect([
      searchAndFilterPane.find(TextField({ id: 'input-record-search' })).exists(),
      searchButton.is({ disabled: true }),
      resetAllButton.is({ disabled: true }),
    ]);
  },

  verifyAvailableTenants(tenantsList) {
    cy.get('#find-consortium-member-modal div[class^="mclRowFormatterContainer"]').then(
      ($elements) => {
        const availableTenants = [];
        cy.wrap($elements).each(($el) => {
          availableTenants.push($el.text());
        });
        if (tenantsList) {
          tenantsList.forEach((tenant) => {
            cy.wrap(availableTenants).should('include', tenant);
          });
          // cy.wrap(availableTenants).should('deep.equal', tenantsList);
        } else {
          // if there is no tenantsList then we check the alphabetical order
          cy.wrap(availableTenants).should('deep.equal', availableTenants.sort());
        }
      },
    );
  },

  verifyMembersFound(count) {
    cy.expect(
      Pane({
        subtitle: including(
          `${
            count === undefined ? '' : count === 1 ? `${count} member` : `${count} members`
          } found`,
        ),
      }).exists(),
    );
  },

  verifyInitialStatusOfMembersPane(count) {
    this.verifyMembersFound(count);
    cy.expect([
      membersPane.find(HTML(alertText)).exists(),
      membersPane.find(HTML('End of list')).exists(),
    ]);
    this.verifyAvailableTenants();
  },

  verifyTotalSelected(count = '') {
    cy.expect(selectMembersModal.has({ footer: including(`Total selected: ${count}`) }));
  },

  verifyModalCloseButtonEnabled() {
    cy.expect(closeButton.is({ disabled: false }));
  },

  verifyModalSaveButtonEnabled() {
    cy.expect(saveButton.is({ disabled: false }));
  },

  verifyModalCancelButtonEnabled() {
    cy.expect(cancelButton.is({ disabled: false }));
  },

  verifySelectAllIsChecked() {
    cy.expect(membersPane.find(selectAllCheckbox).has({ checked: true }));
  },

  verifyMemberIsSelected(member, status) {
    cy.expect(selectMembersModal.find(ListRow(member)).find(Checkbox()).is({ checked: status }));
  },

  changeSelectAllCheckbox(status) {
    cy.get('[aria-label="Select all members"]')
      .invoke('is', ':checked')
      .then((checked) => {
        if (checked && status === 'uncheck') {
          cy.do(selectAllCheckbox.click());
        } else if (!checked && status === 'check') {
          cy.do(selectAllCheckbox.click());
        }
      });
  },

  selectMembers(...members) {
    members.forEach((member) => {
      cy.do(selectMembersModal.find(ListRow(member)).find(Checkbox()).click());
      cy.wait(500);
    });
  },

  selectAllMembers() {
    ConsortiumManagerApp.clickSelectMembers();
    cy.wait(2000);
    this.changeSelectAllCheckbox('check');
    cy.wait(2000);
    this.saveAndClose();
  },

  searchTenant(tenant) {
    cy.do([
      searchAndFilterPane.find(textField({ id: 'input-record-search' })).fillIn(tenant),
      searchButton.click(),
    ]);
  },

  saveAndClose() {
    cy.do(saveButton.click());
    cy.expect(selectMembersModal.absent());
  },

  verifyStatusOfSelectMembersModal(members, total, allMembersSelected) {
    this.waitLoading();
    this.verifyInitialStatusOfSearchAndFilterPane();
    this.verifyInitialStatusOfMembersPane(members);
    if (allMembersSelected) this.verifySelectAllIsChecked();
    this.verifyTotalSelected(total);
    this.verifyModalCloseButtonEnabled();
    this.verifyModalCancelButtonEnabled();
    this.verifyModalSaveButtonEnabled();
  },

  checkMember(tenantName, shouldBeChecked = true) {
    cy.contains('div[class^="mclRow--"]', tenantName).within(() => {
      cy.get('input[type="checkbox"]').then(($checkbox) => {
        const isChecked = $checkbox.prop('checked');
        if (shouldBeChecked && !isChecked) {
          cy.wrap($checkbox).click();
        } else if (!shouldBeChecked && isChecked) {
          cy.wrap($checkbox).click();
        }
      });
    });
  },

  selectMember(memberName) {
    cy.do([
      Button({ id: 'consortium-member-select' }).click(),
      SelectionOption(memberName).click(),
    ]);
    cy.wait(6000);
    cy.get('button#consortium-member-select')
      .invoke('text')
      .then((actualText) => {
        expect(actualText.trim()).to.equal(`Select control${memberName}`);
      });
  },
};
