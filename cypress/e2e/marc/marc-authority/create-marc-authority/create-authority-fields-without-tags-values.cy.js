import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomFourDigitNumber();
      const testData = {
        authorityHeading: `AT_C813592_MarcAuthority_${randomPostfix}`,
        tagLDR: 'LDR',
        tag001: '001',
        tag005: '005',
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag400: '400',
        tag999: '999',
        tagLDRSource: 'LEADER',
        authoritySourceFile: DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE,
        naturalId: `n813592${randomDigits}${randomDigits}`,
      };

      const fieldValues = {
        firstEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '400', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '400', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        secondEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '400', ind1: '\\', ind2: '\\', content: '' },
          { tag: '400', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        thirdEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '1', ind2: '2', content: '' },
          { tag: '400', ind1: '1', ind2: '2', content: '' },
          { tag: '400', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
        fourthEdit: [
          { tag: '', ind1: '\\', ind2: '\\', content: '$a ' },
          { tag: '', ind1: '\\', ind2: '\\', content: '' },
          { tag: '', ind1: '', ind2: '', content: '' },
          { tag: '', ind1: '1', ind2: '2', content: '' },
          { tag: '400', ind1: '1', ind2: '2', content: '' },
          { tag: '400', ind1: '\\', ind2: '\\', content: '$a ' },
        ],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C813592_MarcAuthority');
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
        'C813592 Fields without tag and subfield values are deleted during saving (create MARC authority) (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C813592'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          MarcAuthority.selectSourceFile(testData.authoritySourceFile);

          for (let i = 0; i < 8; i++) {
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
          QuickMarcEditor.checkContentByTag(testData.tag100, `$a ${testData.authorityHeading}`);
          QuickMarcEditor.checkContentByTag(testData.tag010, `$a ${testData.naturalId}`);

          QuickMarcEditor.addValuesToExistingField(9, testData.tag400, '$a ', '\\', '\\');
          QuickMarcEditor.addValuesToExistingField(10, testData.tag400, '$a ', '\\', '\\');
          fieldValues.firstEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              6 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(6, '', '');
          QuickMarcEditor.addValuesToExistingField(9, testData.tag400, '');
          fieldValues.secondEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              6 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(8, '', '', '1', '2');
          QuickMarcEditor.addValuesToExistingField(9, testData.tag400, '', '1', '2');
          fieldValues.thirdEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              6 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.addValuesToExistingField(7, '', '', '', '');
          fieldValues.fourthEdit.forEach((field, index) => {
            QuickMarcEditor.verifyTagField(
              6 + index,
              field.tag,
              field.ind1,
              field.ind2,
              field.content,
              '',
            );
          });

          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          InventoryViewSource.checkRowsCount(7);
          [
            testData.tagLDRSource,
            testData.tag001,
            testData.tag005,
            testData.tag008,
            testData.tag010,
            testData.tag100,
            testData.tag999,
          ].forEach((tag) => {
            MarcAuthority.contains(tag);
          });
        },
      );
    });
  });
});
