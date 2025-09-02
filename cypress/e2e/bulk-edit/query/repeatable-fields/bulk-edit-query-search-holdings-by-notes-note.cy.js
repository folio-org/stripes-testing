import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  holdingsFieldValues,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { HOLDING_NOTE_TYPES } from '../../../../support/constants';

let user;
let actionNoteTypeId;
const folioInstance = {
  title: `AT_C805770_FolioInstance_${getRandomPostfix()}`,
  holdingIds: [],
  holdingHrids: [],
};

const getHoldingNotesData = (holdingsNoteTypeId) => [
  {
    notes: [{ note: 'duplicate copies', holdingsNoteTypeId, staffOnly: false }],
  },
  {
    notes: [
      { note: 'duplicate copies', holdingsNoteTypeId, staffOnly: false },
      {
        note: 'no.1-29 copies duplicate',
        holdingsNoteTypeId,
        staffOnly: false,
      },
    ],
  },
  {
    notes: [
      {
        note: 'duplicate copies no.1-29',
        holdingsNoteTypeId,
        staffOnly: false,
      },
      { note: 'duplicate copies', holdingsNoteTypeId, staffOnly: false },
      { note: 'duplicate copies', holdingsNoteTypeId, staffOnly: true },
      { note: 'duplicate', holdingsNoteTypeId, staffOnly: false },
      {
        note: 'no.1-29 copies duplicate',
        holdingsNoteTypeId,
        staffOnly: false,
      },
    ],
  },
  {
    notes: [
      {
        note: 'duplicate copies no.1-29',
        holdingsNoteTypeId,
        staffOnly: false,
      },
      { note: 'duplicate', holdingsNoteTypeId, staffOnly: false },
    ],
  },
  {
    notes: [{ note: 'copies duplicate', holdingsNoteTypeId, staffOnly: false }],
  },
  {
    notes: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C805770');
        cy.createTempUser([
          permissions.bulkEditEdit.gui,
          permissions.uiInventoryViewCreateEditItems.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get holdings note type ID dynamically
          cy.getHoldingNoteTypeIdViaAPI(HOLDING_NOTE_TYPES.ACTION_NOTE).then((noteTypeId) => {
            actionNoteTypeId = noteTypeId;
            const holdingNotesData = getHoldingNotesData(actionNoteTypeId);

            // Get instance type ID
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              const instanceTypeId = instanceTypeData[0].id;

              // Get holding type ID
              cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
                const holdingTypeId = holdingTypes[0].id;

                // Get default location
                cy.getLocations({ limit: 1 }).then((locations) => {
                  const locationId = locations.id;

                  // Create holdings with required fields and notes
                  const holdingsWithRequiredFields = holdingNotesData.map((holding) => ({
                    holdingsTypeId: holdingTypeId,
                    permanentLocationId: locationId,
                    notes: holding.notes,
                  }));

                  // Create instance with holdings using createFolioInstanceViaApi
                  InventoryInstances.createFolioInstanceViaApi({
                    instance: {
                      instanceTypeId,
                      title: folioInstance.title,
                    },
                    holdings: holdingsWithRequiredFields,
                  }).then((createdInstanceData) => {
                    folioInstance.id = createdInstanceData.instanceId;
                    folioInstance.holdingIds = createdInstanceData.holdingIds;

                    folioInstance.holdingIds.forEach((holdingId) => {
                      cy.getHoldings({ query: `"id"="${holdingId.id}"` }).then((holding) => {
                        folioInstance.holdingHrids.push(holding[0].hrid);
                      });
                    });
                  });
                });
              });
            });
          });

          cy.login(user.username, user.password, {
            path: TopMenu.bulkEditPath,
            waiter: BulkEditSearchPane.waitLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(folioInstance.id);
      });

      it(
        'C805770 Search holdings by Holdings — Notes — Note (all operators for free text field) (firebird)',
        { tags: ['smoke', 'firebird', 'C805770'] },
        () => {
          // Step 1: Verify operators for repeatable free text field
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkHoldingsRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(holdingsFieldValues.notes);
          QueryModal.verifySelectedField(holdingsFieldValues.notes);
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(Object.values(STRING_OPERATORS));

          // Step 2: Search using "equals" operator
          QueryModal.selectOperator(STRING_OPERATORS.EQUAL);
          QueryModal.fillInValueTextfield('duplicate copies');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          let expectedHoldingsToFindHrids = [
            folioInstance.holdingHrids[0],
            folioInstance.holdingHrids[1],
            folioInstance.holdingHrids[2],
          ];

          expectedHoldingsToFindHrids.forEach((hrid) => {
            QueryModal.verifyMatchedRecordsByIdentifier(hrid, 'Holdings — HRID', hrid);
          });

          let notExpectedToFindHoldingHrids = [
            folioInstance.holdingHrids[3],
            folioInstance.holdingHrids[4],
            folioInstance.holdingHrids[5],
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Search using "not equal to" operator
          QueryModal.selectOperator(STRING_OPERATORS.NOT_EQUAL);
          QueryModal.fillInValueTextfield('copies duplicate');
          QueryModal.addNewRow();
          QueryModal.selectField(holdingsFieldValues.instanceUuid, 1);
          QueryModal.selectOperator(STRING_OPERATORS.EQUAL, 1);
          QueryModal.fillInValueTextfield(folioInstance.id, 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFindHrids = [
            folioInstance.holdingHrids[0],
            folioInstance.holdingHrids[1],
            folioInstance.holdingHrids[2],
            folioInstance.holdingHrids[3],
            folioInstance.holdingHrids[5],
          ];

          expectedHoldingsToFindHrids.forEach((hrid) => {
            QueryModal.verifyMatchedRecordsByIdentifier(hrid, 'Holdings — HRID', hrid);
          });

          notExpectedToFindHoldingHrids = folioInstance.holdingHrids[4];

          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(notExpectedToFindHoldingHrids);

          // Step 4: Verify Holdings — Notes column display
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Holdings — Notes');
          QueryModal.clickShowColumnsButton();
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[0],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[1],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'no.1-29 copies duplicate',
            'False',
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[1],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies no.1-29',
            'False',
            5,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
            4,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'True',
            3,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'no.1-29 copies duplicate',
            'False',
            1,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[3],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies no.1-29',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[3],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate',
            'False',
            1,
          );
          QueryModal.verifyMatchedRecordsByIdentifier(
            folioInstance.holdingHrids[5],
            'Holdings — Notes',
            '',
          );

          // Step 5: Search using "contains" operator
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('duplicate copies');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFindHrids = [
            folioInstance.holdingHrids[0],
            folioInstance.holdingHrids[1],
            folioInstance.holdingHrids[2],
            folioInstance.holdingHrids[3],
          ];

          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[0],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[1],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'no.1-29 copies duplicate',
            'False',
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[1],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies no.1-29',
            'False',
            5,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
            4,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'True',
            3,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'no.1-29 copies duplicate',
            'False',
            1,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[3],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies no.1-29',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[3],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate',
            'False',
            1,
          );

          notExpectedToFindHoldingHrids = [
            folioInstance.holdingHrids[4],
            folioInstance.holdingHrids[5],
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 6: Search using "starts with" operator
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('duplicate copies');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFindHrids = [
            folioInstance.holdingHrids[0],
            folioInstance.holdingHrids[1],
            folioInstance.holdingHrids[2],
            folioInstance.holdingHrids[3],
          ];

          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[0],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[1],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'no.1-29 copies duplicate',
            'False',
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[1],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies no.1-29',
            'False',
            5,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
            4,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'True',
            3,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'no.1-29 copies duplicate',
            'False',
            1,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[3],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies no.1-29',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[3],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate',
            'False',
            1,
          );

          notExpectedToFindHoldingHrids = [
            folioInstance.holdingHrids[4],
            folioInstance.holdingHrids[5],
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 7: Search using "is null/empty" operator with "True" value
          QueryModal.selectOperator(STRING_OPERATORS.IS_NULL);
          QueryModal.chooseValueSelect('True');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFindHrids = folioInstance.holdingHrids[5];

          QueryModal.verifyMatchedRecordsByIdentifier(
            expectedHoldingsToFindHrids,
            'Holdings — HRID',
            expectedHoldingsToFindHrids,
          );

          notExpectedToFindHoldingHrids = [
            folioInstance.holdingHrids[0],
            folioInstance.holdingHrids[1],
            folioInstance.holdingHrids[2],
            folioInstance.holdingHrids[3],
            folioInstance.holdingHrids[4],
          ];

          notExpectedToFindHoldingHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 8: Search using "is null/empty" operator with "False" value
          QueryModal.chooseValueSelect('False');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedHoldingsToFindHrids = [
            folioInstance.holdingHrids[0],
            folioInstance.holdingHrids[1],
            folioInstance.holdingHrids[2],
            folioInstance.holdingHrids[3],
            folioInstance.holdingHrids[4],
          ];

          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[0],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[1],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'no.1-29 copies duplicate',
            'False',
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[1],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies no.1-29',
            'False',
            5,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'False',
            4,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies',
            'True',
            3,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[2],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'no.1-29 copies duplicate',
            'False',
            1,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[3],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate copies no.1-29',
            'False',
            2,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[3],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'duplicate',
            'False',
            1,
          );
          QueryModal.verifyNotesEmbeddedTableInQueryModal(
            folioInstance.holdingHrids[4],
            HOLDING_NOTE_TYPES.ACTION_NOTE,
            'copies duplicate',
            'False',
            1,
          );
        },
      );
    });
  });
});
