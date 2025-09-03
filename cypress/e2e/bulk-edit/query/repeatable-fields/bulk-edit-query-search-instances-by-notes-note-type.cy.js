import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
  enumOperators,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { INSTANCE_NOTE_TYPES } from '../../../../support/constants';
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';

let user;
let awardsNoteTypeId;
let dataQualityNoteTypeId;
let localNoteTypeId;
const folioInstances = [];

const getInstanceNotesData = (awardsNoteId, dataQualityNoteId, localNoteId) => [
  {
    notes: [{ note: 'Awards note text', instanceNoteTypeId: awardsNoteId, staffOnly: false }],
  },
  {
    notes: [
      { note: 'Data quality note text', instanceNoteTypeId: dataQualityNoteId, staffOnly: false },
    ],
  },
  {
    notes: [
      { note: 'Awards note text', instanceNoteTypeId: awardsNoteId, staffOnly: false },
      { note: 'Local note text', instanceNoteTypeId: localNoteId, staffOnly: false },
    ],
  },
  {
    notes: [
      { note: 'Data quality note text', instanceNoteTypeId: dataQualityNoteId, staffOnly: false },
      { note: 'Local note text', instanceNoteTypeId: localNoteId, staffOnly: false },
    ],
  },
  {
    notes: [
      { note: 'Awards note text', instanceNoteTypeId: awardsNoteId, staffOnly: false },
      { note: 'Data quality note text', instanceNoteTypeId: dataQualityNoteId, staffOnly: false },
      { note: 'Local note text', instanceNoteTypeId: localNoteId, staffOnly: false },
    ],
  },
  {
    notes: [{ note: 'Local note text', instanceNoteTypeId: localNoteId, staffOnly: false }],
  },
  {
    notes: [],
  },
];

// Helper function to verify all notes for an instance
const verifyInstanceNotes = (instance) => {
  if (instance.notes) {
    QueryModal.verifyNotesEmbeddedTableInQueryModal(instance.hrid, instance.notes);
  } else {
    // For instances without notes, verify by HRID with empty notes column
    QueryModal.verifyMatchedRecordsByIdentifier(instance.hrid, 'Instance — Notes', '');
  }
};

