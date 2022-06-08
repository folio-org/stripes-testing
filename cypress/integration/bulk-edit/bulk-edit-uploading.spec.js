import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InteractorsTools from '../../support/utils/interactorsTools';
import { calloutTypes } from '../../../interactors';
import devTeams from '../../support/dictionary/devTeams';
import BulkEditActions from '../../support/fragments/bulk-edit/bulk-edit-actions';

let userWIthBulkEditPermissions;
let userWithCsvPermissions;

describe('ui-users: file uploading', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
    ])
      .then(userProperties => {
        userWIthBulkEditPermissions = userProperties;
      });

    cy.createTempUser([
      permissions.bulkEditCsvView.gui,
      permissions.bulkEditCsvEdit.gui,
    ])
      .then(userProperties => {
        userWithCsvPermissions = userProperties;
      });
  });

  after('Delete all data', () => {
    cy.deleteUser(userWIthBulkEditPermissions.userId);
    cy.deleteUser(userWithCsvPermissions.userId);
  });


  it('C350905 Negative uploading file with identifiers -- In app approach', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    cy.login(userWIthBulkEditPermissions.username, userWIthBulkEditPermissions.password);
    cy.visit(TopMenu.bulkEditPath);

    BulkEditSearchPane.selectRecordIdentifier('Item barcode');

    // try to upload empty file
    BulkEditSearchPane.uploadFile('empty.csv');
    InteractorsTools.checkCalloutMessage('Fail to upload file', calloutTypes.error);
    InteractorsTools.closeCalloutMessage();

    // try to upload another extension
    BulkEditSearchPane.uploadFile('example.json');
    BulkEditSearchPane.verifyModalName('Invalid file');

    // bug UIBULKED-88
    BulkEditSearchPane.uploadFile(['empty.csv', 'example.json']);
  });

  // TODO: think about dragging file without dropping
  it('C353537 Verify label to the Drag and drop area -- CSV approach', { tags: [testTypes.smoke, devTeams.firebird] }, () => {
    cy.login(userWithCsvPermissions.username, userWithCsvPermissions.password);
    cy.visit(TopMenu.bulkEditPath);

    BulkEditActions.openStartBulkEditForm();
    BulkEditActions.verifyLabel('Drop to continue');
  });
});
