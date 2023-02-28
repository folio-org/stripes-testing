import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import devTeams from '../../support/dictionary/devTeams';
import Users from '../../support/fragments/users/users';

let user;

describe('bulk-edit', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
      permissions.bulkEditQueryView.gui,
      permissions.bulkEditLogsView.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: TopMenu.bulkEditPath, waiter: BulkEditSearchPane.waitLoading });
      });
  });

  after('delete test data', () => {
    Users.deleteViaApi(user.userId);
  });


  it('C350929 Verify Bulk Edit app - landing page (firebird)', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    // verify panes
    BulkEditSearchPane.verifyPanesBeforeImport();
    BulkEditSearchPane.verifyBulkEditPaneItems();
    BulkEditSearchPane.verifySetCriteriaPaneItems();
    BulkEditSearchPane.verifyRecordTypesAccordion();

    // verify identifier items
    BulkEditSearchPane.verifyUsersRecordIdentifiers();
    BulkEditSearchPane.verifyDragNDropUsersUIIDsArea();
    BulkEditSearchPane.verifyDragNDropUsersBarcodesArea();
    BulkEditSearchPane.verifyDragNDropExternalIdsArea();
    BulkEditSearchPane.verifyDragNDropUsernamesArea();

    BulkEditSearchPane.verifyItemsRecordIdentifiers();
    BulkEditSearchPane.clickRecordTypesAccordion();
    BulkEditSearchPane.verifyRecordTypesAccordionCollapsed();
    BulkEditSearchPane.clickRecordTypesAccordion();
    BulkEditSearchPane.verifyDragNDropItemBarcodeArea();
    BulkEditSearchPane.verifyDragNDropItemUUIDsArea();
    BulkEditSearchPane.verifyDragNDropItemHRIDsArea();
    BulkEditSearchPane.verifyDragNDropItemFormerIdentifierArea();
    BulkEditSearchPane.verifyDragNDropItemAccessionNumberArea();
    BulkEditSearchPane.verifyDragNDropItemHoldingsUUIDsArea();
    
    BulkEditSearchPane.verifyHoldingsRecordIdentifiers();
    BulkEditSearchPane.verifyDragNDropHoldingsUUIDsArea();
    BulkEditSearchPane.verifyDragNDropHoldingsHRIDsArea();
    BulkEditSearchPane.verifyDragNDropInstanceHRIDsArea();
    BulkEditSearchPane.verifyDragNDropHoldingsItemBarcodesArea();

    // verify query items
    BulkEditSearchPane.openQuerySearch();
    BulkEditSearchPane.verifyQueryPane();
    BulkEditSearchPane.clickRecordTypesAccordion();
    BulkEditSearchPane.verifyRecordTypesAccordionCollapsed();
    BulkEditSearchPane.clickRecordTypesAccordion();

    // verify logs items
    BulkEditSearchPane.openLogsSearch();
    BulkEditSearchPane.verifyLogsPane();
  });
});
