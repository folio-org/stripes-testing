import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  instanceFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { INSTANCE_NOTE_TYPES } from '../../../../support/constants';
import InstanceNoteTypes from '../../../../support/fragments/settings/inventory/instance-note-types/instanceNoteTypes';

let user;
const listData = {
  name: `AT_C831961_List_${getRandomPostfix()}`,
  description: `AT_C831961_Desc_${getRandomPostfix()}`,
};
const titlePrefix = 'AT_C831961_Instance';
const testData = {
  instanceTypeId: null,
  awardsNoteTypeId: null,
  awardsNoteTypeName: INSTANCE_NOTE_TYPES.AWARDS_NOTE,
  awardsNoteContent: 'Test Awards note content',
  bibliographyNoteTypeId: null,
  bibliographyNoteTypeName: INSTANCE_NOTE_TYPES.BIBLIOGRAPHY_NOTE,
  bibliographyNoteContent: 'Test Bibliography note content',
  instanceWithAwardsNote: {
    title: `${titlePrefix}_Awards_${getRandomPostfix()}`,
    id: null,
  },
  instanceWithBibliographyNote: {
    title: `${titlePrefix}_Bibliography_${getRandomPostfix()}`,
    id: null,
  },
  instanceWithoutNote: {
    title: `${titlePrefix}_NoNote_${getRandomPostfix()}`,
    id: null,
  },
};

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Instances', () => {
      before('Create test data and login', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C831961');

        // Get instance type
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instanceTypeId = instanceTypes[0].id;
        });

        // Get instance note types (Awards note and Bibliography note)
        InstanceNoteTypes.getInstanceNoteTypesViaApi({
          query: `name=="${testData.awardsNoteTypeName}" or name=="${testData.bibliographyNoteTypeName}"`,
        })
          .then(({ instanceNoteTypes }) => {
            const awardsNote = instanceNoteTypes.find(
              (type) => type.name === testData.awardsNoteTypeName,
            );
            const bibliographyNote = instanceNoteTypes.find(
              (type) => type.name === testData.bibliographyNoteTypeName,
            );
            testData.awardsNoteTypeId = awardsNote.id;
            testData.bibliographyNoteTypeId = bibliographyNote.id;
          })
          .then(() => {
            // Create first instance with Awards note
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instanceWithAwardsNote.title,
                notes: [
                  {
                    note: testData.awardsNoteContent,
                    instanceNoteTypeId: testData.awardsNoteTypeId,
                    staffOnly: false,
                  },
                ],
              },
            }).then((instanceIds) => {
              testData.instanceWithAwardsNote.id = instanceIds.instanceId;
            });
          })
          .then(() => {
            // Create second instance with Bibliography note
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instanceWithBibliographyNote.title,
                notes: [
                  {
                    note: testData.bibliographyNoteContent,
                    instanceNoteTypeId: testData.bibliographyNoteTypeId,
                    staffOnly: false,
                  },
                ],
              },
            }).then((instanceIds) => {
              testData.instanceWithBibliographyNote.id = instanceIds.instanceId;
            });
          })
          .then(() => {
            // Create third instance without any note (precondition requirement)
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId: testData.instanceTypeId,
                title: testData.instanceWithoutNote.title,
              },
            }).then((instanceIds) => {
              testData.instanceWithoutNote.id = instanceIds.instanceId;
            });
          });

        cy.createTempUser([Permissions.listsAll.gui, Permissions.inventoryAll.gui]).then(
          (userProperties) => {
            user = userProperties;

            cy.login(user.username, user.password, {
              path: TopMenu.listsPath,
              waiter: Lists.waitLoading,
            });
          },
        );
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        InventoryInstance.deleteInstanceViaApi(testData.instanceWithAwardsNote.id);
        InventoryInstance.deleteInstanceViaApi(testData.instanceWithBibliographyNote.id);
        InventoryInstance.deleteInstanceViaApi(testData.instanceWithoutNote.id);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C831961 Verify that the field "Instance — Notes — Note type" return values (athena)',
        { tags: ['extendedPath', 'athena', 'C831961'] },
        () => {
          // Step 1: Create new list with Instances record type and open Build query form
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType(Lists.recordTypes.instances);
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();

          // Step 2: Add title filter and select "Instance — Notes — Note type" field
          QueryModal.selectField(instanceFieldValues.instanceResourceTitle);
          QueryModal.selectOperator(QUERY_OPERATIONS.START_WITH);
          QueryModal.fillInValueTextfield(titlePrefix);
          QueryModal.addNewRow();

          QueryModal.selectField(instanceFieldValues.noteType, 1);
          QueryModal.verifySelectedField(instanceFieldValues.noteType, 1);
          QueryModal.selectOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.verifySelectedOperator(QUERY_OPERATIONS.IN, 1);
          QueryModal.chooseFromValueMultiselect(testData.awardsNoteTypeName, 1);
          QueryModal.verifySelectedMultiselectValue([testData.awardsNoteTypeName], 1);
          QueryModal.verifyQueryAreaContent(
            `(instance.title starts with ${titlePrefix}) AND (instance.notes[*]->instance_note_type in [${testData.awardsNoteTypeName}])`,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(true);
          QueryModal.clickTestQuery();

          // Step 3: Check preview of found records
          QueryModal.waitForQueryTestToFinish();
          QueryModal.verifyPreviewOfRecordsMatched();
          QueryModal.verifyNumberOfRowsInPreviewTable(1);
          QueryModal.verifyNotesEmbeddedTableInQueryModal(testData.instanceWithAwardsNote.title, {
            noteType: testData.awardsNoteTypeName,
            note: testData.awardsNoteContent,
            staffOnly: 'False',
          });
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.instanceWithBibliographyNote.title,
          );
          QueryModal.verifyRecordWithIdentifierAbsentInResultTable(
            testData.instanceWithoutNote.title,
          );
          QueryModal.testQueryDisabled(false);
          QueryModal.runQueryDisabled(false);

          QueryModal.getNumberOfMatchedRecords().then((recordCount) => {
            // Step 4: Click "Run query & save" button
            QueryModal.clickRunQueryAndSave();
            QueryModal.verifyClosed();
            Lists.verifyListSavedCalloutMessage(listData.name);

            // Step 5: Verify result after refresh is done
            Lists.verifyRefreshCompleteCallout(recordCount);

            // Step 6: Click "View updated list" link and verify
            Lists.viewUpdatedList();
            Lists.verifyRecordWithContent(testData.instanceWithAwardsNote.title);
          });
        },
      );
    });
  });
});
