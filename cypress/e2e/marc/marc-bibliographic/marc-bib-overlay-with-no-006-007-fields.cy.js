import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      title: `AT_C350446_MarcBibInstance_${randomPostfix}`,
      overlayTitle1:
        "Please Don't Sit on My Bed in Your Outside Clothes : Essays/ Robinson, Phoebe.",
      overlayTitle2:
        "Please don't sit on my bed in your outside clothes : essays / Phoebe Robinson.",
      tags: {
        tag006: '006',
        tag007: '007',
        tag008: '008',
        tag245: '245',
      },
      oclcNumbers: ['1285966961', '1291876297'],
      userProperties: {},
    };

    const marcInstanceFields = [
      {
        tag: testData.tags.tag008,
        content: QuickMarcEditor.valid008ValuesInstance,
      },
      {
        tag: testData.tags.tag245,
        content: `$a ${testData.title}`,
        indicators: ['1', '1'],
      },
    ];

    let createdInstanceId;

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.uiInventorySingleRecordImport.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcInstanceFields).then(
          (instanceId) => {
            createdInstanceId = instanceId;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          },
        );
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
    });

    it(
      'C350446 Verify that 006 / 007 tag(s) do not persist if record overlaid does not contain the tag(s) (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C350446'] },
      () => {
        InventoryInstances.searchByTitle(createdInstanceId);
        InventoryInstances.selectInstanceById(createdInstanceId);
        InventoryInstance.waitLoading();

        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.overlayWithOclc(testData.oclcNumbers[0]);
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(testData.overlayTitle1);

        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkFieldsExist([testData.tags.tag006, testData.tags.tag007]);

        QuickMarcEditor.pressCancel();
        InventoryInstance.waitLoading();

        InventoryInstance.startOverlaySourceBibRecord();
        InventoryInstance.overlayWithOclc(testData.oclcNumbers[1]);
        InventoryInstance.waitLoading();
        InventoryInstance.checkInstanceTitle(testData.overlayTitle2);

        InventoryInstance.viewSource();
        InventoryViewSource.notContains(`${testData.tags.tag006}\t`);
        InventoryViewSource.notContains(`${testData.tags.tag007}\t`);
      },
    );
  });
});
