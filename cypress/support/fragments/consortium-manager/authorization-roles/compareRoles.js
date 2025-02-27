import {
  Button,
  Checkbox,
  Pane,
  MultiColumnListCell,
  HTML,
  SelectionOption,
} from '../../../../../interactors';
import AuthorizationRoles from '../../settings/authorization-roles/authorizationRoles';

const compareRolesButton = Button('Compare roles');
const compareRolesMainPane = Pane('Compare roles');
const compareRolesSubPane = (paneIndex) => compareRolesMainPane.find(Pane({ index: paneIndex }));
const selectMemberDropdown = Button({ id: 'memberSelect' });
const selectRoleDropdown = Button({ name: 'authorization-role' });
const noCapabilitiesFoundText = 'No capabilities found';
const noCapabilitySetsFoundText = 'No capability sets found';
const actionsButton = Button('Actions');

export default {
  clickCompareRoles: () => {
    cy.do([actionsButton.click(), compareRolesButton.click()]);
    [compareRolesSubPane(0), compareRolesSubPane(1)].forEach((pane) => {
      cy.expect([
        pane.find(selectMemberDropdown).exists(),
        pane.find(selectRoleDropdown).has({ disabled: true }),
        pane.find(AuthorizationRoles.capabilitiesAccordion).has({ open: false }),
        pane.find(AuthorizationRoles.capabilitySetsAccordion).has({ open: false }),
      ]);
    });
  },

  checkAvailableTenants: (memberNamesArray, paneIndex = 0) => {
    const currentPane = compareRolesSubPane(paneIndex);
    cy.do(currentPane.find(selectMemberDropdown).click());
    memberNamesArray.forEach((memberName) => {
      cy.expect(currentPane.find(SelectionOption(memberName)).exists());
    });
    cy.do(currentPane.find(selectMemberDropdown).click());
    cy.expect(currentPane.find(SelectionOption()).absent());
  },

  selectMember: (memberName, paneIndex = 0) => {
    const currentPane = compareRolesSubPane(paneIndex);
    cy.do([
      currentPane.find(selectMemberDropdown).click(),
      currentPane.find(SelectionOption(memberName)).click(),
    ]);
    cy.wait(3000);
    cy.expect(currentPane.find(selectMemberDropdown).has({ text: `Select control${memberName}` }));
  },

  selectRole: (roleName, paneIndex = 0) => {
    const currentPane = compareRolesSubPane(paneIndex);
    cy.do([
      currentPane.find(selectRoleDropdown).click(),
      currentPane.find(SelectionOption(roleName)).click(),
    ]);
    cy.wait(3000);
    cy.expect([
      currentPane.find(selectRoleDropdown).has({ text: `Select control${roleName}` }),
      currentPane.find(AuthorizationRoles.capabilitiesAccordion).has({ open: true }),
      currentPane.find(AuthorizationRoles.capabilitySetsAccordion).has({ open: true }),
    ]);
  },

  checkCapability: (
    { table, resource, action },
    isSelected = true,
    isHighlighted = false,
    paneIndex = 0,
  ) => {
    const currentPane = compareRolesSubPane(paneIndex);
    const targetCheckbox = currentPane
      .find(AuthorizationRoles.capabilitiesAccordion)
      .find(AuthorizationRoles.capabilityTables[table])
      .find(Checkbox({ ariaLabel: `${action} ${resource}`, isWrapper: false }));
    cy.expect(targetCheckbox.has({ checked: isSelected }));
    const highlightedValue = currentPane
      .find(AuthorizationRoles.capabilitiesAccordion)
      .find(AuthorizationRoles.capabilityTables[table])
      .find(MultiColumnListCell({ innerHTML: `<mark>${resource}</mark>` }));
    if (isHighlighted) cy.expect(highlightedValue.exists());
    else cy.expect(highlightedValue.absent());
  },

  checkCapabilitySet: (
    { table, resource, action },
    isSelected = true,
    isHighlighted = false,
    paneIndex = 0,
  ) => {
    const currentPane = compareRolesSubPane(paneIndex);
    const targetCheckbox = currentPane
      .find(AuthorizationRoles.capabilitySetsAccordion)
      .find(AuthorizationRoles.capabilityTables[table])
      .find(Checkbox({ ariaLabel: `${action} ${resource}`, isWrapper: false }));
    cy.expect(targetCheckbox.has({ checked: isSelected }));
    cy.expect(
      currentPane
        .find(AuthorizationRoles.capabilitySetsAccordion)
        .find(AuthorizationRoles.capabilityTables[table])
        .find(MultiColumnListCell({ innerHTML: `<mark>${resource}</mark>` }))
        .is({ visible: isHighlighted }),
    );
  },

  verifyNoCapabilitiesFound: (paneIndex = 0) => {
    const currentPane = compareRolesSubPane(paneIndex);
    cy.expect(
      currentPane
        .find(AuthorizationRoles.capabilitiesAccordion)
        .find(HTML(noCapabilitiesFoundText))
        .exists(),
    );
  },

  verifyNoCapabilitySetsFound: (paneIndex = 0) => {
    const currentPane = compareRolesSubPane(paneIndex);
    cy.expect(
      currentPane
        .find(AuthorizationRoles.capabilitySetsAccordion)
        .find(HTML(noCapabilitySetsFoundText))
        .exists(),
    );
  },
};
