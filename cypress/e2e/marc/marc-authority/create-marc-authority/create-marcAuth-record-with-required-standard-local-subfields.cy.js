import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import {
  getAuthoritySpec,
  findStandardField,
  findStandardSubfield,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag010: '010',
        tag100: '100',
        localFieldTag: '981',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}514950`,
        // Step 7: 100 WITH required $a and $w
        field100Content: `$a AT_C514950_MarcAuthority_${randomPostfix} $w without required subfields`,
        field100Ind1: '1',
        field100Ind2: '\\',
        // Step 8: 981 WITH required $a
        field981Content: '$a Has required Subfield code',
        field981Ind1: '\\',
        field981Ind2: '\\',
        field981IndApi: '#',
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let standardSubfieldAId;
      let standardSubfieldAData;
      let appendedSubfieldWId;
      let localField981Id;

      before('Get authority spec', () => {
        cy.getAdminToken();

        getAuthoritySpec().then((authSpec) => {
          authSpecId = authSpec.id;
          toggleAllUndefinedValidationRules(authSpecId, { enable: false });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(authSpecId, { enable: false });

        if (standardSubfieldAId && standardSubfieldAData) {
          cy.updateSpecificationSubfield(standardSubfieldAId, {
            ...standardSubfieldAData,
            required: false,
          });
        }
        if (appendedSubfieldWId) cy.deleteSpecificationFieldSubfield(appendedSubfieldWId, false);
        if (localField981Id) cy.deleteSpecificationField(localField981Id, false);

        cy.syncSpecifications(authSpecId);

        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514950 Create MARC authority record with required standard / local subfields in Standard and Local fields (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C514950'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C514950_');
          })
            .then(() => {
              cy.getSpecificationFields(authSpecId).then((fieldsResp) => {
                const field100 = findStandardField(fieldsResp.body.fields, testData.tag100);

                cy.getSpecificationFieldSubfields(field100.id).then((subfieldsResp) => {
                  const subfieldA = findStandardSubfield(subfieldsResp.body.subfields, 'a');
                  standardSubfieldAId = subfieldA.id;
                  standardSubfieldAData = subfieldA;

                  cy.updateSpecificationSubfield(subfieldA.id, { ...subfieldA, required: true });
                });

                cy.createSpecificationFieldSubfield(field100.id, {
                  code: 'w',
                  label: `AT_C514950_Appended_Subfield_w_${randomPostfix}`,
                  repeatable: false,
                  required: true,
                  deprecated: false,
                }).then((subfieldResp) => {
                  appendedSubfieldWId = subfieldResp.body.id;
                });
              });

              cy.deleteSpecificationFieldByTag(authSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localFieldTag,
                label: `AT_C514950_Local_Field_981_${randomPostfix}`,
                repeatable: true,
                required: false,
                deprecated: false,
              }).then((fieldResp) => {
                localField981Id = fieldResp.body.id;

                cy.createSpecificationFieldIndicator(localField981Id, {
                  order: 1,
                  label: `AT_C514950_Local_Indicator_1_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.field981IndApi,
                    label: `AT_C514950_Local_Ind1_Code_blank_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldIndicator(localField981Id, {
                  order: 2,
                  label: `AT_C514950_Local_Indicator_2_${randomPostfix}`,
                }).then((indicatorResp) => {
                  cy.createSpecificationIndicatorCode(indicatorResp.body.id, {
                    code: testData.field981IndApi,
                    label: `AT_C514950_Local_Ind2_Code_blank_${randomPostfix}`,
                    deprecated: false,
                  });
                });

                cy.createSpecificationFieldSubfield(localField981Id, {
                  code: 'a',
                  label: `AT_C514950_Local_Subfield_a_${randomPostfix}`,
                  repeatable: false,
                  required: true,
                  deprecated: false,
                });
              });
            })
            .then(() => {
              cy.createTempUser([
                Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
                Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
                Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
              ]).then((userProperties) => {
                user = userProperties;

                toggleAllUndefinedValidationRules(authSpecId, { enable: true });
                MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile);

                cy.login(user.username, user.password, {
                  path: TopMenu.marcAuthorities,
                  waiter: MarcAuthorities.waitLoading,
                });
              });
            })
            .then(() => {
              // Step 1: Open new MARC authority record form
              MarcAuthorities.clickActionsAndNewAuthorityButton();
              QuickMarcEditor.checkPaneheaderContains(MarcAuthority.createAuthorityPaneTitleRegExp);
              MarcAuthority.checkSourceFileSelectShown();

              // Step 3: Set valid 008 dropdown values
              MarcAuthority.setValid008DropdownValues();
              QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(testData.tag008, false);

              // Steps 2, 4, 5: Select FOLIO authority file
              MarcAuthority.selectSourceFile(testData.folioAuthFile);
              MarcAuthority.verifySourceFileSelected(testData.folioAuthFile);

              // Step 6: Add 010 field
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag008,
                testData.tag010,
                `$a ${testData.naturalId}`,
              );
              QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

              // Step 7: Add 100 WITH required $a and $w
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag010,
                testData.tag100,
                testData.field100Content,
                testData.field100Ind1,
                testData.field100Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag100, testData.field100Content);

              // Step 8: Add local 981 WITH required $a
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag100,
                testData.localFieldTag,
                testData.field981Content,
                testData.field981Ind1,
                testData.field981Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.localFieldTag, testData.field981Content);

              // Step 9: Save & close → success; detail view shown
              QuickMarcEditor.pressSaveAndClose();
              MarcAuthority.waitLoading();
              MarcAuthority.getId().then((id) => {
                createdAuthorityId = id;
              });
              MarcAuthority.contains(testData.field100Content);
              MarcAuthority.contains(testData.field981Content);
            });
        },
      );
    });
  });
});
