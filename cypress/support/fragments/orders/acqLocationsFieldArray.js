import {
  ACQ_LOCATION_FIELD_NAMES,
  AcqLocationsFieldArray,
  RepeatableFieldItem,
  Selection,
  SelectionList,
  SelectionOption,
  TextField,
  including,
} from '../../../../interactors';
import { DEFAULT_WAIT_TIME } from '../../constants';

const locationsFieldArray = AcqLocationsFieldArray();

/**
 * Common high-level interface for acquisitions forms that render a Location field array.
 * Compose it into a form fragment in the same way as MultiYearPaymentTerms.
 */
export default {
  assertLocationRowCount(rowCount) {
    cy.expect(locationsFieldArray.has({ rowCount }));
  },

  assertEmptyLocationRow({ rowIndex = 0 } = {}) {
    const row = locationsFieldArray.find(RepeatableFieldItem({ index: rowIndex }));

    cy.expect([
      row.find(Selection({ name: ACQ_LOCATION_FIELD_NAMES.ID(rowIndex) })).exists(),
      row.find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_PHYSICAL(rowIndex) })).exists(),
      row
        .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_ELECTRONIC(rowIndex) }))
        .exists(),
    ]);
  },

  assertSelectedLocation({ locationName, locationCode, rowIndex = 0 }) {
    cy.expect(
      locationsFieldArray
        .find(RepeatableFieldItem({ index: rowIndex }))
        .find(Selection({ name: ACQ_LOCATION_FIELD_NAMES.ID(rowIndex) }))
        .has({ singleValue: including(`${locationName} (${locationCode})`) }),
    );
  },

  assertLocationOptions(expectedLocations) {
    cy.then(() => SelectionList().optionList()).then((actualOptions) => {
      expect([...actualOptions].sort()).to.deep.equal(
        [...expectedLocations].sort(),
        `Expected locations: ${JSON.stringify(expectedLocations)}, but got: ${JSON.stringify(actualOptions)}`,
      );
    });
  },

  addLocationRow() {
    cy.do(locationsFieldArray.addRow());
  },

  removeLocationRow(rowIndex = 0) {
    cy.do(locationsFieldArray.removeRow(rowIndex));
    cy.wait(DEFAULT_WAIT_TIME / 4);
  },

  openLocationSelector(rowIndex = 0) {
    cy.do([
      locationsFieldArray.scrollRowIntoView(rowIndex),
      locationsFieldArray.openLocationSelector(rowIndex),
    ]);
    cy.wait(DEFAULT_WAIT_TIME);
  },

  closeLocationSelector() {
    // Selection options are rendered in a portal. An outside click on the owning field array
    // closes the list without selecting an option or changing the current row value.
    cy.do(locationsFieldArray.click());
    cy.expect(SelectionList().absent());
  },

  selectLocationFromOpenDropdown(locationName) {
    cy.do([SelectionList().filter(locationName), SelectionOption(including(locationName)).click()]);
    cy.wait(DEFAULT_WAIT_TIME);
  },

  selectLocation({ locationName, rowIndex = 0 }) {
    this.openLocationSelector(rowIndex);
    this.selectLocationFromOpenDropdown(locationName);
  },

  fillPhysicalLocationQuantity({ value, rowIndex = 0 }) {
    cy.do([
      locationsFieldArray.scrollRowIntoView(rowIndex),
      locationsFieldArray.focusPhysicalQuantity(rowIndex),
      locationsFieldArray.resetPhysicalQuantity(rowIndex),
      locationsFieldArray.fillPhysicalQuantity({ index: rowIndex, value }),
      locationsFieldArray.blurPhysicalQuantity(rowIndex),
    ]);
    cy.expect(
      locationsFieldArray
        .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_PHYSICAL(rowIndex) }))
        .has({ value: String(value) }),
    );
  },

  fillElectronicLocationQuantity({ value, rowIndex = 0 }) {
    cy.do([
      locationsFieldArray.scrollRowIntoView(rowIndex),
      locationsFieldArray.focusElectronicQuantity(rowIndex),
      locationsFieldArray.resetElectronicQuantity(rowIndex),
      locationsFieldArray.fillElectronicQuantity({ index: rowIndex, value }),
      locationsFieldArray.blurElectronicQuantity(rowIndex),
    ]);
    cy.expect(
      locationsFieldArray
        .find(TextField({ name: ACQ_LOCATION_FIELD_NAMES.QUANTITY_ELECTRONIC(rowIndex) }))
        .has({ value: String(value) }),
    );
  },
};
