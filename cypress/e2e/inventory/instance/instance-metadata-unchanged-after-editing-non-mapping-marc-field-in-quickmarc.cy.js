import CapabilitySets from '../../../support/dictionary/capabilitySets';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

const capabSetsToAssign = [
  CapabilitySets.uiInventoryInstanceView,
  CapabilitySets.uiQuickMarcQuickMarcEditorView,
  CapabilitySets.uiQuickMarcQuickMarcEditor,
];

describe('Inventory', () => {
  describe('Instance', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C1385646_MarcBibInstance_${randomPostfix}`,
      user: {},
      updatedTag982Content: '$a Updated local note content',
    };

    const marcBibFields = [
      { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
      {
        tag: '245',
        content: `$a ${testData.instanceTitle}`,
        indicators: ['1', '1'],
      },
      {
        tag: '591',
        content: '$a Original local note content',
        indicators: ['\\', '\\'],
      },
    ];

    before('Enable feature, create test data, login', () => {
      cy.getAdminToken();
      cy.setInventoryOptimizeUpdatesSetting(true);

      cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
        (instanceId) => {
          testData.instanceId = instanceId;
        },
      );

      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;
        cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('Restore feature setting and delete test data', () => {
      cy.getAdminToken();
      cy.setInventoryOptimizeUpdatesSetting(false);
      Users.deleteViaApi(testData.user.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C1385646 Instance metadata is not updated after editing a non-mapping MARC field in quickMARC when Prevent redundant updates in Inventory is enabled (promin)',
      { tags: ['extendedPath', 'promin', 'nonParallel', 'C1385646'] },
      () => {
        // Step 1: Search and open the MARC instance; note Record last updated
        InventoryInstances.searchByTitle(testData.instanceId);
        InventoryInstances.selectInstanceById(testData.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        cy.contains('button', /Record last updated:/)
          .invoke('text')
          .then((text) => {
            // Step 2: Open Edit MARC bibliographic record; update non-mapping 591 field; save
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.updateExistingField('591', testData.updatedTag982Content);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 3: Verify Record last updated in Administrative data is unchanged
            InstanceRecordView.verifyLastUpdatedDateAndTime(text.split('updated: ')[1]);
          });
      },
    );
  });
});
