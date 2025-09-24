import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Create new MARC bib', () => {
      const testData = {
        user: {},
        tag008: '008',
        tag100: '100',
        tag245: '245',
        tag246: '246',
        tag700: '700',
        tag710: '710',
        tag711: '711',
      };

      const initialFieldValues = {
        field100: { tag: testData.tag100, value: '$a A{dollar}AP Rocky $c (Rapper), $d 1988-' },
        field245: {
          tag: testData.tag245,
          value: '$a C451562 Long. Live. A{dollar}AP $h [sound recording] / $c A{dollar}AP Rocky',
        },
        field246: { tag: testData.tag246, value: '$a Long live ASAP' },
      };

      const newFieldValues = {
        field245: { tag: testData.tag245, value: `${initialFieldValues.field245.value} Derived.` },
        field246: {
          tag: testData.tag246,
          value: initialFieldValues.field246.value.replace('S', '{dollar}'),
        },
        field700: { tag: testData.tag700, value: '$A upper case first code test' },
        field710: { tag: testData.tag710, value: '$a upper case $B not First $C Code $d TEST' },
        field711: { tag: testData.tag711, value: '$B A$AP $bp' },
      };

      const expectedInstanceDetails = {
        resourceTitle: 'C451562 Long. Live. A$AP [sound recording] / A$AP Rocky Derived.',
        alternativeTitle: 'Long live A$AP',
        contributors: [
          'A$AP Rocky (Rapper), 1988-',
          'upper case first code test',
          'upper case not First Code TEST',
          'A P p',
        ],
      };

      const marcInstanceFields = [
        {
          tag: testData.tag008,
          content: QuickMarcEditor.defaultValid008Values,
        },
      ];

      Object.values(initialFieldValues).forEach((field) => {
        marcInstanceFields.push({
          tag: field.tag,
          content: field.value,
          indicators: ['\\', '\\'],
        });
      });

      const fieldsAfterSave = {
        field100: { tag: testData.tag100, value: initialFieldValues.field100.value },
        field245: { tag: testData.tag245, value: newFieldValues.field245.value },
        field246: { tag: testData.tag246, value: newFieldValues.field246.value },
        field700: { tag: testData.tag700, value: '$a upper case first code test' },
        field710: { tag: testData.tag710, value: '$a upper case $b not First $c Code $d TEST' },
        field711: { tag: testData.tag711, value: '$b A $a P $b p' },
      };

      let createdInstanceId;

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiInventoryViewInstances.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((userProperties) => {
          testData.user = userProperties;

          cy.createMarcBibliographicViaAPI(
            QuickMarcEditor.defaultValidLdr,
            marcInstanceFields,
          ).then((instanceId) => {
            createdInstanceId = instanceId;

            cy.waitForAuthRefresh(() => {
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.user.userId);
        InventoryInstances.deleteInstanceByTitleViaApi('C451562');
      });

      it(
        'C451562 Derive "MARC bibliographic" record which has "$" sign ("{dollar}" code) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C451562'] },
        () => {
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.deriveNewMarcBib();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.updateLDR06And07Positions();

          QuickMarcEditor.updateExistingField(testData.tag246, newFieldValues.field246.value);
          QuickMarcEditor.updateExistingField(testData.tag245, newFieldValues.field245.value);

          for (let i = 0; i < 3; i++) {
            QuickMarcEditor.addEmptyFields(3 + i);
            QuickMarcEditor.checkEmptyFieldAdded(4 + i);
          }
          cy.wait(1000);

          QuickMarcEditor.addValuesToExistingField(
            3,
            testData.tag700,
            newFieldValues.field700.value,
          );
          QuickMarcEditor.addValuesToExistingField(
            4,
            testData.tag710,
            newFieldValues.field710.value,
          );
          QuickMarcEditor.addValuesToExistingField(
            5,
            testData.tag711,
            newFieldValues.field711.value,
          );

          QuickMarcEditor.saveAndKeepEditingWithValidationWarnings();
          QuickMarcEditor.checkAfterSaveAndKeepEditingDerive();
          QuickMarcEditor.waitLoading();

          Object.values(fieldsAfterSave).forEach((field) => {
            QuickMarcEditor.checkContentByTag(field.tag, field.value);
          });

          QuickMarcEditor.closeEditorPane();
          InventoryInstance.waitLoading();

          InventoryInstance.checkInstanceTitle(expectedInstanceDetails.resourceTitle);
          InventoryInstance.verifyAlternativeTitle(0, 1, expectedInstanceDetails.alternativeTitle);
          expectedInstanceDetails.contributors.forEach((contributor) => {
            InventoryInstance.checkContributor(contributor);
          });
        },
      );
    });
  });
});
