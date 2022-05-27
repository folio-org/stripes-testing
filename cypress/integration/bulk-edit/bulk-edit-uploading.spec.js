import TopMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import permissions from '../../support/dictionary/permissions';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import InteractorsTools from '../../support/utils/interactorsTools';
import { calloutTypes } from '../../../interactors';

let user;

describe('ui-users: BULK EDIT permissions', () => {
  before('create user', () => {
    cy.createTempUser([
      permissions.bulkEditView.gui,
      permissions.bulkEditEdit.gui,
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
        cy.visit(TopMenu.bulkEditPath);
      });
  });

  after('Delete all data', () => {
    cy.deleteUser(user.userId);
  });


  it('C350905 Negative uploading file with identifiers -- In app approach', { tags: [testTypes.smoke] }, () => {
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
});
