import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        user: {},
        fields: {
          field100: '$a Ke{dollar}ha (test {dollar} sign)',
          field245: '$a C451563 Title - {dollar}{dollar}{dollar} $b {dollar}100',
          field600: '$a Cost 50{dollar}, field for test',
          field700: '$A upper case first code test',
          field710: '$a upper case $B not First $C Code $d TEST',
          field711: '$B A$AP $bp',
          field800: '$a US dollars ({dollar}) - field for test',
        },
        expectedInstanceDetails: {
          resourceTitle: 'C451563 Title - $$$ $100',
          seriesStatement: 'US dollars ($) - field for test',
          contributors: [
            'Ke$ha (test $ sign)',
            'upper case first code test',
            'upper case not First Code TEST',
            'A P p',
          ],
          subject: 'Cost 50$, field for test',
        },
      };

      const fieldsAfterSave = {
        field100: testData.fields.field100,
        field245: testData.fields.field245,
        field600: testData.fields.field600,
        field800: testData.fields.field800,
        field700: '$a upper case first code test',
        field710: '$a upper case $b not First $c Code $d TEST',
        field711: '$b A $a P $b p',
      };

      const expectedSourceFields = [
        '100\t   \t$a Ke$ha (test $ sign)',
        '245\t   \t$a C451563 Title - $$$ $b $100',
        '600\t   \t$a Cost 50$, field for test',
        '700\t   \t$a upper case first code test',
        '710\t   \t$a upper case $b not First $c Code $d TEST',
        '711\t   \t$b A $a P $b p',
        '800\t   \t$a US dollars ($) - field for test',
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.waitForAuthRefresh(() => {
            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('C451563');
      });

      it(
        'C451563 Create "MARC bibliographic" record which has "$" sign ("{dollar}" code) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C451563'] },
        () => {
          // Step 1: Click on "Actions" button → Select "+ New MARC bibliographic record" option
          InventoryInstances.createNewMarcBibRecord();
          QuickMarcEditor.waitLoading();

          // Steps 2, 3: Select valid values in "LDR" and "008" fields
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 4: Add new fields by clicking on "+" icon and fill specified fields
          // Add 7 new fields
          for (let i = 0; i < 7; i++) {
            QuickMarcEditor.addEmptyFields(3 + i);
          }
          cy.wait(1000);

          // Fill fields with values with dollar signs
          QuickMarcEditor.addValuesToExistingField(3, '100', testData.fields.field100);
          QuickMarcEditor.addValuesToExistingField(4, '245', testData.fields.field245);
          QuickMarcEditor.addValuesToExistingField(5, '600', testData.fields.field600);
          QuickMarcEditor.addValuesToExistingField(6, '800', testData.fields.field800);
          QuickMarcEditor.addValuesToExistingField(7, '700', testData.fields.field700);
          QuickMarcEditor.addValuesToExistingField(8, '710', testData.fields.field710);
          QuickMarcEditor.addValuesToExistingField(9, '711', testData.fields.field711);

          // Step 5: Click "Save & keep editing" button
          QuickMarcEditor.saveAndKeepEditingWithValidationWarnings();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.waitLoading();

          // Verify fields are displayed correctly in QuickMARC editor
          QuickMarcEditor.checkContent(fieldsAfterSave.field100, 4);
          QuickMarcEditor.checkContent(fieldsAfterSave.field245, 5);
          QuickMarcEditor.checkContent(fieldsAfterSave.field600, 6);
          QuickMarcEditor.checkContent(fieldsAfterSave.field800, 7);
          QuickMarcEditor.checkContent(fieldsAfterSave.field700, 8);
          QuickMarcEditor.checkContent(fieldsAfterSave.field710, 9);
          QuickMarcEditor.checkContent(fieldsAfterSave.field711, 10);

          // Step 6: Close "quickMARC" pane
          QuickMarcEditor.closeEditorPane();

          // Verify user is redirected to Inventory with created MARC Bib record
          InventoryInstance.waitLoading();

          // Verify detail view contains expected fields
          // Check Resource title
          InventoryInstance.checkInstanceTitle(testData.expectedInstanceDetails.resourceTitle);

          // Check Series statement
          InventoryInstance.verifySeriesStatement(
            0,
            testData.expectedInstanceDetails.seriesStatement,
          );

          // Check Contributors
          testData.expectedInstanceDetails.contributors.forEach((contributor, index) => {
            InventoryInstance.verifyContributor(index, 1, contributor);
          });

          // Check Subject
          InventoryInstance.verifySubjectHeading(testData.expectedInstanceDetails.subject);

          // Step 7: Click on the "Actions" → Select "View source" option
          InventoryInstance.viewSource();

          // Verify source view contains expected MARC fields with dollar signs properly displayed
          expectedSourceFields.forEach((field) => {
            InventoryViewSource.contains(field);
          });
        },
      );
    });
  });
});
