import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Derive MARC bib', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        instanceTitle: `AT_C366531_MarcBibInstance_${randomPostfix}`,
        contributorValue: `AT_C366531_Contributor_${randomPostfix}`,
        tag008: '008',
        tag100: '100',
        tag245: '245',
        contributorSectionId: 'list-contributors',
      };

      const newTitle = `${testData.instanceTitle}_upd`;

      const marcRecordFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
        {
          tag: testData.tag100,
          content: `$a ${testData.contributorValue}`,
          indicators: ['2', '\\'],
        },
        {
          tag: testData.tag245,
          content: `$a ${testData.instanceTitle}`,
          indicators: ['1', '1'],
        },
      ];

      const user = {};
      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        ]).then((createdUserProperties) => {
          user.userProperties = createdUserProperties;

          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcRecordFields).then(
            (instanceId) => {
              createdInstanceId = instanceId;

              cy.waitForAuthRefresh(() => {
                cy.login(user.userProperties.username, user.userProperties.password, {
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
        Users.deleteViaApi(user.userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
      });

      it(
        'C366531 Verify that user without permission can\'t link "MARC Bib" field to "MARC Authority" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C366531'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBibRecord();
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.updateExistingField(testData.tag245, newTitle);

          QuickMarcEditor.checkLinkButtonDontExist(testData.tag100);

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseDerive();
          InventoryInstance.verifyInstanceTitle(newTitle);
          InventoryInstance.checkAuthorityAppIconInSection(
            testData.contributorSectionId,
            testData.contributorValue,
            false,
          );

          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.checkLinkButtonDontExist(testData.tag100);
        },
      );
    });
  });
});
