import Permissions from '../../../support/dictionary/permissions';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      const testData = {
        marcBibTitle: `AT_C503164_MarcBibInstance_${getRandomPostfix()}`,
        tag852: '852',
        field002: {
          tag: '002',
          content: 'FOLIOC5031641',
          rowIndex: 5,
        },
        field009: {
          tag: '009',
          content: 'FOLIOC5031642',
          rowIndex: 6,
        },
      };

      let createdInstanceId;
      let locationCode;
      let user;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
            createdInstanceId = instanceId;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
          }).then((res) => {
            locationCode = res.code;
          });

          cy.login(user.username, user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
      });

      it(
        'C503164 Create "MARC holdings" record with multiple Local control fields (002, 009) which don\'t have subfield "$a" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503164'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          // Step 1: Open "Add MARC holdings record"
          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          // Step 2: Select valid permanent location
          QuickMarcEditor.updateExistingField(testData.tag852, `$b ${locationCode}`);
          QuickMarcEditor.checkContentByTag(testData.tag852, `$b ${locationCode}`);

          // Step 3: Add 002 and 009 local control fields without "$a" subfield
          // 852 is at row index 5 in the create editor (LDR, 001, 004, 005, 008, 852, 999)
          QuickMarcEditor.addNewField(
            testData.field002.tag,
            testData.field002.content,
            testData.field002.rowIndex,
          );
          QuickMarcEditor.checkContentByTag(testData.field002.tag, testData.field002.content);
          QuickMarcEditor.addNewField(
            testData.field009.tag,
            testData.field009.content,
            testData.field009.rowIndex,
          );
          QuickMarcEditor.checkContentByTag(testData.field009.tag, testData.field009.content);

          // Step 4: Save & close — verify toast and holdings detail view
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          // Step 5: Edit in quickMARC — verify local control fields have no indicator boxes and no "$a"
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.checkContentByTag(testData.field002.tag, testData.field002.content);
          QuickMarcEditor.verifyIndicatorBoxesAbsentInField(testData.field002.tag);

          QuickMarcEditor.checkContentByTag(testData.field009.tag, testData.field009.content);
          QuickMarcEditor.verifyIndicatorBoxesAbsentInField(testData.field009.tag);

          // Step 6: Cancel — return to holdings detail view
          QuickMarcEditor.pressCancel();
          HoldingsRecordView.waitLoading();

          // Step 7: View source — verify local control fields don't have "$a" subfield indicators
          HoldingsRecordView.viewSource();
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.field002.tag,
            testData.field002.content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(testData.field002.tag, '$a', false);
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.field009.tag,
            testData.field009.content,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(testData.field009.tag, '$a', false);
        },
      );
    });
  });
});
