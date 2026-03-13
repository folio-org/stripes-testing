import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive new MARC bib', () => {
      const testData = {
        user: {},
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
        tag245Content: `$a AT_C1045402_MarcBibInstance_${getRandomPostfix()}`,
        firstTag035ContentAfterSave: '$a (OCoLC)64759',
        secondTag035ContentAfterSave:
          '$a (OCoLC)64758 $z (OCoLC)976939443 $z (OCoLC)1001261435 $z (OCoLC)120194933',
      };

      const fieldsAdded = [
        { tag: testData.tags.tag003, content: testData.tag003Content, id: 4 },
        { tag: testData.tags.tag035, content: testData.firstTag035Content, id: 5 },
        { tag: testData.tags.tag035, content: testData.secondTag035Content, id: 6 },
        { tag: testData.tags.tag035, content: testData.thirdTag035Content, id: 7 },
      ];

      const fieldsAfterSave = [
        { tag: testData.tags.tag035, content: testData.firstTag035ContentAfterSave, id: 4 },
        { tag: testData.tags.tag035, content: testData.secondTag035ContentAfterSave, id: 5 },
        { tag: testData.tags.tag245, content: testData.tag245Content, id: 6 },
      ];

      const marcBibFields = [
        {
          tag: testData.tags.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tags.tag245,
          content: testData.tag245Content,
          indicators: ['1', '1'],
        },
      ];

      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;

              cy.waitForAuthRefresh(() => {
                cy.login(testData.user.username, testData.user.password, {
                  path: TopMenu.inventoryPath,
                  waiter: InventoryInstances.waitContentLoading,
                });
              });
            },
          );
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('C1045402');
      });

      it(
        'C1045402 Derive MARC bibliographic record with 003 and 035 fields (verify normalization) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C1045402'] },
        () => {
          // Preconditions: User is on the detail view pane of Instance ('MARC bibliographic') record
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();

          // Step 1: Click on "Actions" button in third pane >> Select "Derive new MARC bibliographic record" option
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();

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
          QuickMarcEditor.checkAfterSaveAndKeepEditingDerive();
          QuickMarcEditor.waitLoading();
          fieldsAfterSave.forEach((field) => {
            QuickMarcEditor.checkContent(field.content, field.id);
          });
        },
      );
    });
  });
});
