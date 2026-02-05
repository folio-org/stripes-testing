import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C813643_MarcAuthority_${randomPostfix}`,
        tag008: '008',
        tag010: '010',
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
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n813643${randomDigits}${randomDigits}`,
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
          warning: null,
          counts: [0, 1],
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

      const indicatorValuesAfterSaveEditor = [
        { tag: testData.tag100, values: ['\\', '\\'] },
        { tag: testData.tag400, values: ['\\', '\\'] },
        { tag: testData.tag410, values: ['\\', '\\'] },
        { tag: testData.tag511, values: ['0', '7'] },
        { tag: testData.tag630, values: ['a', 'z'] },
      ];

      const indicatorValuesAfterSaveSource = indicatorValuesAfterSaveEditor.map(
        (field) => `${field.tag}\t${field.values[0].replace('\\', ' ')} ${field.values[1].replace('\\', ' ')}\t`,
      );

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C813643_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

          MarcAuthorities.setAuthoritySourceFileActivityViaAPI(testData.authoritySourceFile);

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
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(testData.authorityHeading);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C813643 Indicator boxes validation during creation of MARC authority record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C813643'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          QuickMarcEditor.addNewField(testData.tag010, `$a ${testData.naturalId}`, 3);
          QuickMarcEditor.addNewField(testData.tag100, `$a ${testData.authorityHeading}`, 4);

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
          indicatorValuesNon1XX.forEach((field, index) => {
            QuickMarcEditor.addEmptyFields(5 + index);
            QuickMarcEditor.checkEmptyFieldAdded(6 + index);
            QuickMarcEditor.addValuesToExistingField(
              5 + index,
              field.tag,
              `$a ${testData.contentForNon1XX}`,
              ...field.values,
            );
          });
          indicatorValuesNon1XX.forEach((field, index) => {
            QuickMarcEditor.verifyTagValue(6 + index, field.tag);
          });

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          indicatorValuesAfterSaveSource.forEach((field) => {
            MarcAuthority.contains(field);
          });

          MarcAuthority.edit();

          indicatorValuesAfterSaveEditor.forEach((item) => {
            QuickMarcEditor.verifyIndicatorValue(item.tag, item.values[0], 0);
            QuickMarcEditor.verifyIndicatorValue(item.tag, item.values[1], 1);
          });
        },
      );
    });
  });
});
