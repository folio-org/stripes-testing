import { including } from '@interactors/html';
import Permissions from '../../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import {
  getBibliographicSpec,
  toggleAllUndefinedValidationRules,
  generateTestFieldData,
} from '../../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      const testData = {
        instanceTitle: `AT_C514911_MarcBibInstance_${getRandomPostfix()}`,
        tag245: '245',
        tag983: '983',
        // 245 field values with undefined indicator and subfield
        field245Indicator0: '8',
        field245Content:
          '$a Edit MARC bib $t Indicator, Subfield codes not specified in MARC validation rules',
        // 983 local field with undefined indicators and many subfields
        field983Indicator0: '1',
        field983Indicator1: '2',
        field983Content:
          '$a Local field with local indicator $b Subfield b $c Subfield c $d Subfield d $e Subfield e $f Subfield f $g Subfield g $h Subfield h $i Subfield i $j Subfield j $k Subfield k $l Subfield l $m Subfield m $n Subfield n $i Subfield i $o Subfield o $p Subfield p $q Subfield q $r Subfield r $s Subfield s $t Subfield t $u Subfield u $v Subfield v $w Subfield w $x Subfield x $y Subfield y $z Subfield z $1 Subfield 1 $2 Subfield 2 $3 Subfield 3 $4 Subfield 4 $5 Subfield 5 $6 Subfield 6 $7 Subfield 7 $8 Subfield 8 $9 Subfield 9 $0 Subfield 0',
        // Same content but with $0 value cleared (empty subfield)
        field983ContentWithEmpty0:
          '$a Local field with local indicator $b Subfield b $c Subfield c $d Subfield d $e Subfield e $f Subfield f $g Subfield g $h Subfield h $i Subfield i $j Subfield j $k Subfield k $l Subfield l $m Subfield m $n Subfield n $i Subfield i $o Subfield o $p Subfield p $q Subfield q $r Subfield r $s Subfield s $t Subfield t $u Subfield u $v Subfield v $w Subfield w $x Subfield x $y Subfield y $z Subfield z $1 Subfield 1 $2 Subfield 2 $3 Subfield 3 $4 Subfield 4 $5 Subfield 5 $6 Subfield 6 $7 Subfield 7 $8 Subfield 8 $9 Subfield 9 $0',
        // Content after removing empty $0 subfield
        field983ContentWithout0:
          '$a Local field with local indicator $b Subfield b $c Subfield c $d Subfield d $e Subfield e $f Subfield f $g Subfield g $h Subfield h $i Subfield i $j Subfield j $k Subfield k $l Subfield l $m Subfield m $n Subfield n $i Subfield i $o Subfield o $p Subfield p $q Subfield q $r Subfield r $s Subfield s $t Subfield t $u Subfield u $v Subfield v $w Subfield w $x Subfield x $y Subfield y $z Subfield z $1 Subfield 1 $2 Subfield 2 $3 Subfield 3 $4 Subfield 4 $5 Subfield 5 $6 Subfield 6 $7 Subfield 7 $8 Subfield 8 $9 Subfield 9',
        // Warning messages
        indicatorWarningText: (index, value) => `Warn: ${index ? 'Second' : 'First'} Indicator '${value}' is undefined.`,
        subfieldWarningText: (code) => `Warn: Subfield '${code}' is undefined.`,
      };

      const createdRecordIDs = [];
      let user;
      let specId;
      let field983Id;

      before('Create user, enable validation rules, create MARC bib record', () => {
        cy.getAdminToken();
        getBibliographicSpec().then((bibSpec) => {
          specId = bibSpec.id;

          // Create local field 983 in MARC bib spec (no indicator or subfield codes defined)
          const field983Data = generateTestFieldData('C514911', {
            tag: '983',
            label: 'Local_Field_983',
            scope: 'local',
            repeatable: true,
            required: false,
          });
          cy.createSpecificationField(specId, field983Data, false).then((fieldResponse) => {
            field983Id = fieldResponse.body.id;
          });

          // Enable all "Undefined" validation rules for MARC bib
          toggleAllUndefinedValidationRules(specId, { enable: true });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorCreate.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcEditorDuplicate.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;

          cy.createSimpleMarcBibViaAPI(testData.instanceTitle).then((instanceId) => {
            createdRecordIDs.push(instanceId);
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            cy.reload();
            InventoryInstances.waitContentLoading();
          });
        });
      });

      after('Delete user, disable validation rules, delete MARC bib instance', () => {
        cy.getAdminToken();
        getBibliographicSpec().then(({ id }) => {
          toggleAllUndefinedValidationRules(id, { enable: false });
        });
        if (user) {
          Users.deleteViaApi(user.userId);
        }
        createdRecordIDs.forEach((recordId) => {
          InventoryInstance.deleteInstanceViaApi(recordId);
        });
        if (field983Id) {
          cy.deleteSpecificationField(field983Id, false);
        }
      });

      it(
        'C514911 Edit MARC bib record with undefined Indicators / Subfield codes in Standard and Local fields when "Undefined" rules are enabled (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C514911', 'nonParallel'] },
        () => {
          // Step 1: Open the instance and start editing
          InventoryInstances.searchByTitle(createdRecordIDs[0]);
          InventoryInstances.selectInstanceById(createdRecordIDs[0]);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();

          // marc record was created via API, which accepts invalid 008 values
          // before continuing - update these values to be valid
          QuickMarcEditor.updateLDR06And07Positions();

          // Step 2: Update 245 field - set undefined first indicator and subfield $t
          QuickMarcEditor.updateIndicatorValue(testData.tag245, testData.field245Indicator0, 0);
          QuickMarcEditor.updateExistingField(testData.tag245, testData.field245Content);

          cy.wait(2000);
          // Step 3: Add local field 983 with undefined indicators and many subfields
          QuickMarcEditor.addNewField(testData.tag983, testData.field983Content, 4);
          QuickMarcEditor.updateIndicatorValue(testData.tag983, testData.field983Indicator0, 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag983, testData.field983Indicator1, 1);

          // Step 4: Click "Save & keep editing" - verify 42 warn messages
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyValidationCallout(42);

          // Verify inline warnings on 245 field
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag245,
            including(testData.indicatorWarningText(0, testData.field245Indicator0)),
          );

          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag245,
            including(`${testData.subfieldWarningText('t')}Help`),
          );
          // Verify inline warnings on 983 field (indicators + all subfields)
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.indicatorWarningText(0, testData.field983Indicator0)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.indicatorWarningText(1, testData.field983Indicator1)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.subfieldWarningText('a')),
          );

          // Save & close and Save & keep editing buttons are enabled with warnings
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();

          // Step 5: Delete value from the last subfield $0 (clears it to empty)
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.updateExistingField(testData.tag983, testData.field983ContentWithEmpty0);

          cy.wait(2000);
          // Step 6: Click "Save & keep editing" again - verify 41 warn messages (empty $0 excluded)
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyValidationCallout(41);

          // Verify inline warnings on 245 field (same as before)
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag245,
            including(testData.indicatorWarningText(0, testData.field245Indicator0)),
          );

          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag245,
            including(`${testData.subfieldWarningText('t')}Help`),
          );
          // Verify inline warnings on 983 field (all subfields except empty $0)
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.indicatorWarningText(0, testData.field983Indicator0)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.indicatorWarningText(1, testData.field983Indicator1)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.subfieldWarningText('a')),
          );

          // Save & close and Save & keep editing buttons remain enabled
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();

          // Step 7: Remove the empty $0 subfield from local field 983
          QuickMarcEditor.closeAllCallouts();
          QuickMarcEditor.updateExistingField(testData.tag983, testData.field983ContentWithout0);

          cy.wait(2000);
          // Step 8: Click "Save & keep editing" again - verify 41 warn messages
          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyValidationCallout(41);

          // Verify inline warnings on 245 field (same)
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag245,
            including(testData.indicatorWarningText(0, testData.field245Indicator0)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag245,
            including(`${testData.subfieldWarningText('t')}Help`),
          );
          // Verify inline warnings on 983 field (all remaining subfields without $0)
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.indicatorWarningText(0, testData.field983Indicator0)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.indicatorWarningText(1, testData.field983Indicator1)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(testData.subfieldWarningText('a')),
          );

          // Save & close and Save & keep editing buttons remain enabled
          QuickMarcEditor.checkButtonSaveAndCloseEnable();
          QuickMarcEditor.verifySaveAndKeepEditingButtonEnabled();

          // Step 9: Click "Save & keep editing" one more time - record saves successfully
          QuickMarcEditor.closeAllCallouts();
          // clickSaveAndKeepEditing intercepts the save request and verifies success callout
          QuickMarcEditor.clickSaveAndKeepEditing();

          // Verify buttons are disabled after successful save
          QuickMarcEditor.verifySaveAndKeepEditingButtonDisabled();
          QuickMarcEditor.verifySaveAndCloseButtonDisabled();
        },
      );
    });
  });
});
