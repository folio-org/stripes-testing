import { including } from '@interactors/html';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import {
  getAuthoritySpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        authorityHeading: `AT_C514945_MarcAuthority_${randomPostfix}`,
        tag100: '100',
        tag130: '130',
        tag983: '983',
        // 1XX field content with undefined indicator and subfield codes
        field1XXContent:
          '$a Edit MARC authority $b with ind and subfield codes not specified in rules',
        field1XXInd1: '5',
        field1XXInd2: '0',
        // Local field 983 content with all undefined subfields
        localFieldContent:
          '$a Local field with local indicator $b Subfield b $c Subfield c $d Subfield d' +
          ' $e Subfield e $f Subfield f $g Subfield g $h Subfield h $i Subfield i' +
          ' $j Subfield j $k Subfield k $l Subfield l $m Subfield m $n Subfield n' +
          ' $i Subfield i $o Subfield o $p Subfield p $q Subfield q $r Subfield r' +
          ' $s Subfield s $t Subfield t $u Subfield u $v Subfield v $w Subfield w' +
          ' $x Subfield x $y Subfield y $z Subfield z $1 Subfield 1 $2 Subfield 2' +
          ' $3 Subfield 3 $4 Subfield 4 $5 Subfield 5 $6 Subfield 6 $7 Subfield 7' +
          ' $8 Subfield 8 $9 Subfield 9 $0 Subfield 0',
        localFieldInd1: '1',
        localFieldInd2: '2',
        // After deleting $9 and $0 values (keeping the subfield codes but empty)
        localFieldContentEmptyLastSubfields:
          '$a Local field with local indicator $b Subfield b $c Subfield c $d Subfield d' +
          ' $e Subfield e $f Subfield f $g Subfield g $h Subfield h $i Subfield i' +
          ' $j Subfield j $k Subfield k $l Subfield l $m Subfield m $n Subfield n' +
          ' $i Subfield i $o Subfield o $p Subfield p $q Subfield q $r Subfield r' +
          ' $s Subfield s $t Subfield t $u Subfield u $v Subfield v $w Subfield w' +
          ' $x Subfield x $y Subfield y $z Subfield z $1 Subfield 1 $2 Subfield 2' +
          ' $3 Subfield 3 $4 Subfield 4 $5 Subfield 5 $6 Subfield 6 $7 Subfield 7' +
          ' $8 Subfield 8 $9 $0',
        // After removing empty $9 and $0 subfields
        localFieldContentWithoutEmptySubfields:
          '$a Local field with local indicator $b Subfield b $c Subfield c $d Subfield d' +
          ' $e Subfield e $f Subfield f $g Subfield g $h Subfield h $i Subfield i' +
          ' $j Subfield j $k Subfield k $l Subfield l $m Subfield m $n Subfield n' +
          ' $i Subfield i $o Subfield o $p Subfield p $q Subfield q $r Subfield r' +
          ' $s Subfield s $t Subfield t $u Subfield u $v Subfield v $w Subfield w' +
          ' $x Subfield x $y Subfield y $z Subfield z $1 Subfield 1 $2 Subfield 2' +
          ' $3 Subfield 3 $4 Subfield 4 $5 Subfield 5 $6 Subfield 6 $7 Subfield 7' +
          ' $8 Subfield 8',
      };

      const localFieldPayload = {
        tag: '983',
        label: `AT_C514945_LocalField_${randomPostfix}`,
        url: 'http://www.example.org/field983.html',
        repeatable: true,
        required: false,
        deprecated: false,
      };

      const indicatorWarningText = (position, value) => `Warn: ${position === 0 ? 'First' : 'Second'} Indicator '${value}' is undefined.Help`;

      const subfieldWarningText = (code) => `Warn: Subfield '${code}' is undefined.`;

      let createdAuthorityId;
      let specId;
      let localFieldId;
      let authSpecId;

      before('Create test data and enable undefined validation rules', () => {
        cy.getAdminToken();

        // Enable undefined validation rules for authority spec
        getAuthoritySpec().then((spec) => {
          specId = spec.id;
          toggleAllUndefinedValidationRules(specId, { enable: true });
        });

        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514945_MarcAuthority');

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          // Create a local field 983 in the authority specification (no indicators/subfields defined)
          cy.getSpecificationIds().then((specs) => {
            const authSpec = specs.find((s) => s.profile === 'authority');
            /* eslint-disable no-unused-expressions */
            expect(authSpec, 'MARC authority specification exists').to.exist;
            authSpecId = authSpec.id;

            cy.deleteSpecificationFieldByTag(authSpecId, localFieldPayload.tag, false).then(() => {
              cy.createSpecificationField(authSpecId, localFieldPayload).then((fieldResp) => {
                expect(fieldResp.status).to.eq(201);
                localFieldId = fieldResp.body.id;
              });
            });
          });

          // Create MARC authority record via API
          MarcAuthorities.createMarcAuthorityViaAPI('n', '503162', [
            {
              tag: testData.tag130,
              content: `$a ${testData.authorityHeading}`,
              indicators: ['\\', '\\'],
            },
          ]).then((createdRecordId) => {
            createdAuthorityId = createdRecordId;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        if (createdAuthorityId) {
          MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        }
        Users.deleteViaApi(testData.userProperties.userId);
        toggleAllUndefinedValidationRules(specId, { enable: false });
        if (localFieldId) {
          cy.deleteSpecificationFieldByTag(authSpecId, localFieldPayload.tag, false);
        }
      });

      it(
        'C514945 Edit MARC authority record with undefined Indicators / Subfield codes in Standard and Local fields when "Undefined" rules are enabled (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C514945'] },
        () => {
          // Step 1: Search for the authority record, open detail view and click edit
          MarcAuthorities.searchBy('Keyword', testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          // Step 2: Update 1XX field with undefined indicator and subfield codes
          // ex.: 130 50 "$a Edit MARC authority $b with ind and subfield codes not specified in rules"
          QuickMarcEditor.updateIndicatorValue(testData.tag130, testData.field1XXInd1, 0);
          QuickMarcEditor.updateIndicatorValue(testData.tag130, testData.field1XXInd2, 1);
          QuickMarcEditor.updateExistingField(testData.tag130, testData.field1XXContent);

          // Step 3: Add local field 983 with undefined indicator and all possible undefined subfields
          QuickMarcEditor.addEmptyFields(5);
          QuickMarcEditor.checkEmptyFieldAdded(6);
          QuickMarcEditor.addValuesToExistingField(
            5,
            testData.tag983,
            testData.localFieldContent,
            testData.localFieldInd1,
            testData.localFieldInd2,
          );

          // Step 4: Click "Save & close" - validation warnings should appear
          QuickMarcEditor.pressSaveAndCloseButton();

          // Verify validation callout toast with warn errors
          QuickMarcEditor.verifyValidationCallout(41);

          // Verify inline warning messages below 1XX field (130)
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag130,
            including(indicatorWarningText(0, testData.field1XXInd1)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag130,
            including(subfieldWarningText('b')),
          );

          // Verify inline warning messages below local field (983)
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(indicatorWarningText(0, testData.localFieldInd1)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(indicatorWarningText(1, testData.localFieldInd2)),
          );
          // Verify subfield warnings for local field - check a few representative subfields
          ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].forEach((code) => {
            QuickMarcEditor.checkWarningMessageForFieldByTag(
              testData.tag983,
              including(subfieldWarningText(code)),
            );
          });

          // Verify "Save & close" and "Save & keep editing" buttons are enabled
          QuickMarcEditor.checkButtonsEnabled();

          // Step 5: Delete values from the last two subfield codes ($0 and $9) of local field
          // Updated local field: 983 12 with $9 and $0 empty
          QuickMarcEditor.updateExistingField(
            testData.tag983,
            testData.localFieldContentEmptyLastSubfields,
          );

          cy.wait(2000);

          // Step 6: Click "Save & close" again - validation warnings should still appear
          QuickMarcEditor.pressSaveAndCloseButton();

          // Verify validation callout still present
          QuickMarcEditor.verifyValidationCallout(39);

          // Verify inline warnings for 1XX field remain
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag130,
            including(indicatorWarningText(0, testData.field1XXInd1)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag130,
            including(subfieldWarningText('b')),
          );

          // Verify inline warnings for local field remain (without $0 warning since it's empty)
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(indicatorWarningText(0, testData.localFieldInd1)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(indicatorWarningText(1, testData.localFieldInd2)),
          );

          // Verify "Save & close" and "Save & keep editing" buttons are still enabled
          QuickMarcEditor.checkButtonsEnabled();

          // Step 7: Remove empty subfields $9 and $0 from local field
          QuickMarcEditor.updateExistingField(
            testData.tag983,
            testData.localFieldContentWithoutEmptySubfields,
          );

          cy.wait(2000);

          // Step 8: Click "Save & close" - validation warnings should still appear
          QuickMarcEditor.pressSaveAndCloseButton();

          // Verify validation callout still present
          QuickMarcEditor.verifyValidationCallout(39);

          // Verify inline warnings for 1XX field remain
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag130,
            including(indicatorWarningText(0, testData.field1XXInd1)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag130,
            including(subfieldWarningText('b')),
          );

          // Verify inline warnings for local field remain
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(indicatorWarningText(0, testData.localFieldInd1)),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag983,
            including(indicatorWarningText(1, testData.localFieldInd2)),
          );

          // Verify "Save & close" and "Save & keep editing" buttons are still enabled
          QuickMarcEditor.checkButtonsEnabled();

          // Step 9: Click "Save & keep editing" - record should be saved successfully
          QuickMarcEditor.clickSaveAndKeepEditing();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();

          // Verify editor pane is still open and buttons are disabled after successful save
          QuickMarcEditor.checkButtonsDisabled();

          // Verify empty subfields $9 and $0 don't display in 983 field after save
          QuickMarcEditor.checkContentByTag(
            testData.tag983,
            including(testData.localFieldContentWithoutEmptySubfields),
          );

          // Step 10: Close quickmarc pane - detail view is displayed
          QuickMarcEditor.closeAuthorityEditorPane();
          MarcAuthority.waitLoading();

          // Verify empty subfields $9 and $0 don't appear in detail view of 983 field
          MarcAuthority.notContains('$9');
          MarcAuthority.notContains('$0');
        },
      );
    });
  });
});
