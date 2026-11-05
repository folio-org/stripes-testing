// =================================================================
// Common functions for the "Tags" pane opened from a record details pane
// ("Show tags" icon at the top right of the pane).
// Functions that work with the "Show tags" icon accept a `detailsPane` interactor
// scoped to the record details pane, e.g. Pane({ id: 'pane-invoiceDetails' }).
// =================================================================

import {
  and,
  Badge,
  Button,
  including,
  MultiSelect,
  MultiSelectMenu,
  MultiSelectOption,
  Pane,
  PaneHeader,
  ValueChipRoot,
} from '../../../interactors';

const tagsPane = Pane('Tags');
const tagsMultiSelect = tagsPane.find(MultiSelect({ id: 'input-tag' }));
const showTagsButton = (detailsPane) => detailsPane.find(Button({ id: 'clickable-show-tags' }));
const addTagOption = (tagName) => MultiSelectMenu().find(MultiSelectOption(and(including('Add tag for:'), including(tagName))));

export default {
  openTagsPane(detailsPane) {
    cy.do(showTagsButton(detailsPane).click());
    cy.expect(tagsPane.exists());
  },

  closeTagsPane() {
    cy.do(
      tagsPane
        .find(PaneHeader())
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.expect(tagsPane.absent());
  },

  verifyTagsCount(detailsPane, count) {
    cy.expect(
      showTagsButton(detailsPane)
        .find(Badge())
        .has({ value: String(count) }),
    );
  },

  verifyTagsPaneElements(count = 0, tags = []) {
    cy.expect([
      tagsPane.has({ subtitle: count === 1 ? '1 Tag' : `${count} Tags` }),
      tagsMultiSelect.has({ selectedCount: count }),
      ...tags.map((tag) => tagsMultiSelect.find(ValueChipRoot(tag)).exists()),
    ]);

    if (count === 0) {
      cy.expect(tagsMultiSelect.has({ placeholder: 'Enter a tag.' }));
    }
  },

  fillInTagName(tagName) {
    cy.do([tagsMultiSelect.open(), tagsMultiSelect.filter(tagName)]);
    cy.wait(500);
    cy.do(tagsMultiSelect.open());
  },

  verifyAddTagOptionDisplayed(tagName) {
    cy.expect([tagsMultiSelect.has({ filterValue: tagName }), addTagOption(tagName).exists()]);
  },

  clickAddTagOption(tagName) {
    cy.do(addTagOption(tagName).click());
  },

  selectExistingTag(tagName) {
    cy.do([
      tagsMultiSelect.open(),
      MultiSelectMenu().find(MultiSelectOption(tagName)).clickSegment(),
    ]);
  },

  verifyTagOptionSelected(tagName) {
    cy.expect(MultiSelectMenu().find(MultiSelectOption(tagName)).has({ selected: true }));
  },

  closeTagsDropdown() {
    cy.do(tagsMultiSelect.close());
  },
};
