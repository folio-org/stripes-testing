import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import InventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import QuickMarcEditor from '../../support/fragments/quickMarcEditor';
import { QuickMarcEditorRow, TextArea } from '../../../interactors';
import getRandomPostfix, { replaceByIndex } from '../../support/utils/stringTools';
import Arrays, { randomizeArray } from '../../support/utils/arrays';

const alphabetLowerCase = 'abcdefghijklmnopqrstuvwxyz';
const alphabetUpperCase = 'abcdefghijklmnopqrstuvwxyz'.toUpperCase();
const digits = '0123456789';
const specialChars = "$&+,:;=?@#|'<>.-^* ()%!";
let createdInstanceIDs;

describe('Create new MARC bib', () => {
  const testData = {
    marcBibTitle: 'The title: the face of a record',
    validLDRValues: {
      validLDR05Values: randomizeArray(['a', 'c', 'd', 'n', 'p']),
      validLDR06Values: ['c'],
      validLDR07Values: ['i'],
      validLDR08Values: randomizeArray([' ', '\\', 'a']),
      validLDR17Values: randomizeArray([
        alphabetLowerCase[Math.floor(Math.random() * alphabetLowerCase.length)],
        alphabetUpperCase[Math.floor(Math.random() * alphabetUpperCase.length)],
        digits[Math.floor(Math.random() * digits.length)],
        specialChars[Math.floor(Math.random() * specialChars.length)],
      ]),
      validLDR18Values: randomizeArray([' ', '\\', 'a', 'c', 'i', 'n', 'u']),
      validLDR19Values: randomizeArray([' ', '\\', 'a', 'b', 'c']),
    },
  };

  // function updateLDRbyPosition(position, value) {
  // QuickMarcEditor.getRegularTagContent('LDR').then((initialValue) => {
  //   const updatedValue = replaceByIndex(initialValue, position, value);
  //   QuickMarcEditor.updateExistingField('LDR', updatedValue);
  // });

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
    Users.deleteViaApi(testData.user.userId);
    createdInstanceIDs.forEach((instanceID) => {
      InventoryInstance.deleteInstanceViaApi(instanceID);
    });
  });

  it(
    'C380705 Creating a new "MARC bib" record with valid LDR 05, 08, 17, 18, 19 values (spitfire) (TaaS)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      // Click on "Actions" buttons in second pane → Select "+New MARC Bib Record" option
      // A new pane with title "Create a new MARC bib record" is opened
      // Fill "$a" value in "245" field (for example, input "The title: the face of a record")
      // Filled value is shown in updated field
      // Replace blank values in LDR positions 06, 07 with valid values
      // Boxes filled with "\" are appeared in "008" field
      // * Edit "05" position of "LDR" field with one of the valid values
      // * Edit "08" position of "LDR" field with one of the valid values
      // * Edit "17" position of "LDR" field with one of the valid values
      // * Edit "18" position of "LDR" field with one of the valid values
      // * Edit "19" position of "LDR" field with one of the valid values
      // The boxes are displayed in "008" field with "\" value
      // #5 Click "Save & close" button
      // * Success toast notification is shown
      // * "Create a new MARC bib record" pane is closed
      // * Detail view for created record is opened in third pane
      // #6 Click on "Actions" buttons in second pane → Select "Edit MARC bibliographic record" option
      // * Editing view for created record is opened in a new pane
      // * Values entered at Step 4 are shown in "LDR" field, positions 05, 08, 17, 18, 19
      // #7 Close editing window of "MARC bib" record
      // The detail view of created record is displayed in the third pane.
      // #8 Repeat Steps 1-4 until you have entered all valid characters from step 3 into positions 05, 08, 17, 18, 19 of "LDR" field.
      // * Record successfully created
      // * Values entered at Step 4 are shown in "LDR" field, positions 05, 08, 17, 18, 19 in editing view
      for (let i = 0; i < testData.LDRValues.validLDR07Values.length; i++) {
        const updatedLDRvalue = `${testData.LDRValues.validLDRvalue.substring(0, 6)}${
          testData.LDRValues.validLDR06Values[i]
        }${testData.LDRValues.validLDR07Values[i]}${testData.LDRValues.validLDRvalue.substring(8)}`;
        const updatedLDRmask = new RegExp(
          `\\d{5}${updatedLDRvalue.substring(5, 12).replace('\\', '\\\\')}\\d{5}${updatedLDRvalue
            .substring(17)
            .replace('\\', '\\\\')}`,
        );
        const title = testData.fieldContents.tag245ContentPrefix + getRandomPostfix();

        InventoryInstance.newMarcBibRecord();
        QuickMarcEditor.updateExistingField(testData.tags.tag245, `$a ${title}`);
        QuickMarcEditor.updateExistingField(
          testData.tags.tagLDR,
          replaceByIndex(testData.LDRValues.validLDRvalue, 6, testData.LDRValues.invalidLDR06Value),
        );
        QuickMarcEditor.checkSubfieldsAbsenceInTag008();
        QuickMarcEditor.updateExistingField(testData.tags.tagLDR, testData.LDRValues.validLDRvalue);
        QuickMarcEditor.check008FieldContent();
        QuickMarcEditor.updateExistingField(testData.tags.tagLDR, updatedLDRvalue);
        QuickMarcEditor.checkSubfieldsPresenceInTag008();
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();
        InventoryInstance.checkInstanceTitle(title);

        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.saveInstanceIdToArrayInQuickMarc(createdInstanceIDs);
        QuickMarcEditor.checkFieldContentMatch(
          'textarea[name="records[0].content"]',
          updatedLDRmask,
        );
        QuickMarcEditor.closeWithoutSaving();
      }
    },
  );
});
