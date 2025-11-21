import {
  Button,
  IconButton,
  Pane,
  PaneContent,
  Popover,
  NavListItem,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiColumnListHeader,
  MultiSelectOption,
  MultiSelect,
  MultiSelectMenu,
  including,
  ListItem,
} from '../../../../../../interactors';

const classificationBrowseSectionName = 'Classification browse';
const classificationBrowseItem = NavListItem(classificationBrowseSectionName);
const classificationBrowsePane = Pane(classificationBrowseSectionName);
const editButton = Button({ icon: 'edit' });
const cancelButton = Button('Cancel');
const saveButton = Button('Save');
const classificationIdentifierTypesDropdown = MultiSelect({
  label: including('Classification identifier types'),
});
const defaultClassificationBrowseNames = [
  'Classification (all)',
  'Dewey Decimal classification',
  'Library of Congress classification',
];
const defaultClassificationBrowseIdsAlgorithms = [
  { id: 'all', algorithm: 'default' },
  { id: 'dewey', algorithm: 'dewey' },
  { id: 'lc', algorithm: 'lc' },
];
const classificationIdentifierTypesDropdownDefaultOptions = [
  'Additional Dewey',
  'Canadian Classification',
  'Dewey',
  'GDC',
  'LC',
  'LC (local)',
  'National Agricultural Library',
  'NLM',
  'SUDOC',
  'UDC',
];
const tableHeaderTexts = ['Name', 'Classification identifier types', 'Actions'];

export {
  defaultClassificationBrowseNames,
  classificationIdentifierTypesDropdownDefaultOptions,
  defaultClassificationBrowseIdsAlgorithms,
  classificationBrowseSectionName,
};

