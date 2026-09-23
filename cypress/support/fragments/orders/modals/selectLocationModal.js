import {
  Button,
  Checkbox,
  including,
  Modal,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  TextField,
} from '../../../../../interactors';
import { COMMON_BUTTON_LABELS, DEFAULT_WAIT_TIME } from '../../../constants';

const selectLocationModal = Modal(including('Select location'));
const institutionMultiSelect = selectLocationModal.find(MultiSelect({ id: 'institutions-filter' }));
const campusMultiSelect = selectLocationModal.find(MultiSelect({ id: 'campuses-filter' }));
const libraryMultiSelect = selectLocationModal.find(MultiSelect({ id: 'libraries-filter' }));
const resetAllButton = selectLocationModal.find(Button(COMMON_BUTTON_LABELS.RESET_ALL));
const saveButton = selectLocationModal.find(Button(COMMON_BUTTON_LABELS.SAVE));
const searchInput = selectLocationModal.find(TextField({ id: 'input-record-search' }));
const searchButton = selectLocationModal.find(Button(COMMON_BUTTON_LABELS.SEARCH));
const closeButton = selectLocationModal.find(Button({ icon: 'times' }));

export default {
  waitLoading(ms = DEFAULT_WAIT_TIME) {
    cy.wait(ms);
    cy.expect(selectLocationModal.exists());
  },
  verifyModalView() {
    cy.expect(selectLocationModal.exists());
  },
  selectLocation(locationSearchValue, { multiselect = false } = {}) {
    this.searchLocation(locationSearchValue);

    if (multiselect) {
      cy.expect(saveButton.has({ disabled: false, visible: true }));
      cy.do([
        selectLocationModal
          .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
          .find(Checkbox())
          .checkIfNotSelected(),
        saveButton.click(),
      ]);
    } else {
      cy.do(
        selectLocationModal
          .find(MultiColumnListCell({ content: locationSearchValue, row: 0, columnIndex: 0 }))
          .click(),
      );
    }
  },
  searchLocation(locationSearchValue) {
    cy.do([searchInput.fillIn(locationSearchValue), searchButton.click()]);

    cy.expect(resetAllButton.has({ disabled: !locationSearchValue }));
    cy.expect(
      selectLocationModal
        .find(
          MultiColumnListRow({
            indexRow: 'row-0',
            content: including(locationSearchValue),
          }),
        )
        .exists(),
    );
  },
  selectLocationByHierarchy({ institution, campus, library, location }) {
    cy.do(institutionMultiSelect.choose(including(institution)));
    cy.do(campusMultiSelect.choose(including(campus)));
    cy.do(libraryMultiSelect.choose(including(library)));

    const locationRow = selectLocationModal.find(
      MultiColumnListRow({ content: including(location), isContainer: false }),
    );

    cy.expect(locationRow.exists());
    cy.do(locationRow.find(Checkbox()).checkIfNotSelected());
    cy.expect(saveButton.has({ disabled: false }));
    cy.do(saveButton.click());
    cy.expect(selectLocationModal.absent());
  },

  closeModal() {
    cy.do(closeButton.click());
    cy.expect(selectLocationModal.absent());
  },

  selectMultipleLocations(locationSearchValues = []) {
    locationSearchValues.forEach((locationSearchValue) => {
      this.searchLocation(locationSearchValue);

      cy.do(
        selectLocationModal
          .find(MultiColumnListCell({ row: 0, columnIndex: 0 }))
          .find(Checkbox())
          .checkIfNotSelected(),
      );
    });
    cy.do(saveButton.click());
  },
};
