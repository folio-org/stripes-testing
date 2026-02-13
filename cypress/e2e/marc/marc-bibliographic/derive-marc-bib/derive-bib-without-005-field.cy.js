import moment from 'moment';
import { including } from '@interactors/html';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import CapabilitySets from '../../../../support/dictionary/capabilitySets';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C594519_MarcBibInstance_${randomPostfix}`,
        tag008: '008',
        tag005: '005',
        tag333: '333',
        tag245: '245',
      };
      const marcInstanceFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.valid008ValuesInstance,
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitle}}`,
          indicators: ['1', '1'],
        },
      ];
      const userCapabilitySets = [
        CapabilitySets.uiInventoryInstanceView,
        CapabilitySets.uiQuickMarcQuickMarcEditor,
        CapabilitySets.uiQuickMarcEditorDuplicate,
      ];

      let testInstanceId;

      before('Creating user, data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceByTitleViaApi('AT_C594519');

        cy.createTempUser([])
          .then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;
            cy.assignCapabilitiesToExistingUser(
              testData.userProperties.userId,
              [],
              userCapabilitySets,
            );
          })
          .then(() => {
            cy.createMarcBibliographicViaAPI(
              QuickMarcEditor.defaultValidLdr,
              marcInstanceFields,
            ).then((instanceId) => {
              testInstanceId = instanceId;
            });
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
      });

      after('Deleting created user, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      });

      it(
        'C594519 Derive MARC bibliographic record without "005" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C594519'] },
        () => {
          InventoryInstances.searchByTitle(testInstanceId);
          InventoryInstances.selectInstanceById(testInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();

          QuickMarcEditor.updateExistingTagName(testData.tag005, testData.tag333);
          QuickMarcEditor.checkDeleteButtonExistsByTag(testData.tag333);
          QuickMarcEditor.checkTagAbsent(testData.tag005);

          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag333);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.checkAfterSaveAndKeepEditingDerive();

          QuickMarcEditor.checkContentByTag(
            testData.tag005,
            including(moment().format('YYYYMMDD')),
          );
        },
      );
    });
  });
});
