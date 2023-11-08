import { Keyboard } from '@interactors/keyboard';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import { Button } from '../../../interactors';

describe('Create new MARC bib', () => {
  const testData = {
    marcBibTitle: 'The title: the face of a record',
    marcBibTitle2: 'Another title',
    positions: [5, 6, 7, 8, 18, 19],
    validLDRValue: '00000naa\\a2200000uu\\4500',
    invalidLDRvalue: '000001b!ba2200000u$f4500',
    fieldValues: [
      { tag: '035', content: '$a test1' },
      { tag: '240', content: '$a test2 $a test3 $a test4' },
      { tag: '300', content: '$a test5 $a test6' },
    ],
  };

  before('Create test data', () => {
    cy.getAdminToken();
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C380717 Verify focus behavior when using field level action icons upon creation of a new "MARC bib" record (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      testData.fieldValues.forEach(({ tag, content }, index) => {
        const rowIndex = index + 4;
        QuickMarcEditor.addNewField(tag, content, rowIndex);
        QuickMarcEditor.verifyEditableFieldIcons(rowIndex + 1);
      });
      QuickMarcEditor.waitLoading();
      QuickMarcEditor.moveFieldUp(7);
      QuickMarcEditor.verifyAfterMovingFieldUp(6, '300', '$a test2 $a test3 $a test4');
      // press Enter - and check again
      cy.wait(2000);
      cy.get('[aria-labelledby="moving-row-move-up-6-text"]').type('{enter}');
      // cy.doButton({ ariaLabel: 'arrow-up' }).focus();
      // cy.do(Keyboard.press({ code: 'Enter' }));
      // QuickMarcEditor.verifyAfterMovingFieldUp(5, '300', '$a test2 $a test3 $a test4');
      // keep moving field up until row is = 4
      // The "Move field up a row" icon doesn't display next to the row
      // The focus moves to the "Move field down a row" icon
    },
  );
});
