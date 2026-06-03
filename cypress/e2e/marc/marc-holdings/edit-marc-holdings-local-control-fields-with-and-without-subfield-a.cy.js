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
    describe('Edit MARC holdings', () => {
      const testData = {
        marcBibTitle: `AT_C503166_MarcBibInstance_${getRandomPostfix()}`,
        tag852: '852',
        tag866: '866',
        field002: {
          tag: '002',
          content: 'AT_C503166_002Field',
          contentWithSubfield: '$a AT_C503166_002Field',
        },
        field009: {
          tag: '009',
          content: 'AT_C503166_009Field',
          contentWithSubfield: '$a AT_C503166_009Field',
        },
        field866: {
          content: '$a AT_C503166_866Original',
          updatedContent: '$a AT_C503166_866Updated',
        },
      };

      let createdInstanceId;
      let locationCode;
      let user;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.createSimpleMarcBibViaAPI(testData.marcBibTitle).then((instanceId) => {
            createdInstanceId = instanceId;
            cy.getInstanceById(instanceId).then((instanceData) => {
              cy.getLocations({
                limit: 1,
                query: '(isActive=true and name<>"AT_*" and name<>"*auto*")',
              }).then((res) => {
                locationCode = res.code;
                cy.createMarcHoldingsViaAPI(instanceData.id, [
                  {
                    tag: '004',
                    content: instanceData.hrid,
                  },
                  {
                    tag: '008',
                    content: QuickMarcEditor.defaultValid008HoldingsValues,
                  },
                  {
                    tag: testData.tag852,
                    content: `$b ${locationCode}`,
                    indicators: ['\\', '\\'],
                  },
                  {
                    tag: testData.field002.tag,
                    content: testData.field002.content,
                  },
                  {
                    tag: testData.field009.tag,
                    content: testData.field009.content,
                  },
                  {
                    tag: testData.tag866,
                    content: testData.field866.content,
                    indicators: ['\\', '\\'],
                  },
                ]);
              });
            });
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
        'C503166 Save existing "MARC holdings" record with multiple Local control fields (002, 009) which don\'t have or have subfield "$a" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C503166'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.openHoldingView();
          HoldingsRecordView.waitLoading();

          // Step 1: Edit in quickMARC — verify 002 and 009 have no indicator boxes and no "$a"
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.checkContentByTag(testData.field002.tag, testData.field002.content);
          QuickMarcEditor.verifyIndicatorBoxesAbsentInField(testData.field002.tag);
          QuickMarcEditor.checkContentByTag(testData.field009.tag, testData.field009.content);
          QuickMarcEditor.verifyIndicatorBoxesAbsentInField(testData.field009.tag);

          // Step 2: Update a field
          QuickMarcEditor.updateExistingField(testData.tag866, testData.field866.updatedContent);
          QuickMarcEditor.checkContentByTag(testData.tag866, testData.field866.updatedContent);

          // Step 3: Save & close — verify holdings detail view
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          // Step 4: View source — verify 002 and 009 have no "$a" subfield
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

          // Step 5: Close source view — return to holdings detail view
          InventoryViewSource.close();
          HoldingsRecordView.waitLoading();

          // Step 6: Edit in quickMARC again — verify 002 and 009 still have no indicator boxes and no "$a"
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.checkContentByTag(testData.field002.tag, testData.field002.content);
          QuickMarcEditor.verifyIndicatorBoxesAbsentInField(testData.field002.tag);
          QuickMarcEditor.checkContentByTag(testData.field009.tag, testData.field009.content);
          QuickMarcEditor.verifyIndicatorBoxesAbsentInField(testData.field009.tag);

          // Step 7: Add "$a" subfield to each local control field
          QuickMarcEditor.updateExistingField(
            testData.field002.tag,
            testData.field002.contentWithSubfield,
          );
          QuickMarcEditor.checkContentByTag(
            testData.field002.tag,
            testData.field002.contentWithSubfield,
          );
          QuickMarcEditor.updateExistingField(
            testData.field009.tag,
            testData.field009.contentWithSubfield,
          );
          QuickMarcEditor.checkContentByTag(
            testData.field009.tag,
            testData.field009.contentWithSubfield,
          );

          // Step 8: Save & keep editing — verify toast and "$a" subfields are retained
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.checkContentByTag(
            testData.field002.tag,
            testData.field002.contentWithSubfield,
          );
          QuickMarcEditor.checkContentByTag(
            testData.field009.tag,
            testData.field009.contentWithSubfield,
          );

          // Step 9: Cancel — return to holdings detail view
          QuickMarcEditor.pressCancel();
          HoldingsRecordView.waitLoading();

          // Step 10: View source — verify 002 and 009 now have "$a" subfield
          HoldingsRecordView.viewSource();
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.field002.tag,
            testData.field002.contentWithSubfield,
          );
          InventoryViewSource.checkRowExistsWithTagAndValue(
            testData.field009.tag,
            testData.field009.contentWithSubfield,
          );
        },
      );
    });
  });
});
