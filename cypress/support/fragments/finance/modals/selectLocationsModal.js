import {
  Accordion,
  Button,
  Checkbox,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  PaneHeader,
  SearchField,
  Section,
  Selection,
  SelectionList,
  including,
} from '../../../../../interactors';
import {
  AFFILIATION_LABEL,
  ARIA_LABELS,
  COMMON_BUTTON_LABELS,
  GENERIC_FIELDS_LABELS,
  SEARCH_AND_FILTER_PANE_TITLE,
  TENANT_LOCATION_ENTITY_LABELS,
} from '../../../constants';
import FiltersPane from '../../filtersPane';
import MCLHelper from '../../multiColumnList';

const { CAMPUS, INSTITUTION, LIBRARY, LOCATIONS } = TENANT_LOCATION_ENTITY_LABELS;

export const LOCATION_ASSIGNMENT_STATUSES = {
  ASSIGNED: 'Assigned',
  UNASSIGNED: 'Unassigned',
};

const NAME_COLUMN = GENERIC_FIELDS_LABELS.NAME;
const LOCATION_ASSIGNMENT_STATUS = 'Location assignment status';
const MULTI_SELECT_FILTERS = [INSTITUTION, CAMPUS, LIBRARY];
const MODAL_LABEL = 'Select locations';
const LOCATION_STATUS_LABEL = 'Location status';
const TOTAL_RECORDS_SUFFIX = 'records found';
const LOCATION_COLUMNS = [
  '', // checkbox column
  NAME_COLUMN,
  GENERIC_FIELDS_LABELS.CODE,
  INSTITUTION,
  CAMPUS,
  LIBRARY,
  LOCATION_STATUS_LABEL,
  LOCATION_ASSIGNMENT_STATUS,
];

const selectLocationsModal = Modal(MODAL_LABEL);
const filtersPane = selectLocationsModal.find(Section({ title: SEARCH_AND_FILTER_PANE_TITLE }));
const locationsList = selectLocationsModal.find(MultiColumnList());
const affiliationSelection = filtersPane.find(Selection(AFFILIATION_LABEL));
const searchField = filtersPane.find(SearchField({ id: 'input-record-search' }));
const searchButton = filtersPane.find(Button(COMMON_BUTTON_LABELS.SEARCH));
const closeButton = selectLocationsModal.find(Button(COMMON_BUTTON_LABELS.CLOSE));

const getLocationRow = (locationName) => {
  return locationsList.find(
    MultiColumnListRow({ content: including(locationName), isContainer: true }),
  );
};

const ascendingStringsSortFn = (a, b) => a.localeCompare(b);
const getSelectedRecordsMessage = (count) => `Total selected: ${count}`;

export default {
  // affiliationName: tenant selected by default; omit when the Affiliation dropdown must be absent
  assertModalElements({ affiliationName } = {}) {
    cy.expect([
      affiliationName
        ? affiliationSelection.has({ value: including(affiliationName) })
        : affiliationSelection.absent(),

      searchField.has({ value: '' }),
      searchButton.has({ disabled: true }),

      ...[...MULTI_SELECT_FILTERS, LOCATION_ASSIGNMENT_STATUS].map((filterLabel) => {
        return filtersPane.find(Accordion(filterLabel)).has({ open: true });
      }),

      selectLocationsModal
        .find(PaneHeader({ title: LOCATIONS }))
        .has({ subtitle: including(TOTAL_RECORDS_SUFFIX) }),
      selectLocationsModal.find(Button(COMMON_BUTTON_LABELS.ACTIONS)).has({ disabled: false }),
      this.assertSelectedRecordsCount(0),
      selectLocationsModal.find(Button(COMMON_BUTTON_LABELS.SAVE)).has({ disabled: false }),
      selectLocationsModal.find(Button(COMMON_BUTTON_LABELS.PREVIOUS)).absent(),
      selectLocationsModal.find(Button(COMMON_BUTTON_LABELS.NEXT)).absent(),

      closeButton.has({ disabled: false }),
    ]);

    FiltersPane.assertResetAllButtonState(filtersPane, { disabled: true });
    MULTI_SELECT_FILTERS.forEach((filterLabel) => {
      FiltersPane.assertMultiSelectFilterValues(filtersPane, filterLabel, [], {
        expandAccordion: false,
      });
    });
    FiltersPane.assertCheckboxFilterValues(
      filtersPane,
      LOCATION_ASSIGNMENT_STATUS,
      Object.values(LOCATION_ASSIGNMENT_STATUSES),
      { checked: false, expandAccordion: false },
    );

    MCLHelper.assertColumns(locationsList, LOCATION_COLUMNS);
    cy.do(locationsList.scrollHeaderIntoView(NAME_COLUMN));
    cy.expect(locationsList.find(Checkbox({ ariaLabel: ARIA_LABELS.SELECT_ALL })).exists());
  },

  /* <--- Only for active central ordering setting ---> */
  assertAffiliationOptions(tenantNames) {
    cy.do(affiliationSelection.open());
    cy.then(() => SelectionList().optionList()).then((options) => {
      expect([...options].sort(ascendingStringsSortFn)).to.deep.equal(
        [...tenantNames].sort(ascendingStringsSortFn),
      );
    });
    cy.do(affiliationSelection.toggle());
  },

  assertSelectedAffiliation(tenantName) {
    cy.expect(affiliationSelection.has({ value: including(tenantName) }));
  },

  selectAffiliation(tenantName) {
    cy.do(affiliationSelection.choose(tenantName));
    this.assertSelectedAffiliation(tenantName);
  },
  /* <----------> */

  // Search narrows the shared-tenant list so the test-specific location row is rendered
  searchLocation(locationName) {
    cy.do([searchField.fillIn(locationName), searchButton.click()]);
    cy.expect(getLocationRow(locationName).exists());
  },

  toggleLocationCheckbox(locationName) {
    cy.do(locationsList.scrollHeaderIntoView(NAME_COLUMN));
    cy.do(getLocationRow(locationName).find(Checkbox()).click());
  },

  assertLocationChecked(locationName, checked) {
    cy.do(locationsList.scrollHeaderIntoView(NAME_COLUMN));
    cy.expect(getLocationRow(locationName).find(Checkbox()).has({ checked }));
  },

  assertLocationAssignmentStatus(locationName, status) {
    cy.do(locationsList.scrollHeaderIntoView(LOCATION_ASSIGNMENT_STATUS));
    cy.expect(
      getLocationRow(locationName)
        .find(MultiColumnListCell({ column: LOCATION_ASSIGNMENT_STATUS }))
        .has({ content: status }),
    );
  },

  assertSelectedRecordsCount(count) {
    cy.expect(selectLocationsModal.has({ footer: including(getSelectedRecordsMessage(count)) }));
  },

  clickClose() {
    cy.do(closeButton.click());
    cy.expect(selectLocationsModal.absent());
  },

  filterByMultiSelectOptions(filterLabel, values, options) {
    FiltersPane.filterByMultiSelectOptions(filtersPane, filterLabel, values, options);
  },

  filterByAssignmentStatus(status) {
    FiltersPane.filterByCheckboxes(filtersPane, LOCATION_ASSIGNMENT_STATUS, [status]);
  },

  filterByInstitutions(values) {
    this.filterByMultiSelectOptions(INSTITUTION, values, { filterByLabel: true });
  },

  filterByCampuses(values) {
    this.filterByMultiSelectOptions(CAMPUS, values, { filterByLabel: true });
  },

  filterByLibraries(values) {
    this.filterByMultiSelectOptions(LIBRARY, values, { filterByLabel: true });
  },
};
