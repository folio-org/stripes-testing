import { HTML, including } from '@interactors/html';
import { Accordion,
  Button,
  Pane,
  MultiSelect,
  ValueChipRoot,
  MultiColumnList,
  MultiColumnListCell,
  MultiSelectOption } from '../../../../../interactors';

const viewPane = Pane({ id:'view-job-profile-pane' });
const resultsPane = Pane({ id:'pane-results' });
const actionsButton = Button('Actions');

export default {
  edit:() => {
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Edit').click());
  },

  addExistingTag:(tag) => {
    cy.intercept({
      method: 'GET',
      url: '/tags?limit=10000',
    }).as('getTags');
    cy.do(Accordion({ id:'tag-accordion' }).clickHeader());
    cy.wait('@getTags');
    cy.expect(MultiSelect({ id:'input-tag' }).exists());
    cy.do(MultiSelect({ id:'input-tag' }).choose(tag));
  },

  addNewTag:(newTag) => {
    cy.expect(MultiSelect({ id:'input-tag' }).exists());
    cy.get('#input-tag-input').type(newTag);
    cy.expect(MultiSelectOption(including('Add tag for:')).exists());
    cy.do(MultiSelectOption(including('Add tag for:')).click());
  },

  removeTag:(tag) => {
    cy.do(ValueChipRoot(tag).find(Button({ icon: 'times' })).click());
    cy.expect(ValueChipRoot(tag).absent());
  },

  verifyJobProfileOpened:() => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },
  verifyAssignedTags:(tag, quantityOfTags = 1) => {
    cy.expect(MultiSelect({ selectedCount: quantityOfTags }).exists());
    cy.expect(ValueChipRoot(tag).exists());
    cy.expect(Pane({ id:'pane-results' })
      .find(MultiColumnList({ id: 'job-profiles-list' }))
      .find(MultiColumnListCell({ row: 0, columnIndex: 2, content: including(tag) }))
      .exists());
  },
  verifyAssignedTagsIsAbsent:(tag, quantityOfTags = 1) => {
    cy.expect(MultiSelect({ selectedCount: quantityOfTags }).exists());
    cy.expect(ValueChipRoot(tag).absent());
    cy.expect(Pane({ id:'pane-results' })
      .find(MultiColumnList({ id: 'job-profiles-list' }))
      .find(MultiColumnListCell({ row: 0, columnIndex: 2, content: including(tag) }))
      .absent());
  },

  verifyJobProfileName:(profileName) => cy.expect(viewPane.find(HTML(including(profileName))).exists()),
  verifyActionMenuAbsent:() => cy.expect(viewPane.find(actionsButton).absent())
};
