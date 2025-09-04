import permissions from '../../../../support/dictionary/permissions';
import BulkEditSearchPane from '../../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import QueryModal, {
  QUERY_OPERATIONS,
  instanceFieldValues,
  STRING_OPERATORS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { INSTANCE_NOTE_TYPES } from '../../../../support/constants';
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';

let user;
let actionNoteTypeId;
const instances = [];

const getInstanceNotesData = (actionNoteId) => [
  {
    // Instance 1
    title: `AT_C808445_Instance_1_${getRandomPostfix()}`,
    administrativeNotes: ['Includes indexes'],
    notes: [{ note: 'Brief record', instanceNoteTypeId: actionNoteId, staffOnly: true }],
  },
  {
    // Instance 2 - multiple notes
    title: `AT_C808445_Instance_2_${getRandomPostfix()}`,
    administrativeNotes: ['Includes index', 'Administrative note'],
    notes: [
      { note: 'Note', instanceNoteTypeId: actionNoteId, staffOnly: true },
      {
        note: 'Record 1 (matrix no. VM-5645/5646) has title: Minnesota Orchestra 75th anniversary commemorative album; record 2 (matrix no. QCE-VQS-5643/5644) has trademark and labels of Candide Records (published separately as Candide 31103)',
        instanceNoteTypeId: actionNoteId,
        staffOnly: false,
      },
      { note: 'Production level cataloging', instanceNoteTypeId: actionNoteId, staffOnly: false },
    ],
  },
  {
    // Instance 3
    title: `AT_C808445_Instance_3_${getRandomPostfix()}`,
    administrativeNotes: ['Includes bibliographical references and index'],
    notes: [
      { note: 'Columbia: 48944 (matrix)', instanceNoteTypeId: actionNoteId, staffOnly: false },
    ],
  },
  {
    // Instance 4 - no notes
    title: `AT_C808445_Instance_4_${getRandomPostfix()}`,
    administrativeNotes: [],
    notes: [],
  },
];

// Helper function to verify administrative notes
const verifyAdministrativeNotes = (instance, expectedAdminNotes) => {
  if (expectedAdminNotes && expectedAdminNotes.length > 0) {
    const adminNotesText = expectedAdminNotes.join(' | ');
    QueryModal.verifyMatchedRecordsByIdentifier(
      instance.hrid,
      instanceFieldValues.administrativeNotes,
      adminNotesText,
    );
  }
};

// Helper function to verify instance notes
const verifyInstanceNotes = (instance) => {
  if (instance.notes && instance.notes.length > 0) {
    QueryModal.verifyNotesEmbeddedTableInQueryModal(instance.hrid, instance.notes);
  } else {
    // For instances without notes, verify by HRID with empty notes column
    QueryModal.verifyMatchedRecordsByIdentifier(instance.hrid, 'Instance — Notes', '');
  }
};

// Function to create expected instances array
const createExpectedInstances = (instancesData, noteTypeName) => [
  {
    hrid: instancesData[0].hrid,
    administrativeNotes: ['Includes indexes'],
    notes: [
      {
        noteType: noteTypeName,
        note: 'Brief record',
        staffOnly: 'True',
      },
    ],
  },
  {
    hrid: instancesData[1].hrid,
    administrativeNotes: ['Includes index', 'Administrative note'],
    notes: [
      {
        noteType: noteTypeName,
        note: 'Note',
        staffOnly: 'True',
        miniRowIndex: 1,
      },
      {
        noteType: noteTypeName,
        note: 'Record 1 (matrix no. VM-5645/5646) has title: Minnesota Orchestra 75th anniversary commemorative album; record 2 (matrix no. QCE-VQS-5643/5644) has trademark and labels of Candide Records (published separately as Candide 31103)',
        staffOnly: 'False',
        miniRowIndex: 2,
      },
      {
        noteType: noteTypeName,
        note: 'Production level cataloging',
        staffOnly: 'False',
        miniRowIndex: 3,
      },
    ],
  },
  {
    hrid: instancesData[2].hrid,
    administrativeNotes: ['Includes bibliographical references and index'],
    notes: [
      {
        noteType: noteTypeName,
        note: 'Columbia: 48944 (matrix)',
        staffOnly: 'False',
      },
    ],
  },
  {
    hrid: instancesData[3].hrid,
    administrativeNotes: [],
    notes: [],
  },
];

