import QueryModal from '../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import getRandomPostfix from '../../../support/utils/stringTools';

const listName = `AT_C1045964_List_${getRandomPostfix()}`;
const fieldsToVerify = ['Bill to — Address', 'Bill to — Name'];
const recordTypes = [
  'Order — Invoice Analysis',
  'Invoice lines',
  'Voucher lines with invoice, fund, organization',
];

describe('Lists', () => {
  describe('Query Builder', () => {
    before('Create test user and login', () => {
      cy.loginAsAdmin({
        path: TopMenu.listsPath,
        waiter: Lists.waitLoading,
      });
      Lists.openNewListPane();
    });

    it(
      'C1045964 Verify that the fields "Bill to — Address" and "Bill to — Name" are queryable in the ETs "Invoice lines", "Order — Invoice Analysis" and "Voucher lines with invoice, fund, organization" (athena)',
      { tags: ['extendedPath', 'athena', 'C1045964'] },
      () => {
        Lists.setName(listName);
        // Test each record type
        recordTypes.forEach((recordType, index) => {
          if (index > 0) {
            // For subsequent record types, cancel query and change record type
            QueryModal.clickCancel();
          }

          // Step: Select record type and build query
          Lists.selectRecordType(recordType);
          Lists.buildQuery();
          QueryModal.verify();

          // Step: Verify both "Bill to" fields are queryable
          fieldsToVerify.forEach((field) => {
            QueryModal.selectField(field);
            QueryModal.verifySelectedField(field);
          });
        });
      },
    );
  });
});
