import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C1045401_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag008: '008',
          tag003: '003',
          tag035: '035',
          tag245: '245',
        },
        tag008Index: 3,
        tag003Content: '$a new field',
        firstTag035Content: '$a (OCoLC)ocm000064758',
        secondTag035Content: '$a (OCoLC)on.000064759',
        thirdTag035Content:
          '$a (OCoLC)ocm000064758 $z (OCoLC)0000976939443 $z (OCoLC)ocn00001001261435 $z (OCoLC)120194933',
        headerStatus: 'Current',
      };

      const fieldsAdded = [
        { tag: testData.tags.tag003, content: testData.tag003Content, id: 4 },
        { tag: testData.tags.tag035, content: testData.firstTag035Content, id: 5 },
        { tag: testData.tags.tag035, content: testData.secondTag035Content, id: 6 },
        { tag: testData.tags.tag035, content: testData.thirdTag035Content, id: 7 },
      ];

      const marcBibFields = [
        {
          tag: testData.tags.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tags.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
      ];

      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.userProperties.username, testData.userProperties.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              }, 20_000);
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C1045401 Edit MARC bib with 003 and 035 fields (no normalization) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1045401'] },
        () => {
          // Preconditions: User is on the detail view pane of Instance ('MARC bibliographic') record
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          // Step 1: Click on "Actions" button in third pane >> Select "Edit MARC bibliographic record" option
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkButtonsDisabled();

          // Step 2-3: Add 003 and 035 fields
          QuickMarcEditor.updateLDR06And07Positions();
          fieldsAdded.forEach((field, index) => {
            QuickMarcEditor.addNewField(field.tag, field.content, testData.tag008Index + index);
          });
          fieldsAdded.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });

          // Step 4: Click on the "Save & keep editing" button
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.checkMarcBibHeader(
            {
              instanceTitle: `${testData.instanceTitle}`,
              status: testData.headerStatus,
            },
            `${testData.userProperties.lastName}, ${testData.userProperties.firstName}`,
          );
          fieldsAdded.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });
        },
      );
    });
  });
});
