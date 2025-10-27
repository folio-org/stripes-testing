import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Holdings', () => {
    describe('Create MARC holdings', () => {
      const testData = {
        user: {},
        marcTitle: `AT_C494043_MarcBibInstance_${getRandomPostfix()}`,
        tagLdr: 'LDR',
        tag001: '001',
        tag005: '005',
        tag999: '999',
        tag004: '004',
        tag008: '008',
        tag852: '852',
        tag866: '866',
        tag868: '868',
        tag852Index: 5,
      };

      const fieldsWithoutAddButton = [
        testData.tagLdr,
        testData.tag001,
        testData.tag005,
        testData.tag999,
      ];

      const fieldsWithAddButton = {
        initial: [testData.tag004, testData.tag008, testData.tag852],
        afterAdding: [
          testData.tag004,
          testData.tag008,
          testData.tag852,
          testData.tag866,
          testData.tag868,
        ],
      };

      const newFieldsData = [
        {
          tag: testData.tag866,
          content: '$a test 1',
        },
        {
          tag: testData.tag868,
          content: '$a test 2',
        },
      ];

      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcHoldingsEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.createSimpleMarcBibViaAPI(testData.bibTitle).then((instanceId) => {
            createdInstanceId = instanceId;
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
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
      });

      it(
        'C494043 User cannot add a new field below "999 ff" field on "Create a new MARC Holdings record" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C494043'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          InventoryInstance.goToMarcHoldingRecordAdding();
          QuickMarcEditor.waitLoading();

          fieldsWithoutAddButton.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, false);
          });
          fieldsWithAddButton.initial.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, true);
          });

          newFieldsData.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, testData.tag852Index + index);
            QuickMarcEditor.verifyTagField(
              testData.tag852Index + index + 1,
              field.tag,
              '\\',
              '\\',
              field.content,
              '',
            );
          });

          fieldsWithoutAddButton.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, false);
          });

          fieldsWithAddButton.afterAdding.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, true);
          });
        },
      );
    });
  });
});
