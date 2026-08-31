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
      instanceTitle: `AT_C1385647_MarcBibInstance_${randomPostfix}`,
      updatedTag591Content: '$a Updated local note content',
      user: {},
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

    before('Ensure feature is disabled, create test data, login', () => {
      cy.createTempUser([]).then((userProperties) => {
        testData.user = userProperties;

        cy.setInventoryOptimizeUpdatesSetting(false);

        cy.assignCapabilitiesToExistingUser(testData.user.userId, [], capabSetsToAssign);

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (instanceId) => {
            testData.instanceId = instanceId;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.wait(60_000); // wait to make sure time of update is different by minutes
          },
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user?.userId);
      InventoryInstance.deleteInstanceViaApi(testData.instanceId);
    });

    it(
      'C1385647 Instance metadata is updated after editing a non-mapping MARC field in quickMARC when Prevent redundant updates in Inventory is disabled (promin)',
      { tags: ['criticalPath', 'promin', 'C1385647'] },
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
            QuickMarcEditor.updateExistingField('591', testData.updatedTag591Content);
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
            InventoryInstance.waitLoading();
            InventoryInstance.waitInstanceRecordViewOpened();

            // Step 3: Verify Record last updated in Administrative data is newer than original
            InstanceRecordView.verifyLastUpdatedDateAndTime(text.split('updated: ')[1], {
              matches: false,
            });
          });
      },
    );
  });
});
