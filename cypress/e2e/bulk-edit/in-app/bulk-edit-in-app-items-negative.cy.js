import { calloutTypes } from '../../../../interactors';
import permissions from '../../../support/dictionary/permissions';
import BulkEditSearchPane, {
  ITEM_IDENTIFIERS,
} from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InteractorsTools from '../../../support/utils/interactorsTools';

let user;

describe('bulk-edit', () => {
  describe('in-app approach', () => {
    before('create test data', () => {
      cy.createTempUser([
        permissions.bulkEditView.gui,
        permissions.bulkEditEdit.gui,
        permissions.uiInventoryViewCreateEditItems.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
    });

    it(
      'C627391 Negative uploading file with identifiers -- In app approach (firebird)',
      { tags: ['smoke', 'firebird', 'shiftLeft', 'C627391'] },
      () => {
        BulkEditSearchPane.checkItemsRadio();
        BulkEditSearchPane.selectRecordIdentifier(ITEM_IDENTIFIERS.ITEM_BARCODES);

        // try to upload empty file
        BulkEditSearchPane.uploadFile('empty.csv');
        InteractorsTools.checkCalloutMessage('The uploaded file is empty.', calloutTypes.error);
        InteractorsTools.closeCalloutMessage();

        const invalidFileWarning = 'Invalid file';
        // try to upload another extension
        BulkEditSearchPane.uploadFile('example.json');
        BulkEditSearchPane.verifyModalName(invalidFileWarning);

        BulkEditSearchPane.uploadFile(['empty.csv', 'example.json']);
        BulkEditSearchPane.verifyModalName(invalidFileWarning);
      },
    );
  });
});
