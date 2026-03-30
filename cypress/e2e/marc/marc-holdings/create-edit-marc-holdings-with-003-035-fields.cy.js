import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      const testData = {
        user: {},
        marcTitle: `AT_C1045403_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag008: '008',
          tag003: '003',
          tag035: '035',
          tag852: '852',
        },
        tag008Index: 4,
        tag003Content: '$a new field',
        firstTag035Content: '$a (OCoLC)ocm000064758',
        secondTag035Content: '$a (OCoLC)on.000064759',
        thirdTag035Content:
          '$a (OCoLC)ocm000064758 $z (OCoLC)0000976939443 $z (OCoLC)ocn00001001261435 $z (OCoLC)120194933',
      };

      const fieldsAdded = [
        { tag: testData.tags.tag003, content: testData.tag003Content, id: 5 },
        { tag: testData.tags.tag035, content: testData.firstTag035Content, id: 6 },
        { tag: testData.tags.tag035, content: testData.secondTag035Content, id: 7 },
        { tag: testData.tags.tag035, content: testData.thirdTag035Content, id: 8 },
      ];

      const fieldsAfterCreate = [
        { tag: testData.tags.tag035, content: testData.firstTag035Content, id: 5 },
        { tag: testData.tags.tag035, content: testData.secondTag035Content, id: 6 },
        { tag: testData.tags.tag035, content: testData.thirdTag035Content, id: 7 },
      ];

      let fieldValues;
      let createdInstanceId;
      let locationCode;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.createSimpleMarcBibViaAPI(testData.marcTitle).then((instanceId) => {
            createdInstanceId = instanceId;
          });
          cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
            locationCode = res.code;

            fieldValues = [
              {
                tag: testData.tags.tag852,
                content: `$b ${locationCode}`,
              },
            ];
          });

          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(createdInstanceId);
      });

      it(
        'C1045403 Create/Edit MARC holdings record with 003 and 035 fields (verify normalization) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1045403'] },
        () => {
          // Preconditions: User is on the detail view pane of Instance ('MARC bibliographic') record
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          // Step 1: Click "Actions" button in third pane >> select "Add MARC holdings record" option.
          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          // Step 2: Fill in 852 field with valid location code
          QuickMarcEditor.updateExistingField(testData.tags.tag852, fieldValues[0].content);
          QuickMarcEditor.checkContentByTag(testData.tags.tag852, fieldValues[0].content);

          // Steps 3-4: Add 003 and 035 fields
          fieldsAdded.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, testData.tag008Index + index);
          });
          fieldsAdded.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });

          // Step 5: Click "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveHoldings();
          HoldingsRecordView.waitLoading();

          // Step 6: Click on the "Actions" >> "Edit in quickMARC"
          HoldingsRecordView.editInQuickMarc();
          QuickMarcEditor.waitLoading();
          fieldsAfterCreate.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });

          // Step 7: Add 003 field
          QuickMarcEditor.addNewField(
            fieldsAdded[0].tag,
            fieldsAdded[0].content,
            testData.tag008Index,
          );
          fieldsAdded.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });

          // Step 8: Click on the "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.waitLoading();
          fieldsAdded.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });
        },
      );
    });
  });
});
