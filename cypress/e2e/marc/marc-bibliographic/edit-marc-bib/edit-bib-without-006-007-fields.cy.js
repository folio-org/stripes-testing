import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        title: `AT_C496229_MarcBibInstance_${getRandomPostfix()}`,
        tags: {
          tag006: '006',
          tag007: '007',
        },
        userProperties: {},
      };

      let createdInstanceId;

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
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
        'C496229 Save existing "MARC bib" record without "006" and "007" fields (which are "system" and not required) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C496229'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkButtonsDisabled();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.checkButtonsEnabled();

          QuickMarcEditor.checkFieldAbsense(testData.tags.tag006);
          QuickMarcEditor.checkFieldAbsense(testData.tags.tag007);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndClose();
          InventoryInstance.checkInstanceTitle(testData.title);
        },
      );
    });
  });
});
