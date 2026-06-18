import { including } from '../../../../../interactors';
import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import {
  getAuthoritySpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(16);

      const testData = {
        tag130: '130',
        localFieldTag: '983',
        authorityHeading: `AT_C514945_MarcAuthority_${randomPostfix}`,
        // Step 2: 130 with ind1=5 (undefined) and $b (undefined subfield for 130)
        field130Content:
          '$a AT_C514945 Edit MARC authority $b with ind and subfield codes not specified in rules',
        field130ContentUpdated:
          '$a AT_C514945 Edit MARC authority $b with ind and subfield codes not specified in rules UPD',
        field130Ind1: '5',
        field130Ind2: '0',
        // Step 3: 983 with ind1=1, ind2=2 (both undefined), all possible subfields
        field983FullContent:
          '$a Local field with local indicator $b Subfield b $c Subfield c $d Subfield d $e Subfield e $f Subfield f $g Subfield g $h Subfield h $i Subfield i $j Subfield j $k Subfield k $l Subfield l $m Subfield m $n Subfield n $o Subfield o $p Subfield p $q Subfield q $r Subfield r $s Subfield s $t Subfield t $u Subfield u $v Subfield v $w Subfield w $x Subfield x $y Subfield y $z Subfield z $1 Subfield 1 $2 Subfield 2 $3 Subfield 3 $4 Subfield 4 $5 Subfield 5 $6 Subfield 6 $7 Subfield 7 $8 Subfield 8 $9 Subfield 9 $0 Subfield 0',
        // Step 5: $9 and $0 values cleared (empty)
        field983EmptyLastSubfields:
          '$a Local field with local indicator $b Subfield b $c Subfield c $d Subfield d $e Subfield e $f Subfield f $g Subfield g $h Subfield h $i Subfield i $j Subfield j $k Subfield k $l Subfield l $m Subfield m $n Subfield n $o Subfield o $p Subfield p $q Subfield q $r Subfield r $s Subfield s $t Subfield t $u Subfield u $v Subfield v $w Subfield w $x Subfield x $y Subfield y $z Subfield z $1 Subfield 1 $2 Subfield 2 $3 Subfield 3 $4 Subfield 4 $5 Subfield 5 $6 Subfield 6 $7 Subfield 7 $8 Subfield 8 $9 $0',
        // Step 7: $9 and $0 subfields removed
        field983WithoutLastSubfields:
          '$a Local field with local indicator $b Subfield b $c Subfield c $d Subfield d $e Subfield e $f Subfield f $g Subfield g $h Subfield h $i Subfield i $j Subfield j $k Subfield k $l Subfield l $m Subfield m $n Subfield n $o Subfield o $p Subfield p $q Subfield q $r Subfield r $s Subfield s $t Subfield t $u Subfield u $v Subfield v $w Subfield w $x Subfield x $y Subfield y $z Subfield z $1 Subfield 1 $2 Subfield 2 $3 Subfield 3 $4 Subfield 4 $5 Subfield 5 $6 Subfield 6 $7 Subfield 7 $8 Subfield 8',
        field983Ind1: '1',
        field983Ind2: '2',
        // Expected warn messages
        warnInd1UndefinedFor130: "Warn: First Indicator '5' is undefined.",
        warnSubfieldBUndefinedFor130: "Warn: Subfield 'b' is undefined.",
        warnInd1UndefinedFor983: "Warn: First Indicator '1' is undefined.",
        warnInd2UndefinedFor983: "Warn: Second Indicator '2' is undefined.",
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let localField983Id;

      before('Get authority spec', () => {
        cy.getAdminToken();

        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
          cy.syncSpecifications(authSpecId);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(authSpecId, { enable: false });

        if (localField983Id) cy.deleteSpecificationField(localField983Id, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514945 Edit MARC authority record with undefined Indicators / Subfield codes in Standard and Local fields when "Undefined" rules are enabled (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514945'] },
        () => {
          cy.then(() => {
            toggleAllUndefinedValidationRules(authSpecId, { enable: false });

            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514945_');

            MarcAuthorities.createMarcAuthorityViaAPI(`${randomLetters}C514945`, '', [
              {
                tag: testData.tag130,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['\\', '\\'],
              },
            ]).then((id) => {
              createdAuthorityId = id;
            });
          })
            .then(() => {
              // Create local field 983 with NO defined indicators or subfield codes
              // so all will be treated as "undefined" by validation rules
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localFieldTag,
                label: `AT_C514945_Local_Field_983_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localField983Id = fieldResp.body.id;
              });
            })
            .then(() => {
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
                Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
              ]).then((userProperties) => {
                user = userProperties;

                toggleAllUndefinedValidationRules(authSpecId, { enable: true });

                cy.login(user.username, user.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
              });
            })
            .then(() => {
              // Step 1: Open authority record for editing
              MarcAuthorities.searchBeats(testData.authorityHeading);
              MarcAuthorities.selectAuthorityById(createdAuthorityId);
              MarcAuthority.waitLoading();
              MarcAuthority.edit();
              QuickMarcEditor.waitLoading();

              // Step 2: Update 130 with undefined ind1=5 and undefined $b subfield
              QuickMarcEditor.updateExistingField(testData.tag130, testData.field130Content);
              QuickMarcEditor.updateIndicatorValue(testData.tag130, testData.field130Ind1, 0);
              QuickMarcEditor.updateIndicatorValue(testData.tag130, testData.field130Ind2, 1);
              QuickMarcEditor.checkContentByTag(testData.tag130, testData.field130Content);

              // Step 3: Add local 983 field with undefined indicators and all subfields
              QuickMarcEditor.addEmptyFields(5);
              QuickMarcEditor.checkEmptyFieldAdded(6);
              QuickMarcEditor.addValuesToExistingField(
                5,
                testData.localFieldTag,
                testData.field983FullContent,
                testData.field983Ind1,
                testData.field983Ind2,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.field983FullContent,
              );

              const subfieldsAllCodes = [
                'a',
                'b',
                'c',
                'd',
                'e',
                'f',
                'g',
                'h',
                'i',
                'j',
                'k',
                'l',
                'm',
                'n',
                'o',
                'p',
                'q',
                'r',
                's',
                't',
                'u',
                'v',
                'w',
                'x',
                'y',
                'z',
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
                '0',
              ];
              // step 6+: $9 and $0 are empty or removed → not counted as undefined
              const subfieldsWithout9And0 = subfieldsAllCodes.filter((c) => c !== '9' && c !== '0');

              function check130Warnings() {
                QuickMarcEditor.checkWarningMessageForFieldByTag(
                  testData.tag130,
                  including(testData.warnInd1UndefinedFor130),
                );
                QuickMarcEditor.checkWarningMessageForFieldByTag(
                  testData.tag130,
                  including(testData.warnSubfieldBUndefinedFor130),
                );
              }

              function check983IndicatorWarnings() {
                QuickMarcEditor.checkWarningMessageForFieldByTag(
                  testData.localFieldTag,
                  including(testData.warnInd1UndefinedFor983),
                );
                QuickMarcEditor.checkWarningMessageForFieldByTag(
                  testData.localFieldTag,
                  including(testData.warnInd2UndefinedFor983),
                );
              }

              function check983SubfieldWarnings(subfieldCodes) {
                subfieldCodes.forEach((code) => {
                  QuickMarcEditor.checkWarningMessageForFieldByTag(
                    testData.localFieldTag,
                    including(`Warn: Subfield '${code}' is undefined.`),
                  );
                });
              }

              // Step 4: Save & close → 130 warns + 983 ind warns + 983 all subfield warns
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout();
              QuickMarcEditor.closeAllCallouts();
              check130Warnings();
              check983IndicatorWarnings();
              check983SubfieldWarnings(subfieldsAllCodes);
              QuickMarcEditor.checkButtonsEnabled();

              // Step 5: Clear values from $9 and $0 subfields in 983
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.field983EmptyLastSubfields,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.field983EmptyLastSubfields,
              );

              cy.wait(3000);
              // Step 6: Save & close → same warns but $0 (and $9) empty → not counted
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout();
              QuickMarcEditor.closeAllCallouts();
              check130Warnings();
              check983IndicatorWarnings();
              check983SubfieldWarnings(subfieldsWithout9And0);
              QuickMarcEditor.checkButtonsEnabled();

              // Steps 7, 8: Skipped for Trillium

              // Step 9: Save & keep editing → success, buttons disabled, content saved
              QuickMarcEditor.clickSaveAndKeepEditing({ checkCallout: false });
              QuickMarcEditor.checkButtonsDisabled();
              QuickMarcEditor.checkContentByTag(testData.tag130, testData.field130Content);
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.field983WithoutLastSubfields,
              );

              // Step 10: Close editor pane → detail view shown
              QuickMarcEditor.closeAuthorityEditorPane();
              MarcAuthority.waitLoading();
              MarcAuthority.contains(testData.field983WithoutLastSubfields);
              MarcAuthority.notContains('$9');
              MarcAuthority.notContains('$0');
            });
        },
      );
    });
  });
});
