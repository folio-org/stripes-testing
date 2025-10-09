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
        authorityHeading: `AT_C423524_MarcAuthority_${getRandomPostfix()}`,
        tag010: '010',
        tag100: '100',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n423524${randomDigits}${randomDigits}`,
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423524_MarcAuthority');
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
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
        'C423524 Select "Keep editing" in "Are you sure" modal and save the record in "Create a new MARC authority record" window (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C423524'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.setValid008DropdownValues();
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          for (let i = 0; i < 2; i++) {
            QuickMarcEditor.addEmptyFields(3 + i);
          }
          cy.wait(1000);

          QuickMarcEditor.addValuesToExistingField(
            3,
            testData.tag100,
            `$a ${testData.authorityHeading}`,
            '1',
            '\\',
          );
          QuickMarcEditor.addValuesToExistingField(
            4,
            testData.tag010,
            `$a ${testData.naturalId}`,
            '\\',
            '\\',
          );

          QuickMarcEditor.pressCancel();
          QuickMarcEditor.cancelEditConfirmationPresented();
          QuickMarcEditor.confirmEditCancel();
          QuickMarcEditor.cancelEditConfirmationPresented(false);
          QuickMarcEditor.waitLoading();

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
        },
      );
    });
  });
});
