import getRandomPostfix from '../../../support/utils/stringTools';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      title: `AT_C10929_MarcBibInstance_${randomPostfix}`,
      tags: {
        tag245: '245',
      },
      userProperties: {},
    };

    const updatedTitle = `${testData.title} Edited`;

    let createdInstanceId;

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.uiInventoryViewInstances.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.createSimpleMarcBibViaAPI(testData.title).then((instanceId) => {
          createdInstanceId = instanceId;

          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdInstanceId);
    });

    it(
      'C10929 Inventory Action menu use after closing quickMARC (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C10929'] },
      () => {
        InventoryInstances.searchByTitle(createdInstanceId);
        InventoryInstances.selectInstanceById(createdInstanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.editMarcBibliographicRecord();

        QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${updatedTitle}`);
        QuickMarcEditor.checkContentByTag(testData.tags.tag245, `$a ${updatedTitle}`);

        QuickMarcEditor.pressCancel();
        QuickMarcEditor.closeWithoutSavingInEditConformation();
        QuickMarcEditor.cancelEditConfirmationPresented(false);
        InventoryInstance.waitLoading();

        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.checkContentByTag(testData.tags.tag245, `$a ${testData.title}`);
      },
    );
  });
});
