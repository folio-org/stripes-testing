import moment from 'moment';
import { including } from '@interactors/html';
import { Permissions } from '../../../../support/dictionary';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        title: `AT_C916264_Create_MARC_bib_without_005_${getRandomPostfix()}`,
        tag005: '005',
        tag245: '245',
        tag333: '333',
        field245Content: '$a Create MARC bibliographic without 005',
      };

      let userProperties;

      before('Create test user and login', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          userProperties = createdUserProperties;

          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(userProperties.userId);
        InventoryInstances.deleteInstanceByTitleViaApi(testData.title);
      });

      it(
        'C916264 Create MARC bibliographic record without "005" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C916264'] },
        () => {
          // Step 1: Click on "Actions" button >> Select "New MARC bibliographic record" option
          InventoryInstance.newMarcBibRecord();
          QuickMarcEditor.checkPaneheaderContains(/New .*MARC bib record/);

          // Step 2: Select valid values in "LDR" positions 06 (Type), 07 (BLvl)
          QuickMarcEditor.updateLDR06And07Positions();
          QuickMarcEditor.check008FieldContent();

          // Step 4: Fill in "245" field with data which contains backslashes
          QuickMarcEditor.updateExistingField(testData.tag245, testData.field245Content);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag245, '1', 1);
          QuickMarcEditor.checkContentByTag(testData.tag245, testData.field245Content);

          // Step 5: Update tag of "005" field to some which could be deleted (ex: "333")
          QuickMarcEditor.updateExistingTagName(testData.tag005, testData.tag333);
          cy.wait(500);

          // Step 6: Delete updated field "333"
          QuickMarcEditor.deleteFieldByTagAndCheck(testData.tag333);

          // Step 7: Click on the "Save & keep editing" button
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.confirmDelete();
          cy.wait(2000);

          QuickMarcEditor.checkContentByTag(
            testData.tag005,
            including(moment().format('YYYYMMDD')),
          );
        },
      );
    });
  });
});
