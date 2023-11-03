import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';

describe('Create new MARC bib', () => {
  const testData = {
    marcBibTitle: 'The title: the face of a record',
    marcBibTitle2: 'Another title',
    positions: [5, 6, 7, 8, 18, 19],
    validLDRValue: '00000naa\\a2200000uu\\4500',
    invalidLDRvalue: '000001b!ba2200000u$f4500',
    invalidLDRValues: {
      5: '1',
      6: 'b',
      7: '!',
      8: 'b',
      18: '$',
      19: 'f',
    },
    LDR0607Combinations: {
      invalidLDR06InvalidLDR07Set1: [
        ['m', 'p'],
        ['e', 'p'],
        ['f', 'p'],
        ['c', 'p'],
        ['d', 'p'],
        ['i', 'p'],
        ['j', 'p'],
        ['g', 'p'],
        ['k', 'p'],
        ['o', 'p'],
        ['r', 'p'],
        ['p', 'p'],
      ],
      invalidLDR06InvalidLDR07Set2: [
        ['a', 'p'],
        ['a', 'q'],
      ],
      invalidLDR06ValidLDR07: [
        ['h', 'a'],
        ['u', 'b'],
        ['b', 'm'],
      ],
      validLDR06InvalidLDR07: [
        ['b', 'e'],
        ['h', 't'],
        ['v', '$'],
      ],
    },
  };

  function trySaveWithInvalidLdrValue(position, value) {
    QuickMarcEditor.updateLDRvalueByPosition(position, value);
    QuickMarcEditor.pressSaveAndClose();
    QuickMarcEditor.verifyInvalidLDRValueCallout(position);
    QuickMarcEditor.verifyInvalidLDRCalloutLink();
    QuickMarcEditor.closeCallout();
  }

  before('Create test data', () => {
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
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C380706 Creating a new "MARC bib" record with invalid LDR 05, 06, 07, 08, 17, 18, 19 values (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      InventoryInstance.newMarcBibRecord();
      QuickMarcEditor.updateExistingField('245', `$a ${testData.marcBibTitle}`);
      testData.positions.forEach((position) => {
        trySaveWithInvalidLdrValue(position, testData.invalidLDRValues[position]);
      });
      QuickMarcEditor.updateExistingField('LDR', testData.invalidLDRvalue);
      QuickMarcEditor.pressSaveAndClose();
      QuickMarcEditor.verifyInvalidLDRValueCallout(testData.positions);
      QuickMarcEditor.closeCallout();
      QuickMarcEditor.closeWithoutSavingAfterChange();
    },
  );
});
