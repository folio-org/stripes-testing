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
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC authority', () => {
    describe('Create', () => {
      const randomPostfix = getRandomPostfix();

      const testData = {
        tag008: '008',
        tag010: '010',
        tag130: '130',
        localFieldTag: '983',
        folioAuthFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n${randomNDigitNumber(18)}514944`,
        // Step 5: 130 with undefined ind1='5' (ind2='0' is valid for nonfiling chars) and undefined $b
        field130Content: `$a AT_C514944_MarcAuthority_${randomPostfix} $b with ind and subfield codes not specified in rules`,
        field130Ind1: '5',
        field130Ind2: '0',
        // Step 6: 983 with undefined ind1='1', ind2='2' and undefined $a $b
        field983Content: '$a Local field with local indicator $b and subfield',
        field983Ind1: '1',
        field983Ind2: '2',
        // Step 8: add undefined $c $d to 983
        field983ContentWithExtra: '$a Local field with local indicator $b and subfield $c $d',
        // Row indices: 010(4), 130(5), 983(6)
        tag130RowIndex: 5,
        localFieldRowIndex: 6,
      };

      let createdAuthorityId;
      let user;
      let authSpecId;
      let localField983Id;

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

        if (localField983Id) cy.deleteSpecificationField(localField983Id, false);

        cy.syncSpecifications(authSpecId);

        MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.folioAuthFile, false);

        if (createdAuthorityId) MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        if (user?.userId) Users.deleteViaApi(user.userId);
      });

      it(
        'C514944 Create MARC authority record with undefined Indicators / Subfield codes in Standard and Local fields when "Undefined" rules are enabled (promin)',
        { tags: ['criticalPath', 'promin', 'nonParallel', 'C514944'] },
        () => {
          cy.then(() => {
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C514944_');
          })
            .then(() => {
              // Create local field 983 with NO indicators or subfields in spec (all will be "undefined")
              cy.deleteSpecificationFieldByTag(authSpecId, testData.localFieldTag, false);
              cy.createSpecificationField(authSpecId, {
                tag: testData.localFieldTag,
                label: `AT_C514944_Local_Field_983_${randomPostfix}`,
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

              // Step 2: Select FOLIO authority file
              MarcAuthority.selectSourceFile(testData.folioAuthFile);
              MarcAuthority.verifySourceFileSelected(testData.folioAuthFile);

              // Step 4: Add 010 field
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag008,
                testData.tag010,
                `$a ${testData.naturalId}`,
              );
              QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

              // Step 5: Add 130 with undefined ind1='5' and undefined subfield $b
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag010,
                testData.tag130,
                testData.field130Content,
                testData.field130Ind1,
                testData.field130Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.tag130, testData.field130Content);

              // Step 6: Add local 983 with undefined indicators (1, 2) and undefined subfields ($a, $b)
              MarcAuthority.addNewFieldAfterExistingByTag(
                testData.tag130,
                testData.localFieldTag,
                testData.field983Content,
                testData.field983Ind1,
                testData.field983Ind2,
              );
              QuickMarcEditor.checkContentByTag(testData.localFieldTag, testData.field983Content);

              // Step 7: Save → warn-only errors (6 warns); record NOT saved; save button enabled
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(6, 0);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(
                testData.tag130RowIndex,
                "Warn: First Indicator '5' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag130RowIndex,
                "Warn: Subfield 'b' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: First Indicator '1' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Second Indicator '2' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Subfield 'a' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Subfield 'b' is undefined.",
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 8: Add undefined $c $d to 983
              QuickMarcEditor.updateExistingField(
                testData.localFieldTag,
                testData.field983ContentWithExtra,
              );
              QuickMarcEditor.checkContentByTag(
                testData.localFieldTag,
                testData.field983ContentWithExtra,
              );
              cy.wait(2000);

              // Step 9: Save again (field changed → first save attempt again) → same 6 warns
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(6, 0);
              QuickMarcEditor.closeAllCallouts();
              QuickMarcEditor.checkErrorMessage(
                testData.tag130RowIndex,
                "Warn: First Indicator '5' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag130RowIndex,
                "Warn: Subfield 'b' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: First Indicator '1' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Second Indicator '2' is undefined.",
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 10: Remove $c $d from 983; save → 6 warns (content changed → first save again)
              QuickMarcEditor.updateExistingField(testData.localFieldTag, testData.field983Content);
              QuickMarcEditor.checkContentByTag(testData.localFieldTag, testData.field983Content);
              cy.wait(2000);
              QuickMarcEditor.pressSaveAndCloseButton();
              QuickMarcEditor.verifyValidationCallout(6, 0);
              QuickMarcEditor.checkErrorMessage(
                testData.tag130RowIndex,
                "Warn: First Indicator '5' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.tag130RowIndex,
                "Warn: Subfield 'b' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: First Indicator '1' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Second Indicator '2' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Subfield 'a' is undefined.",
              );
              QuickMarcEditor.checkErrorMessage(
                testData.localFieldRowIndex,
                "Warn: Subfield 'b' is undefined.",
              );
              QuickMarcEditor.verifySaveAndCloseButtonEnabled(true);

              // Step 11: Save again with no changes → SUCCESS (second save with warn-only errors)
              QuickMarcEditor.pressSaveAndClose();
              MarcAuthority.waitLoading();
              MarcAuthority.getId().then((id) => {
                createdAuthorityId = id;
              });
              // Empty subfields $c $d don't display in 983 detail view
              MarcAuthority.contains(testData.field983Content);
            });
        },
      );
    });
  });
});
