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

export default {
  waitLoading(recordType = 'items') {
    const modal = getModal(recordType);

    cy.expect(modal.exists());
  },

  verifyProfilesFoundText() {
    let actualCount = 0;
    cy.get('div[class^=modal] [class^=mclRow-]').then(($rows) => {
      actualCount = $rows.length;
    });
    cy.expect(
      PaneHeader.has({
        subtitle: `${actualCount} profile${actualCount !== 1 ? 's' : ''} found`,
      }),
    );
  },

  verifyAllModalElements() {
    cy.expect([
      Modal().find(searchField.exists()),
      Modal().find(closeButton.has({ disabled: false })),
      Modal().find(profilesList.exists()),
    ]);
    this.verifyProfilesFoundText();
  },

  selectProfile(profileName) {
    cy.do(profilesList.find(MultiColumnListRow(including(profileName))).click());
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
          `${userObject.lastName}, ${userObject.firstName} ${userObject.personal.middleName}`,
        ),
      }),
    ]);
  },

  verifyProfileAbsentInTable(profileName) {
    cy.expect(profilesList.find(MultiColumnListRow(including(profileName))).absent());
  },

  verifyProfilesSortedByName(sortOrder = 'ascending') {
    cy.expect(MultiColumnListHeader({ id: 'list-column-name' }).has({ sort: sortOrder }));
  },

  verifyProfilesSortedByUpdatedDate(sortOrder = 'ascending') {
    cy.expect(MultiColumnListHeader({ id: 'list-column-updateddate' }).has({ sort: sortOrder }));
  },

  verifyProfilesSortedByUpdatedBy(sortOrder = 'ascending') {
    cy.expect(MultiColumnListHeader({ id: 'list-column-updatedby' }).has({ sort: sortOrder }));
  },

  changeSortOrderByName() {
    cy.do(Button({ id: 'clickable-list-column-name' }).click());
    cy.wait(500);
  },

  changeSortOrderByUpdatedDate() {
    cy.do(Button({ id: 'clickable-list-column-updateddate' }).click());
    cy.wait(500);
  },

  changeSortOrderByUpdatedBy() {
    cy.do(Button({ id: 'clickable-list-column-updatedby' }).click());
    cy.wait(500);
  },

  searchProfile(profileName) {
    cy.do(searchField.fillIn(profileName));
    cy.expect(searchField.has({ value: profileName }));
    cy.wait(1000);
  },

  verifyModalClosed(recordType = 'items') {
    const modal = getModal(recordType);

    cy.expect(modal.absent());
  },
};
