import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import {
  getAuthoritySpec,
  toggleAllUndefinedValidationRules,
} from '../../../../support/api/specifications-helper';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit Authority record', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C543841_MarcAuthority_${randomPostfix}`,
        tag100: '100',
        tag400: '400',
        tag410: '410',
        tag511: '511',
        tag630: '630',
        indicatorFailText:
          "Fail: Indicator must contain one character and can only accept numbers 0-9, letters a-z or a '\\'.Help",
        indicatorWarningText: (index, value) => `Warn: ${index ? 'Second' : 'First'} Indicator '${value}' is undefined.Help`,
        fieldUndefinedWarningText: 'Warn: Field is undefined.',
        contentForNon1XX: 'Non-1XX Indicator test',
      };

      const indicatorData1XX = [
        {
          values: ['A', 'Z'],
          error: `${testData.indicatorFailText}${testData.indicatorFailText}`,
          warning: null,
          counts: [0, 2],
        },
        {
          values: ['#', '$'],
          error: `${testData.indicatorFailText}${testData.indicatorFailText}`,
          warning: null,
          counts: [0, 2],
        },
        {
          values: ['', '$'],
          error: testData.indicatorFailText,
          warning: testData.indicatorWarningText(0, '\\'),
          counts: [1, 1],
        },
        {
          values: ['#', ''],
          error: testData.indicatorFailText,
          warning: null,
          counts: [0, 1],
        },
      ];

      const indicatorValuesNon1XX = [
        { tag: testData.tag400, values: [undefined, undefined] },
        { tag: testData.tag410, values: ['', ''] },
        { tag: testData.tag511, values: ['0', '7'] },
        { tag: testData.tag630, values: ['a', 'z'] },
      ];

      const indicatorValuesAfterSave = [
        { tag: testData.tag100, values: ['\\', '\\'] },
        { tag: testData.tag400, values: ['\\', '\\'] },
        { tag: testData.tag410, values: ['\\', '\\'] },
        { tag: testData.tag511, values: ['0', '7'] },
        { tag: testData.tag630, values: ['a', 'z'] },
      ];

      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };

      const authorityFields = [
        {
          tag: testData.tag100,
          content: `$a ${testData.authorityHeading}`,
          indicators: ['\\', '\\'],
        },
      ];

      let createdAuthorityId;
      let specId;

      before('Create test data', () => {
        cy.getAdminToken();
        getAuthoritySpec().then((spec) => {
          specId = spec.id;
          toggleAllUndefinedValidationRules(specId, { enable: true });
        });

        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C543841_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            authData.prefix,
            authData.startWithNumber,
            authorityFields,
          ).then((createdRecordId) => {
            createdAuthorityId = createdRecordId;
          });

          cy.waitForAuthRefresh(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          }, 20_000);
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        toggleAllUndefinedValidationRules(specId, { enable: false });
        MarcAuthorities.deleteViaAPI(createdAuthorityId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C543841 Indicator boxes validation during editing of MARC authority record (spitfire)',
        { tags: ['extendedPathFlaky', 'spitfire', 'nonParallel', 'C543841'] },
        () => {
          MarcAuthorities.searchBeats(testData.authorityHeading);
          MarcAuthorities.selectTitle(testData.authorityHeading);
          MarcAuthority.waitLoading();

          MarcAuthority.edit();

          indicatorData1XX.forEach((item) => {
            QuickMarcEditor.updateIndicatorValue(testData.tag100, item.values[0], 0);
            QuickMarcEditor.updateIndicatorValue(testData.tag100, item.values[1], 1);
            QuickMarcEditor.pressSaveAndCloseButton();
            QuickMarcEditor.verifyValidationCallout(...item.counts);
            if (item.error) QuickMarcEditor.checkErrorMessageForFieldByTag(testData.tag100, item.error);
            if (item.warning) QuickMarcEditor.checkWarningMessageForFieldByTag(testData.tag100, item.warning);
            QuickMarcEditor.closeAllCallouts();
          });

          QuickMarcEditor.updateIndicatorValue(testData.tag100, '', 0);
          indicatorValuesNon1XX.forEach((item) => {
            QuickMarcEditor.addEmptyFields(4);
            QuickMarcEditor.checkEmptyFieldAdded(5);
            QuickMarcEditor.addValuesToExistingField(
              4,
              item.tag,
              `$a ${testData.contentForNon1XX}`,
              ...item.values,
            );
          });
          QuickMarcEditor.pressSaveAndCloseButton();
          QuickMarcEditor.verifyValidationCallout(5, 0);
          [testData.tag100, testData.tag400, testData.tag410].forEach((tag) => {
            QuickMarcEditor.checkWarningMessageForFieldByTag(
              tag,
              testData.indicatorWarningText(0, '\\'),
            );
          });
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag511,
            testData.indicatorWarningText(1, '7'),
          );
          QuickMarcEditor.checkWarningMessageForFieldByTag(
            testData.tag630,
            testData.fieldUndefinedWarningText,
          );

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();

          indicatorValuesAfterSave.forEach((item) => {
            QuickMarcEditor.verifyIndicatorValue(item.tag, item.values[0], 0);
            QuickMarcEditor.verifyIndicatorValue(item.tag, item.values[1], 1);
          });
        },
      );
    });
  });
});
