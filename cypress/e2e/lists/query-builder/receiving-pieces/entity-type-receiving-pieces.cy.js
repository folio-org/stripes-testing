import { RECEIVING_PIECES_FIELDS } from '../../../../support/constants/query-builder/receivingPiecesFields';
import QueryModal from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../support/utils/stringTools';

const listName = `AT_C889720_List_${getRandomPostfix()}`;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Receiving pieces', () => {
      before('Login as admin', () => {
        cy.loginAsAdmin({
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });

      it(
        'C889720 Entity type - Receiving pieces (athena)',
        { tags: ['extendedPath', 'athena', 'C889720'] },
        () => {
          // Step 1: Click on "New" button, Click on "Select record type" dropdown and select for the ET "Receiving pieces"
          Lists.openNewListPane();
          Lists.setName(listName);
          Lists.selectRecordType(Lists.recordTypes.receivingPieces);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();

          // Step 2: Click on "Build query" button
          Lists.buildQuery();
          QueryModal.verify();

          // Step 3: Click on the "Field" dropdown
          QueryModal.clickSelectFieldButton();
          QueryModal.closeOpenedSelection();

          // Step 4: Search for the source "Pieces"
          Object.values(RECEIVING_PIECES_FIELDS.PIECES).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });

          // Step 5: Search for the source "Item"
          Object.values(RECEIVING_PIECES_FIELDS.ITEM).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });

          // Step 6: Search for the source "Location"
          Object.values(RECEIVING_PIECES_FIELDS.LOCATION).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });

          // Step 7: Search for the source "POL"
          Object.values(RECEIVING_PIECES_FIELDS.POL).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });

          // Step 8: Search for the source "Title"
          Object.values(RECEIVING_PIECES_FIELDS.TITLE).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });

          // Step 9: Search for the source "Holdings"
          Object.values(RECEIVING_PIECES_FIELDS.HOLDINGS).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });

          // Step 10: Search for the source "PO"
          Object.values(RECEIVING_PIECES_FIELDS.PO).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });

          // Step 11: Search for the source "Created by" and "Updated by"
          Object.values(RECEIVING_PIECES_FIELDS.CREATED_BY).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });

          Object.values(RECEIVING_PIECES_FIELDS.UPDATED_BY).forEach((fieldName) => {
            QueryModal.selectField(fieldName);
          });
        },
      );
    });
  });
});
