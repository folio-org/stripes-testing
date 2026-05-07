import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { INSTANCE_SOURCE_NAMES } from '../../../support/constants';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    const testData = {
      field866: {
        tag: '866',
        rowIndex: 6,
        content: '$a Test holdings statement',
        contentUpdatedByA: '$a Updated holdings statement by User A',
        contentUpdatedByB: '$a Updated holdings statement by User B',
        contentFinalByA: '$a Final update by User A',
      },
      marcBibTitle: `AT_C353229_MarcBibInstance_${getRandomPostfix()}`,
    };

    let instanceId;
    let holdingsId;
    let location;

    before('Create test data and login', () => {
      cy.getAdminToken();

      // Create User A
      cy.createTempUser([
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
      ]).then((userAProperties) => {
        testData.userA = userAProperties;

        // Create User B
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userBProperties) => {
          testData.userB = userBProperties;

          // Get a location and create instance with holdings via API
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((loc) => {
            location = loc;
            cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceRecordId) => {
              instanceId = instanceRecordId;
              cy.getInstanceById(instanceId).then((instanceData) => {
                cy.createMarcHoldingsViaAPI(instanceData.id, [
                  {
                    content: instanceData.hrid,
                    tag: '004',
                  },
                  {
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                    tag: '008',
                  },
                  {
                    content: `$b ${location.code}`,
                    indicators: ['\\', '\\'],
                    tag: '852',
                  },
                  {
                    content: testData.field866.content,
                    indicators: ['\\', '\\'],
                    tag: testData.field866.tag,
                  },
                ]).then((holdingRecordId) => {
                  holdingsId = holdingRecordId;
                });
              });
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(() => {
        cy.deleteHoldingRecordViaApi(holdingsId);
        InventoryInstance.deleteInstanceViaApi(instanceId);
        Users.deleteViaApi(testData.userA.userId);
        Users.deleteViaApi(testData.userB.userId);
      });
    });

    it(
      'C353229 Edit "MARC Holdings" record after conflict detection banner displays (Optimistic locking) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C353229'] },
      () => {
        // Steps 1-2: User A logs in, opens holdings record for editing
        cy.login(testData.userA.username, testData.userA.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkSource(INSTANCE_SOURCE_NAMES.MARC);
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        // Steps 3-6: While User A has the record open, User B updates it via API (simulating UI save)
        cy.then(() => {
          // User B updates the holdings record via API
          cy.getToken(testData.userB.username, testData.userB.password);
          cy.getMarcRecordDataViaAPI(holdingsId).then((marcData) => {
            const field866 = marcData.fields.find((f) => f.tag === testData.field866.tag);
            field866.content = testData.field866.contentUpdatedByB;
            marcData.relatedRecordVersion = 1;
            cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(({ status }) => {
              expect(status).to.eq(202);
            });
          });
        }).then(() => {
          // Switch back to User A's token for UI interactions
          cy.getToken(testData.userA.username, testData.userA.password);

          // Step 7: User A edits field 866 (while holding a stale version)
          QuickMarcEditor.updateExistingField(
            testData.field866.tag,
            testData.field866.contentUpdatedByA,
          );
          QuickMarcEditor.checkContentByTag(
            testData.field866.tag,
            testData.field866.contentUpdatedByA,
          );

          // Step 8: User A tries to save and conflict is detected
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyOptimisticLockingBanner();

          // Step 9: User A clicks Cancel button
          QuickMarcEditor.closeWithoutSaving();

          // Step 9 (expected): Detail view of updated holdings record is displayed
          HoldingsRecordView.waitLoading();

          // Step 10: User A opens for editing again
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          // Verify User B's changes are present
          QuickMarcEditor.checkContentByTag(
            testData.field866.tag,
            testData.field866.contentUpdatedByB,
          );

          // Step 11: User A edits field 866 again (now with latest version)
          QuickMarcEditor.updateExistingField(
            testData.field866.tag,
            testData.field866.contentFinalByA,
          );
          QuickMarcEditor.checkContentByTag(
            testData.field866.tag,
            testData.field866.contentFinalByA,
          );

          // Step 12: User A saves successfully
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();
        });
      },
    );
  });
});
