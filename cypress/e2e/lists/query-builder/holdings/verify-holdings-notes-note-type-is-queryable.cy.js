import Permissions from '../../../../support/dictionary/permissions';
import QueryModal, {
  holdingsFieldValues,
  QUERY_OPERATIONS,
} from '../../../../support/fragments/bulk-edit/query-modal';
import { Lists } from '../../../../support/fragments/lists/lists';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryHoldings from '../../../../support/fragments/inventory/holdings/inventoryHoldings';

const testCaseId = 'C1464075';
const testData = {
  instance: { title: `AT_C1464075_Folio_Instance_${getRandomPostfix()}` },
  recordType: 'Holdings',
  noteType: `AT_${testCaseId}_Holding_note_type_${getRandomPostfix()}`,
  noteTypeId: null,
  noteText: 'Subscription cancelled per Evans Current Periodicals Selector Review. acq',
  listName: `AT_${testCaseId}_List_${getRandomPostfix()}`,
};

let user;

describe('Lists', () => {
  describe('Query Builder', () => {
    describe('Holdings', () => {
      before('Create test data', () => {
        cy.getAdminToken();
        cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
          testData.instance.instanceTypeId = instanceTypes[0].id;
        });
        cy.getHoldingTypes({ limit: 1 }).then((holdingTypes) => {
          testData.instance.holdingTypeId = holdingTypes[0].id;
        });
        InventoryInstances.getLocations({ limit: 1 }).then((locations) => {
          testData.instance.locationId = locations[0].id;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          testData.sourceId = folioSource.id;
        });

        InventoryInstances.createHoldingsNoteTypeViaApi(testData.noteType).then((noteTypeId) => {
          testData.noteTypeId = noteTypeId;

          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId: testData.instance.instanceTypeId,
              title: testData.instance.title,
            },
            holdings: [
              {
                holdingsTypeId: testData.instance.holdingTypeId,
                permanentLocationId: testData.instance.locationId,
                sourceId: testData.sourceId,
                notes: [
                  {
                    holdingsNoteTypeId: testData.noteTypeId,
                    note: testData.noteText,
                    staffOnly: false,
                  },
                ],
              },
            ],
          }).then((instanceData) => {
            testData.instance.id = instanceData.instanceId;

            cy.getHoldings({
              limit: 1,
              query: `"instanceId"="${instanceData.instanceId}"`,
            }).then((holdings) => {
              testData.instance.holdingHrid = holdings[0].hrid;
            });
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
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(testData.instance.id);
        InventoryInstances.deleteHoldingsNoteTypeViaApi(testData.noteTypeId);
        Lists.deleteListByNameViaApi(testData.listName);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1464075 Verify that the Holdings with "Notes -- Note type" is queryable (athena)',
        { tags: ['extendedPath', 'athena', 'C1464075'] },
        () => {
          // Step 1: Create new list with Holdings record type
          Lists.openNewListPane();
          Lists.setName(testData.listName);
          Lists.selectRecordType(testData.recordType);
          Lists.verifySaveButtonIsActive();
          Lists.verifyCancelButtonIsActive();
          // Step 2: Click "Build query" button and verify form elements
          Lists.buildQuery();
          QueryModal.verify();
          QueryModal.verifyQueryTextboxReadOnly();
          QueryModal.verifyQueryTextboxResizable();
          QueryModal.testQueryDisabled(true);
          QueryModal.runQueryDisabled(true);

          // Step 3: Configure query — Holdings — Notes — Note type equals note type from precondition
          QueryModal.selectField(holdingsFieldValues.notesNoteType);
          QueryModal.selectOperator(QUERY_OPERATIONS.EQUAL);
          QueryModal.chooseValueSelect(testData.noteType);
          QueryModal.testQuery();
          QueryModal.verifyNotesEmbeddedTableInQueryModal(testData.instance.holdingHrid, {
            noteType: testData.noteType,
            note: testData.noteText,
            staffOnly: 'False',
          });

          // Steps 3-4: Verify query is in progress and results load
          QueryModal.verifyQueryAreaContent(
            `(holdings.notes[*]->holdings_note_type == ${testData.noteType})`,
          );
          QueryModal.runQueryDisabled(false);

          // Step 5-7: Click "Run query & save"
          QueryModal.clickRunQueryAndSave();
          Lists.verifyListSavedCalloutMessage(testData.listName);
          Lists.waitForCompilingToComplete();

          // Step 8: Open Actions, enable "Holdings — Notes" column and verify notes data
          Lists.verifyEmbeddedTableInResultsRow('notes', testData.instance.holdingHrid, {
            noteType: testData.noteType,
            note: testData.noteText,
            staffOnly: 'False',
          });
        },
      );
    });
  });
});
