import { DevTeams, Permissions, TestTypes } from '../../../../support/dictionary';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../support/utils/stringTools';

const alphabetLowerCase = 'abcdefghijklmnopqrstuvwxyz';
const alphabetUpperCase = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase();
const digits = '0123456789';
const specialChars = "$&+,:;=?@#|'<>.-^* ()%!";
const createdInstanceIDs = [];

describe('MARC -> MARC Bibliographic -> Create new MARC bib', () => {
  const testData = {
    marcBibTitle: 'The title: the face of a record',
    LDRValues: {
      validLDRvalue: '00000n\\\\\\a2200000uu\\4500',
      validLDR05Values: ['a', 'c', 'd', 'n', 'p', 'a', 'c'],
      validLDR06Values: ['c'],
      validLDR07Values: ['i'],
      validLDR08Values: ['a', '\\', 'a', ' ', '\\', 'a', ' '],
      validLDR17Values: [
        alphabetLowerCase[Math.floor(Math.random() * alphabetLowerCase.length)],
        alphabetUpperCase[Math.floor(Math.random() * alphabetUpperCase.length)],
        digits[Math.floor(Math.random() * digits.length)],
        specialChars[Math.floor(Math.random() * specialChars.length)],
        alphabetLowerCase[Math.floor(Math.random() * alphabetLowerCase.length)],
        alphabetUpperCase[Math.floor(Math.random() * alphabetUpperCase.length)],
        digits[Math.floor(Math.random() * digits.length)],
      ],
      validLDR18Values: [' ', '\\', 'a', 'c', 'i', 'n', 'u'],
      validLDR19Values: [' ', '\\', 'a', 'b', 'c', 'a', 'b'],
    },
  };
  function checkLDRbyPosition(value, positions) {
    QuickMarcEditor.getRegularTagContent('LDR').then((content) => {
      positions.forEach((i) => (value[i] !== ' ' ? expect(content[i]).to.eq(value[i]) : expect(content[i]).to.eq('\\')));
    });
  }

  before('Create test data', () => {
    cy.createTempUser([
      Permissions.inventoryAll.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
      Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      cy.login(testData.user.username, testData.user.password, {
        path: TopMenu.inventoryPath,
        waiter: InventoryInstances.waitContentLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken().then(() => {
      Users.deleteViaApi(testData.user.userId);
      createdInstanceIDs.forEach((instanceID) => {
        InventoryInstance.deleteInstanceViaApi(instanceID);
      });
    });
  });

  it(
    'C380705 Creating a new "MARC bib" record with valid LDR 05, 08, 17, 18, 19 values (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      for (let i = 0; i < testData.LDRValues.validLDR19Values.length; i++) {
        const updatedLDRvalue = `${testData.LDRValues.validLDRvalue.substring(0, 5)}${
          testData.LDRValues.validLDR05Values[i]
        }${testData.LDRValues.validLDR06Values[0]}${testData.LDRValues.validLDR07Values[0]}${
          testData.LDRValues.validLDR08Values[i]
        }${testData.LDRValues.validLDRvalue.substring(9, 17)}${
          testData.LDRValues.validLDR17Values[i]
        }${testData.LDRValues.validLDR18Values[i]}${
          testData.LDRValues.validLDR19Values[i]
        }${testData.LDRValues.validLDRvalue.substring(20, 24)}`;
        const title = getRandomPostfix();
        // Click on "Actions" buttons in second pane → Select "+New MARC Bib Record" option
        InventoryInstance.newMarcBibRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.checkSubfieldsAbsenceInTag008();
        // Fill "$a" value in "245" field (for example, input "The title: the face of a record")
        QuickMarcEditor.updateExistingField('245', `$a ${title}`);
        // Replace blank values in LDR positions 06, 07 with valid values
        // * Edit "05" position of "LDR" field with one of the valid values
        // * Edit "08" position of "LDR" field with one of the valid values
        // * Edit "17" position of "LDR" field with one of the valid values
        // * Edit "18" position of "LDR" field with one of the valid values
        // * Edit "19" position of "LDR" field with one of the valid values
        QuickMarcEditor.updateExistingField('LDR', updatedLDRvalue);
        // The boxes are displayed in "008" field with "\" value
        QuickMarcEditor.checkSubfieldsPresenceInTag008();
        // Click "Save & close" button
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        InventoryInstance.waitInstanceRecordViewOpened(title);
        // Click on "Actions" buttons in second pane → Select "Edit MARC bibliographic record" option
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();
        QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(createdInstanceIDs);
        // * Editing view for created record is opened in a new pane
        // * Values entered at Step 4 are shown in "LDR" field, positions 05, 08, 17, 18, 19
        QuickMarcEditor.checkContent(`$a ${title}`, 4);
        checkLDRbyPosition(updatedLDRvalue, [5, 8, 17, 18, 19]);
        // Close editing window of "MARC bib" record
        QuickMarcEditor.closeWithoutSaving();
      }
    },
  );
});
