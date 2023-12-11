import uuid from 'uuid';
import TenantPane, { getDefaultTenant } from '../baseTenantPane';
import {
  EditableListRow,
  MultiColumnListCell,
  Link,
  Modal,
  Button,
  including,
} from '../../../../../../interactors';

const deleteModal = Modal({ id: 'delete-controlled-vocab-entry-confirmation' });
const exceptionModal = Modal('Cannot delete library');

export default {
  ...TenantPane,
  waitLoading() {
    TenantPane.waitLoading('Libraries');
  },
  checkResultsTableContent(records) {
    TenantPane.checkResultsTableColumns([
      'Library',
      'Code',
      'Last updated',
      '# of Locations',
      'Actions',
    ]);
    TenantPane.checkResultsTableContent(records);
  },
  checkEmptyTableContent() {
    const messages = [
      'Please select an institution and campus to continue.',
      'There are no Libraries',
    ];
    TenantPane.checkEmptyTableContent(messages);
  },
  getDefaultLibrary({ id, name, campusId } = {}) {
    return getDefaultTenant({ id, name, campusId });
  },
  defaultUiLibraries: {
    body: getDefaultTenant({ campusId: uuid() }),
  },
  getViaApi() {
    return TenantPane.getViaApi({ path: 'location-units/libraries' });
  },
  createViaApi(librariesProperties = getDefaultTenant({ campusId: uuid() })) {
    return TenantPane.createViaApi({
      path: 'location-units/libraries',
      body: librariesProperties,
    });
  },
  deleteViaApi(libraryId) {
    return TenantPane.deleteViaApi({
      path: `location-units/libraries/${libraryId}`,
    });
  },
  checkLocationsColumnInResultsTable(numOfLocationsRecords = [], columnIndex = 3) {
    numOfLocationsRecords.forEach((numOfLocations, index) => {
      cy.expect([
        EditableListRow({ index })
          .find(MultiColumnListCell({ columnIndex, content: numOfLocations }))
          .find(Link())
          .exists(),
      ]);
    });
  },
  clickLocationsColumnLink(rowIndex = 0, columnIndex = 3) {
    cy.do([
      EditableListRow({ index: rowIndex })
        .find(MultiColumnListCell({ columnIndex }))
        .find(Link())
        .click(),
    ]);
  },

  verifyDeleteModal(libraryName) {
    cy.expect(deleteModal.exists());
    cy.expect(
      deleteModal.has({
        content: including(`The library ${libraryName} will be deleted.`),
      }),
    );
    cy.expect(deleteModal.find(Button('Delete')).exists());
    cy.expect(deleteModal.find(Button('Cancel')).exists());
  },

  cancelDeleteModal: () => {
    cy.do(deleteModal.find(Button('Cancel')).click());
    cy.expect(deleteModal.absent());
  },

  deleteViaUi: (libraryName) => {
    TenantPane.deleteViaUi({ record: libraryName, modalHeader: 'Delete library' });
  },

  verifyExceptionMessage: () => cy.expect(
    exceptionModal.has({
      message: including(
        'This library cannot be deleted, as it is in use by one or more records.',
      ),
    }),
  ),

  closeExceptionModal: () => {
    cy.do(exceptionModal.find(Button('Okay')).click());
  },
  checkLibraryAbsent: (record) => {
    cy.expect(MultiColumnListCell(record).absent());
  },
};