describe('Bulk-edit', () => {
  describe('Query', () => {
    describe('Repeatable fields', () => {
      before('Create test data', () => {
        cy.clearLocalStorage();
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C808445');

        cy.createTempUser([
          permissions.bulkEditView.gui,
          permissions.uiInventoryViewInstances.gui,
          permissions.bulkEditQueryView.gui,
        ]).then((userProperties) => {
          user = userProperties;

          // Get action note type ID dynamically
          InstanceNoteTypes.getInstanceNoteTypesViaApi({
            limit: 1,
            query: `name=="${INSTANCE_NOTE_TYPES.ACTION_NOTE}"`,
          }).then(({ instanceNoteTypes }) => {
            actionNoteTypeId = instanceNoteTypes[0].id;

            const instanceNotesData = getInstanceNotesData(actionNoteTypeId);

            // Get required IDs for instances
            cy.getInstanceTypes({ limit: 1 }).then((instanceTypeData) => {
              const instanceTypeId = instanceTypeData[0].id;

              // Create instances with notes
              instanceNotesData.forEach((instanceData) => {
                InventoryInstances.createFolioInstanceViaApi({
                  instance: {
                    instanceTypeId,
                    title: instanceData.title,
                    administrativeNotes: instanceData.administrativeNotes,
                    notes: instanceData.notes,
                  },
                }).then((createdInstance) => {
                  cy.getInstanceById(createdInstance.instanceId).then((instanceResponse) => {
                    instances.push({
                      id: instanceResponse.id,
                      hrid: instanceResponse.hrid,
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

        instances.forEach((instance) => {
          InventoryInstance.deleteInstanceViaApi(instance.id);
        });
      });

      it(
        'C808445 Search instances by Administrative notes, Note, Staff only (firebird)',
        { tags: ['smoke', 'firebird', 'C808445'] },
        () => {
          // Get note type name for verification
          const noteTypeName = INSTANCE_NOTE_TYPES.ACTION_NOTE;

          // Create expected instances for verification
          const expectedInstances = createExpectedInstances(instances, noteTypeName);

          // Step 1-2: Search instances by "Instance — Administrative notes" field using "starts with" operator
          BulkEditSearchPane.openQuerySearch();
          BulkEditSearchPane.checkInstanceRadio();
          BulkEditSearchPane.clickBuildQueryButton();
          QueryModal.verify();
          QueryModal.selectField(instanceFieldValues.administrativeNotes);
          QueryModal.verifySelectedField(instanceFieldValues.administrativeNotes);
          QueryModal.selectOperator(STRING_OPERATORS.START_WITH);
          QueryModal.fillInValueTextfield('Includes index');
          QueryModal.addNewRow();
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH, 1);
          QueryModal.fillInValueTextfield('AT_C808445_Instance', 1);
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          let expectedInstancesToFind = [expectedInstances[0], expectedInstances[1]];

          expectedInstancesToFind.forEach((instance) => {
            verifyAdministrativeNotes(instance, instance.administrativeNotes);
          });

          let notExpectedToFindInstanceHrids = [
            expectedInstances[2].hrid,
            expectedInstances[3].hrid,
          ];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 3: Verify Notes fields are queryable under "Select options" dropdown
          QueryModal.selectField(instanceFieldValues.noteType);
          QueryModal.verifySelectedField(instanceFieldValues.noteType);
          QueryModal.selectField(instanceFieldValues.note);
          QueryModal.verifySelectedField(instanceFieldValues.note);
          QueryModal.selectField(instanceFieldValues.noteStaffOnly);
          QueryModal.verifySelectedField(instanceFieldValues.noteStaffOnly);
          QueryModal.verifyFieldsSortedAlphabetically();

          // Step 4: Search instances by "Instance — Notes — Note" field using "contains" operator
          QueryModal.clickSelectFieldButton();
          QueryModal.selectField(instanceFieldValues.note);
          QueryModal.verifySelectedField(instanceFieldValues.note);
          QueryModal.selectOperator(STRING_OPERATORS.CONTAINS);
          QueryModal.fillInValueTextfield('record');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.clickShowColumnsButton();
          QueryModal.clickCheckboxInShowColumns('Instance — Notes');
          QueryModal.clickShowColumnsButton();

          expectedInstancesToFind = [expectedInstances[0], expectedInstances[1]];

          expectedInstancesToFind.forEach((instance) => {
            verifyInstanceNotes(instance);
          });

          notExpectedToFindInstanceHrids = [expectedInstances[2].hrid, expectedInstances[3].hrid];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });

          // Step 5-6: Search instances by "Instance — Notes — Staff only" field using "equals" operator
          QueryModal.selectField(instanceFieldValues.noteStaffOnly);
          QueryModal.verifySelectedField(instanceFieldValues.noteStaffOnly);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect('True');
          QueryModal.clickTestQuery();
          QueryModal.verifyPreviewOfRecordsMatched();

          expectedInstancesToFind = [expectedInstances[0], expectedInstances[1]];

          expectedInstancesToFind.forEach((instance) => {
            verifyInstanceNotes(instance);
          });

          notExpectedToFindInstanceHrids = [expectedInstances[2].hrid, expectedInstances[3].hrid];

          notExpectedToFindInstanceHrids.forEach((hrid) => {
            QueryModal.verifyRecordWithIdentifierAbsentInResultTable(hrid);
          });
        },
      );
    });
  });
});