// Function to create expected instances array
const createExpectedInstances = (instanceHrids, noteTypeNames) => [
  {
    hrid: instanceHrids[0],
    notes: [
      {
        noteType: noteTypeNames.awards,
        note: 'Awards note text',
        staffOnly: 'False',
      },
    ],
  },
  {
    hrid: instanceHrids[1],
    notes: [
      {
        noteType: noteTypeNames.dataQuality,
        note: 'Data quality note text',
        staffOnly: 'False',
      },
    ],
  },
  {
    hrid: instanceHrids[2],
    notes: [
      {
        noteType: noteTypeNames.local,
        note: 'Local note text',
        staffOnly: 'False',
        miniRowIndex: 1,
      },
      {
        noteType: noteTypeNames.awards,
        note: 'Awards note text',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
    ],
  },
  {
    hrid: instanceHrids[3],
    notes: [
      {
        noteType: noteTypeNames.local,
        note: 'Local note text',
        staffOnly: 'False',
        miniRowIndex: 1,
      },
      {
        noteType: noteTypeNames.dataQuality,
        note: 'Data quality note text',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
    ],
  },
  {
    hrid: instanceHrids[4],
    notes: [
      {
        noteType: noteTypeNames.local,
        note: 'Local note text',
        staffOnly: 'False',
        miniRowIndex: 1,
      },

      {
        noteType: noteTypeNames.dataQuality,
        note: 'Data quality note text',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
      {
        noteType: noteTypeNames.awards,
        note: 'Awards note text',
        staffOnly: 'False',
        miniRowIndex: 3,
      },
    ],
  },
  {
    hrid: instanceHrids[5],
    notes: [
      {
        noteType: noteTypeNames.local,
        note: 'Local note text',
        staffOnly: 'False',
      },
    ],
  },
  {
    hrid: instanceHrids[6],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C805773');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get instance note type IDs dynamically
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            limit: 1,
            query: `name=="${INSTANCE_NOTE_TYPES.AWARDS_NOTE}"`,
          }).then(({ instanceNoteTypes }) => {
            awardsNoteTypeId = instanceNoteTypes[0].id;
          });
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            limit: 1,
            query: `name=="${INSTANCE_NOTE_TYPES.DATA_QUALITY_NOTE}"`,
          }).then(({ instanceNoteTypes }) => {
            dataQualityNoteTypeId = instanceNoteTypes[0].id;
          });
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            limit: 1,
            query: `name=="${INSTANCE_NOTE_TYPES.LOCAL_NOTES}"`,
          }).then(({ instanceNoteTypes }) => {
            localNoteTypeId = instanceNoteTypes[0].id;

            const instanceNotesData = getInstanceNotesData(
              awardsNoteTypeId,
              dataQualityNoteTypeId,
              localNoteTypeId,
            );

            // Get instance type ID
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              const instanceTypeId = instanceTypeData[0].id;

              // Create instances with notes
              instanceNotesData.forEach((instanceData, index) => {
                const instanceTitle = `AT_C805773_FolioInstance_${index + 1}_${getRandomPostfix()}`;

                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceTitle,
                    notes: instanceData.notes,
                  },
                }).then((createdInstanceData) => {
                  cy.getInstanceById(createdInstanceData.instanceId).then((instance) => {
                    folioInstances.push({
                      id: createdInstanceData.instanceId,
                      hrid: instance.hrid,
                      title: instanceTitle,
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

        folioInstances.forEach((instance) => {
          InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instance.id);
        });
      });

      it(
        'C805773 Search instances by Instance — Notes — Note type (all operators for field with predefined values) (firebird)',
        { tags: ['smoke', 'firebird', 'C805773'] },
        () => {
          // Get note type names for verification
          const noteTypeNames = {
            awards: INSTANCE_NOTE_TYPES.AWARDS_NOTE,
            dataQuality: INSTANCE_NOTE_TYPES.DATA_QUALITY_NOTE,
            local: INSTANCE_NOTE_TYPES.LOCAL_NOTES,
          };

          // Create expected instances for verification
          const instanceHrids = folioInstances.map((instance) => instance.hrid);
          const expectedInstances = createExpectedInstances(instanceHrids, noteTypeNames);

          // Step 1: Verify operators for repeatable field with predefined values
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.noteType);
          QueryModal.verifySelectedField(instanceFieldValues.noteType);
          QueryModal.verifyOperatorColumn();
          QueryModal.verifyOperatorsList(enumOperators);

          // Step 2: Search using "equals" operator with "Awards note"
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(INSTANCE_NOTE_TYPES.AWARDS_NOTE);
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C805773_FolioInstance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Instance — Notes');
          QueryModal.clickShowColumnsButton();

          let expectedInstancesToFind = [
            expectedInstances[0],
            expectedInstances[2],
            expectedInstances[4],
          ];

          expectedInstancesToFind.forEach((instance) => {
            verifyInstanceNotes(instance);
          });

          let notExpectedToFindInstanceHrids = [
            expectedInstances[1].hrid,
            expectedInstances[3].hrid,
            expectedInstances[5].hrid,
            expectedInstances[6].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3-4: Search using "not equal to" operator with "Data quality note"
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_EQUAL);
          QueryModal.chooseValueSelect(INSTANCE_NOTE_TYPES.DATA_QUALITY_NOTE);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind = [
            expectedInstances[0],
            expectedInstances[2],
            expectedInstances[5],
            expectedInstances[6],
          ];

          expectedInstancesToFind.forEach((instance) => {
            verifyInstanceNotes(instance);
          });

          notExpectedToFindInstanceHrids = [
            expectedInstances[1].hrid,
            expectedInstances[3].hrid,
            expectedInstances[4].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5: Search using "in" operator with "Awards note" and "Data quality note"
          QueryModal.selectOperator(QUERY_OPERATIONS.IN);
          QueryModal.chooseFromValueMultiselect(INSTANCE_NOTE_TYPES.AWARDS_NOTE);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind = [
            expectedInstances[0],
            expectedInstances[1],
            expectedInstances[2],
            expectedInstances[3],
            expectedInstances[4],
          ];

          expectedInstancesToFind.forEach((instance) => {
            verifyInstanceNotes(instance);
          });

          notExpectedToFindInstanceHrids = [expectedInstances[5].hrid, expectedInstances[6].hrid];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 6: Search using "not in" operator with "Awards note" and "Data quality note"
          QueryModal.selectOperator(QUERY_OPERATIONS.NOT_IN);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind = [expectedInstances[5], expectedInstances[6]];

          expectedInstancesToFind.forEach((instance) => {
            verifyInstanceNotes(instance);
          });

          notExpectedToFindInstanceHrids = [
            expectedInstances[0].hrid,
            expectedInstances[1].hrid,
            expectedInstances[2].hrid,
            expectedInstances[3].hrid,
            expectedInstances[4].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 7: Search using "is null/empty" operator with "True" value
          QueryModal.selectOperator(QUERY_OPERATIONS.IS_NULL);
          QueryModal.chooseValueSelect('True');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          // Verify empty instance (index 6) - it will be found for null/empty search
          expectedInstancesToFind = [expectedInstances[6]];

          expectedInstancesToFind.forEach((instance) => {
            verifyInstanceNotes(instance);
          });

          notExpectedToFindInstanceHrids = [
            expectedInstances[0].hrid,
            expectedInstances[1].hrid,
            expectedInstances[2].hrid,
            expectedInstances[3].hrid,
            expectedInstances[4].hrid,
            expectedInstances[5].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 8: Search using "is null/empty" operator with "False" value
          QueryModal.chooseValueSelect('False');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind = [
            expectedInstances[0],
            expectedInstances[1],
            expectedInstances[2],
            expectedInstances[3],
            expectedInstances[4],
            expectedInstances[5],
          ];

          expectedInstancesToFind.forEach((instance) => {
            verifyInstanceNotes(instance);
          });

          notExpectedToFindInstanceHrids = expectedInstances[6].hrid;

          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(notExpectedToFindInstanceHrids);
        },
      );
    });
  });
});
