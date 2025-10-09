import { including } from '@interactors/html';
import {
  Modal,
  Button,
  TextField,
  MultiColumnListRow,
  MultiColumnListCell,
  HTML,
  PaneHeader,
  MultiColumnListHeader,
} from '../../../../interactors';
import DateTools from '../../utils/dateTools';

const getModal = (recordType) => Modal(including(`Select ${recordType} bulk edit profile`));
const closeButton = Button({ icon: 'times' });
const searchField = TextField('Search bulk edit profiles');
const profilesList = HTML({ className: including('profilesList-') });

const verifyTextColumnSorted = (selector, sortOrder, columnName) => {
  cy.get(selector).then(($elements) => {
    const textValues = Array.from($elements).map((el) => el.textContent.trim());

    const sortedValues = [...textValues].sort((a, b) => {
      if (sortOrder === 'ascending') {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      } else {
        return b.localeCompare(a, undefined, { sensitivity: 'base' });
      }
    });

    expect(textValues).to.deep.equal(
      sortedValues,
      `${columnName} should be sorted in ${sortOrder} order`,
    );
  });
};

export default {
  waitLoading(recordType = 'items') {
    const modal = getModal(recordType);

    cy.expect(modal.exists());
  },

  verifyProfilesFoundText() {
    cy.get('div[class^=modal] [class^=mclRow-]').then(($rows) => {
      const actualCount = $rows.length;

      cy.getBulkEditProfile().then((profiles) => {
        const totalRecords = profiles.totalRecords;

        expect(actualCount).to.equal(
          totalRecords,
          `Number of profiles displayed (${actualCount}) should match totalRecords value (${totalRecords}) from the Settings`,
        );
      });
      cy.expect(
        Modal()
          .find(PaneHeader())
          .has({
            subtitle: `${actualCount} profile${actualCount !== 1 ? 's' : ''} found`,
          }),
      );
    });
  },

  verifyAllModalElements() {
    cy.expect([
      Modal().find(searchField).exists(),
      Modal().find(closeButton).has({ disabled: false }),
      Modal().find(profilesList).exists(),
    ]);
    this.verifyProfilesFoundText();
  },

  selectProfile(profileName) {
    cy.do(
      profilesList.find(MultiColumnListRow(including(profileName), { isContainer: false })).click(),
    );
  },

  verifyProfileInTable(name, description, userObject) {
    const targetProfileRow = Modal()
      .find(profilesList)
      .find(MultiColumnListRow({ content: including(name), isContainer: false }));

    cy.expect([
      targetProfileRow
        .find(MultiColumnListCell({ column: 'Name' }))
        .has({ content: including(name) }),
      targetProfileRow
        .find(MultiColumnListCell({ column: 'Description' }))
        .has({ content: description }),
      targetProfileRow.find(MultiColumnListCell({ column: 'Updated' })).has({
        content: DateTools.getFormattedDateWithSlashes({
          date: new Date(),
        }),
      }),
      targetProfileRow.find(MultiColumnListCell({ column: 'Updated by' })).has({
        content: including(
          `${userObject.personal.lastName}, ${userObject.personal.firstName} ${userObject.personal.middleName || ''}`.trim(),
        ),
      }),
    ]);
  },

  verifyProfileAbsentInTable(profileName) {
    cy.expect(profilesList.find(MultiColumnListRow(including(profileName))).absent());
  },

  verifyProfilesSortedByName(sortOrder = 'ascending') {
    cy.expect(MultiColumnListHeader({ id: 'list-column-name' }).has({ sort: sortOrder }));
    verifyTextColumnSorted(
      'div[class^="profilesList-"] [data-row-index] [class^="mclCell-"]:first-child [class^="label-"]',
      sortOrder,
      'Profile names',
    );
  },

  verifyProfilesSortedByUpdatedBy(sortOrder = 'ascending') {
    cy.expect(MultiColumnListHeader({ id: 'list-column-updatedby' }).has({ sort: sortOrder }));
    verifyTextColumnSorted(
      'div[class^="profilesList-"] [data-row-index] [class^="mclCell-"]:nth-child(4) [class^="label-"]',
      sortOrder,
      'Updated by names',
    );
  },

  verifyProfilesSortedByUpdatedDate(sortOrder = 'ascending') {
    cy.expect(MultiColumnListHeader({ id: 'list-column-updateddate' }).has({ sort: sortOrder }));

    cy.get(
      'div[class^="profilesList-"] [data-row-index] [class^="mclCell-"]:nth-child(3) [class^="label-"]',
    ).then(($elements) => {
      const updatedDates = Array.from($elements).map((el) => el.textContent.trim());

      const sortedDates = [...updatedDates].sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);

        if (sortOrder === 'ascending') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });

      expect(updatedDates).to.deep.equal(
        sortedDates,
        `Updated dates should be sorted in ${sortOrder} order`,
      );
    });
  },

  changeSortOrderByName() {
    cy.do(Button({ id: 'clickable-list-column-name' }).click());
    cy.wait(1000);
  },

  changeSortOrderByUpdatedDate() {
    cy.do(Button({ id: 'clickable-list-column-updateddate' }).click());
    cy.wait(1000);
  },

  changeSortOrderByUpdatedBy() {
    cy.do(Button({ id: 'clickable-list-column-updatedby' }).click());
    cy.wait(1000);
  },

  searchProfile(profileName) {
    cy.do(searchField.fillIn(profileName));
    cy.expect(searchField.has({ value: profileName }));
    cy.wait(1000);
  },

  verifyModalClosed(recordType) {
    const modal = getModal(recordType);

    cy.expect(modal.absent());
  },
};
