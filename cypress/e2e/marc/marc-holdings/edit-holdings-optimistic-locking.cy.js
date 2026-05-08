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
        contentUpdatedByA: '$a Test holdings statement updated by User A',
        contentUpdatedByB: '$a Updated holdings statement by User B',
      },
      marcBibTitle: `AT_C353227_MarcBibInstance_${getRandomPostfix()}`,
    };

    let instanceId;
    let holdingsId;
    let location;
    let adminSourceRecord;

    before('Create test data and login', () => {
      cy.getAdminToken();
      cy.getAdminSourceRecord().then((record) => {
        adminSourceRecord = record;
      });

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
      'C353227 Editing same "MARC Holdings" record by 2 different users (Optimistic locking) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C353227'] },
      () => {
        // Steps 1-2: User A logs in, opens holdings record for editing
        cy.login(testData.userA.username, testData.userA.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventoryInstances.searchByTitle(instanceId);
        InventoryInstances.selectInstanceById(instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.openHoldingView();
        HoldingsRecordView.waitLoading();
        HoldingsRecordView.checkSource(INSTANCE_SOURCE_NAMES.MARC);
        HoldingsRecordView.checkLastUpdatedDate(adminSourceRecord);
        HoldingsRecordView.editInQuickMarc();
        QuickMarcEditor.waitLoading();

        // Steps 3-8: While User A has the record open, User B updates it via API
        cy.then(() => {
          // User B updates the holdings record via API
          cy.getToken(testData.userB.username, testData.userB.password);
          cy.getMarcRecordDataViaAPI(holdingsId).then((marcData) => {
            const field866 = marcData.fields.find((f) => f.tag === testData.field866.tag);
            field866.content = testData.field866.contentUpdatedByB;
            cy.updateMarcRecordDataViaAPI(marcData.parsedRecordId, marcData).then(({ status }) => {
              expect(status).to.eq(202);
            });
          });
        }).then(() => {
          // Switch back to User A's token for UI interactions
          cy.getToken(testData.userA.username, testData.userA.password);

          // Step 9: User A makes changes to field 866
          QuickMarcEditor.updateExistingField(
            testData.field866.tag,
            testData.field866.contentUpdatedByA,
          );
          QuickMarcEditor.checkContentByTag(
            testData.field866.tag,
            testData.field866.contentUpdatedByA,
          );

          // Step 10: User A tries to save and conflict is detected
          QuickMarcEditor.pressSaveAndCloseButton();

          // Step 10 (expected): Verify conflict detection banner
          QuickMarcEditor.verifyOptimisticLockingBanner();

          // Step 11: User A clicks "View latest version" link
          QuickMarcEditor.clickViewLatestVersionLink();

          // Step 11 (expected): Holdings record updated by User B is displayed
          HoldingsRecordView.waitLoading();
          HoldingsRecordView.checkLastUpdatedDate(
            `${testData.userB.lastName}, ${testData.userB.firstName}`,
          );

          // Step 13: Open for editing and verify changes made by User B
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          // Step 14: Verify the content was updated by User B
          QuickMarcEditor.checkContentByTag(
            testData.field866.tag,
            testData.field866.contentUpdatedByB,
          );
          QuickMarcEditor.checkUserNameInHeader(testData.userB.firstName, testData.userB.lastName);
        });
      },
    );
  });
});
