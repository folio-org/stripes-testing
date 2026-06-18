import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import {
  getAuthoritySpec,
  findStandardField,
  findStandardSubfield,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const randomLetters = getRandomLetters(16);

      const testData = {
        tag100: '100',
        localFieldTag: '981',
        standardRequiredSubfieldCode: 'a',
        appendedRequiredSubfieldCode: 'w',
        localInd1: '#',
        localInd2: '#',
        localInd1Ui: '\\',
        localInd2Ui: '\\',
        authorityHeading: `AT_C514951_MarcAuthority_${randomPostfix}`,
        field1XXContent: '$a AT_C514951 Edit MARC auth $w with required subfields',
        field981Content: '$a Has required Subfield code',
        field100Ind1: '1',
        field100Ind2: '\\',
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let standardSubfieldAId;
      let standardSubfieldAOriginalData;
      let appendedSubfieldId;
      let localFieldId;

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

        if (standardSubfieldAId && standardSubfieldAOriginalData) {
          cy.updateSpecificationSubfield(
            standardSubfieldAId,
            { ...standardSubfieldAOriginalData, required: false },
            false,
          );
        }
        if (appendedSubfieldId) cy.deleteSpecificationFieldSubfield(appendedSubfieldId, false);
        if (localFieldId) cy.deleteSpecificationField(localFieldId, false);

        cy.syncSpecifications(authSpecId);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514951 Edit MARC authority record with required standard / local subfields in Standard and Local fields (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'nonParallel', 'C514951'] },
        () => {
          cy.then(() => {
            toggleAllUndefinedValidationRules(authSpecId, { enable: false });

            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C514951_');

            MarcAuthorities.createMarcAuthorityViaAPI(`${randomLetters}C514951`, '', [
              {
                tag: testData.tag100,
                content: `$a ${testData.authorityHeading}`,
                indicators: ['1', '\\'],
              },
            ]).then((id) => {
              createdAuthorityId = id;
            });
          })
            .then(() => {
              // Setup 100 field: mark standard subfield 'a' as required
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field100 = findStandardField(fieldsResp.body.fields, testData.tag100);

                cy.getSpecificationFieldSubfields(field100.id).then((subfieldsResp) => {
                  const subfieldA = findStandardSubfield(
                    subfieldsResp.body.subfields,
                    testData.standardRequiredSubfieldCode,
                  );
                  if (subfieldA) {
                    standardSubfieldAId = subfieldA.id;
                    standardSubfieldAOriginalData = { ...subfieldA };
                    cy.updateSpecificationSubfield(subfieldA.id, { ...subfieldA, required: true });
                  }
                });

                // Create appended required subfield 'w' for 100
                cy.createSpecificationFieldSubfield(field100.id, {
                  code: testData.appendedRequiredSubfieldCode,
                  label: `AT_C514951_Appended_Required_Subfield_w_${randomPostfix}`,
                  repeatable: false,
                  required: true,
                  deprecated: false,
                }).then((subfieldResp) => {
                  appendedSubfieldId = subfieldResp.body.id;
                });
              });

              // Create local field 981 with indicator codes '#' for both indicators and required subfield 'a'
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localFieldTag,
                label: `AT_C514951_Local_Field_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localFieldId = fieldResp.body.id;

                cy.createSpecificationFieldIndicator(localFieldId, {
                  order: 1,
                  label: `AT_C514951_Local_Indicator_1_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.localInd1,
                    label: `AT_C514951_Local_Ind1_Code_hash_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldIndicator(localFieldId, {
                  order: 2,
                  label: `AT_C514951_Local_Indicator_2_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.localInd2,
                    label: `AT_C514951_Local_Ind2_Code_hash_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldSubfield(localFieldId, {
                  code: 'a',
                  label: `AT_C514951_Local_Required_Subfield_a_${randomPostfix}`,
                  repeatable: false,
                  required: true,
                  deprecated: false,
                });
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

              // Step 2: Update 1XX field to include required subfields $a and $w
              QuickMarcEditor.updateExistingField(testData.tag100, testData.field1XXContent);
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field1XXContent);

              // Step 3: Add local field 981 with required $a subfield
              QuickMarcEditor.addEmptyFields(5);
              QuickMarcEditor.checkEmptyFieldAdded(6);
              QuickMarcEditor.addValuesToExistingField(
                5,
                testData.localFieldTag,
                testData.field981Content,
                testData.localInd1Ui,
                testData.localInd2Ui,
              );

              // Step 4: Click "Save & keep editing" → success
              QuickMarcEditor.clickSaveAndKeepEditing({ checkCallout: false });
              QuickMarcEditor.checkButtonsDisabled();
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field1XXContent);
              QuickMarcEditor.checkContentByTag(testData.localFieldTag, testData.field981Content);
            });
        },
      );
    });
  });
});
