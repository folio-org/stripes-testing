import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C813646_MarcAuthority_${getRandomPostfix()}`,
        tag001: '001',
        tag008: '008',
        tag010: '010',
        tag100: '100',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n813646${randomDigits}${randomDigits}`,
        noAuthFileCalloutText: 'Record cannot be saved. An authority file is required',
        no001FieldCalloutText: 'Field 001 is required.',
        warningPrefix: 'Warn:',
        tag008Index: 3,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C813646_MarcAuthority');
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
        'C813646 Create MARC authority record using "Save & keep editing" button (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C813646'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkButtonsDisabled();

          QuickMarcEditor.addNewField(
            testData.tag100,
            `$a ${testData.authorityHeading}`,
            testData.tag008Index,
          );

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.verifyValidationCallout(0, 2);
          QuickMarcEditor.checkCallout(testData.noAuthFileCalloutText);
          QuickMarcEditor.checkCallout(testData.no001FieldCalloutText);
          QuickMarcEditor.closeAllCallouts();

          MarcAuthority.selectSourceFile(testData.authoritySourceFile);
          QuickMarcEditor.addNewField(
            testData.tag010,
            `$a ${testData.naturalId}`,
            testData.tag008Index + 1,
          );

          QuickMarcEditor.clickSaveAndKeepEditing();
        },
      );
    });
  });
});