export default {
  openClassificationBrowse() {
    cy.do(
      PaneContent({ id: 'app-settings-nav-pane-content' })
        .find(NavListItem(classificationBrowseSectionName))
        .click(),
    );
  },

  getTargetRowWithClassificationName(classificationName) {
    return classificationBrowsePane.find(
      MultiColumnListRow({ innerHTML: including(classificationName), isContainer: true }),
    );
  },

  checkClassificationBrowsePaneOpened() {
    cy.expect(classificationBrowsePane.exists());
  },

  checkPositionInNavigationList() {
    cy.do(
      classificationBrowseItem.perform(($element) => {
        cy.get($element).next().should('have.text', 'Classification identifier types');
      }),
    );
  },

  checkClassificationBrowseInTable(name, classificationIdentifierTypes) {
    const targetRow = this.getTargetRowWithClassificationName(name);

    cy.expect([
      targetRow.find(MultiColumnListCell(name)).exists(),
      targetRow.find(MultiColumnListCell(classificationIdentifierTypes)).exists(),
      targetRow.find(editButton).exists(),
    ]);
  },

  checkDefaultClassificationBrowseInTable() {
    defaultClassificationBrowseNames.forEach((defaultClassificationBrowseName) => {
      this.checkClassificationBrowseInTable(defaultClassificationBrowseName, '');
    });
  },

  checkTableHeaders() {
    tableHeaderTexts.forEach((headerText) => {
      cy.expect(classificationBrowsePane.find(MultiColumnListHeader(headerText)).exists());
    });
  },

  checkInfoIconExists() {
    cy.expect(
      classificationBrowsePane
        .find(MultiColumnListHeader('Classification identifier types'))
        .find(IconButton('info'))
        .exists(),
    );
  },

  clickInfoIcon() {
    cy.do(
      classificationBrowsePane
        .find(MultiColumnListHeader('Classification identifier types'))
        .find(IconButton('info'))
        .click(),
    );
  },

  checkPopoverMessage() {
    cy.expect(
      Popover({
        content:
          'Please note that if no classification identifier types are selected for a browse option, this option will display all classification identifier types.',
      }).exists(),
    );
  },

  clickEditButtonInBrowseOption(browseOption) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);

    cy.do(targetRow.find(editButton).click());
  },

  checkEditButtonInBrowseOption(browseOption) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);

    cy.expect(targetRow.find(editButton).exists());
  },

  clickCancelButtonInBrowseOption(browseOption) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);

    cy.do(targetRow.find(cancelButton).click());
  },

  checkClassificationIdentifierTypesExistsInBrowseoption(browseOption) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);

    cy.expect(targetRow.find(classificationIdentifierTypesDropdown).exists());
  },

  checkCancelButtonEnabledInBrowseOption(browseOption, isEnabled = true) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);

    cy.expect(targetRow.find(cancelButton).has({ disabled: !isEnabled }));
  },

  checkSaveButtonEnabledInBrowseOption(browseOption, isEnabled = true) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);

    cy.expect(targetRow.find(saveButton).has({ disabled: !isEnabled }));
  },

  expandClassificationIdentifierTypesDropdownInBrowseOption(browseOption) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);

    cy.do(targetRow.find(classificationIdentifierTypesDropdown).toggle());
    cy.expect(targetRow.find(classificationIdentifierTypesDropdown).has({ open: true }));
  },

  checkClassificationIdentifierTypesDropdownExpanded(browseOption) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);

    cy.expect(targetRow.find(classificationIdentifierTypesDropdown).has({ open: true }));
  },

  checkClassificationIdentifierTypesDropdownOption(dropdownOption, isPresent = true) {
    cy.then(() => MultiSelectMenu().optionList()).then((options) => {
      cy.wrap(options).then(
        (opts) => expect(opts.some((opt) => opt.includes(dropdownOption))).to.be[`${isPresent}`],
      );
    });
  },

  checkClassificationIdentifierTypesDropdownDefaultOptions() {
    cy.then(() => MultiSelectMenu().optionList()).then((options) => {
      classificationIdentifierTypesDropdownDefaultOptions.forEach((defaultOption) => {
        cy.wrap(options).then(
          (opts) => expect(opts.some((opt) => opt.includes(defaultOption))).to.be.true,
        );
      });
    });
  },

  selectClassificationIdentifierTypesDropdownOption(option) {
    cy.wait(500);
    cy.do(MultiSelectMenu().find(MultiSelectOption(option)).clickSegment());
    cy.wait(500);
  },

  /**
   * Selects options from the Classification Identifier Types dropdown.
   * Closes
   *
   * @param {string[]} options - An array of options to be selected from the dropdown.
   * @returns {void}
   */
  selectClassificationIdentifierTypesDropdownOptions(options) {
    cy.do([cy.wait(500), MultiSelect().select(options), cy.wait(500)]);
  },

  checkOptionSelectedInClassificationIdentifierTypesDropdown(browseOption, option) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);

    cy.expect(targetRow.find(MultiSelect({ selected: option })).exists());
  },

  validateClassificationIdentifierTypesSelectedOptions(browseOption, option, isShown = true) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);
    const targetCell = targetRow.find(
      MultiColumnListCell({ column: 'Classification identifier types' }),
    );
    if (isShown) cy.expect(targetCell.find(ListItem({ text: option })).exists());
    else cy.expect(targetCell.find(ListItem({ text: option })).absent());
  },

  clickSaveButtonInBrowseOption(browseOption) {
    const targetRow = this.getTargetRowWithClassificationName(browseOption);
    cy.do(targetRow.find(saveButton).click());
  },

  updateIdentifierTypesAPI(classificationBrowseId, shelvingAlgorithmId, identifierTypeIds) {
    return cy.okapiRequest({
      method: 'PUT',
      path: `browse/config/instance-classification/${classificationBrowseId}`,
      body: {
        id: classificationBrowseId,
        shelvingAlgorithm: shelvingAlgorithmId,
        typeIds: identifierTypeIds,
      },
      isDefaultSearchParamsRequired: false,
    });
  },

  getIdentifierTypesForCertainBrowseAPI(classificationBrowseId) {
    cy.okapiRequest({
      path: 'browse/config/instance-classification',
      isDefaultSearchParamsRequired: false,
    }).then(({ body }) => {
      cy.wrap(body.configs.filter((config) => config.id === classificationBrowseId)[0].typeIds).as(
        'types',
      );
    });
    return cy.get('@types');
  },

  selectClassificationIdentifierType(type, isSelected = true) {
    cy.do(MultiSelect().select(type));
    if (isSelected) cy.expect(MultiSelect().has({ selected: including(type) }));
    else cy.expect(MultiSelect({ selected: including(type) }).absent());
  },
};
