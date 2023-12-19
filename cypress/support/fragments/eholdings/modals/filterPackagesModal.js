import { Button, Modal, MultiSelect, RadioButton, Section } from '../../../../../interactors';

const packageFilterModal = Modal({ id: 'package-filter-modal' });
const packageFilterSelect = packageFilterModal.find(MultiSelect({ id: 'packageFilterSelect' }));
const selectionStatusSection = packageFilterModal.find(Section({ id: 'filter-packages-selected' }));
const resetAllButton = packageFilterModal.find(Button('Reset all'));
const searchButton = packageFilterModal.find(Button('Search'));

export default {
  waitLoading() {
    cy.expect(packageFilterModal.exists());
  },
  verifyModalView() {
    cy.expect([
      packageFilterModal.has({ header: 'Filter packages' }),
      packageFilterSelect.exists(),
      selectionStatusSection.exists(),
      resetAllButton.has({ disabled: false, visible: true }),
      searchButton.has({ disabled: false, visible: true }),
    ]);
  },
  selectPackageName(packageName) {
    cy.do(packageFilterSelect.select(packageName));
  },
  selectPackageStatus(selectionStatus) {
    cy.do(selectionStatusSection.find(RadioButton(selectionStatus)).click());
  },
  clickResetAllButton() {
    cy.do(resetAllButton.click());
    cy.expect(packageFilterModal.absent());
  },
  clickSearchButton() {
    cy.do(searchButton.click());
    cy.expect(packageFilterModal.absent());

    // wait search filter to be applied
    cy.wait(2000);
  },
};
