import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const testData = {
        authorityHeading: 'AT_C494037_MarcAuthority',
        tags: {
          ldr: 'LDR',
          field001: '001',
          field005: '005',
          field008: '008',
          field010: '010',
          field100: '100',
          field999: '999',
        },
        indexes: {
          for008: 3,
          for100: 5,
        },
        naturalId: 'n123',
      };

      const fieldsWithoutAddButton = [
        testData.tags.ldr,
        testData.tags.field001,
        testData.tags.field005,
        testData.tags.field999,
      ];

      const fieldsWithAddButton = {
        initial: [testData.tags.field008],
        afterAdding035: [testData.tags.field008, testData.tags.field010, testData.tags.field100],
      };

      before('Create test data', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

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
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C494037 User cannot add a new field below "999 ff" field on "Create a new MARC authority record" pane (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C494037'] },
        () => {
          // Step 1: Click on "Actions" button → Select "+ New" option
          MarcAuthorities.clickActionsAndNewAuthorityButton();

          fieldsWithoutAddButton.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, false);
          });
          fieldsWithAddButton.initial.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, true);
          });

          // Step 2: Add new fields by clicking on "+" icon next to "008" field
          QuickMarcEditor.addNewField(
            testData.tags.field010,
            `$a ${testData.naturalId}`,
            testData.indexes.for008,
          );
          QuickMarcEditor.addNewField(
            testData.tags.field100,
            `$a ${testData.authorityHeading}`,
            testData.indexes.for008 + 1,
          );

          fieldsWithoutAddButton.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, false);
          });

          fieldsWithAddButton.afterAdding035.forEach((tag) => {
            QuickMarcEditor.checkAddButtonShownInField(tag, true);
          });

          // Step 3: Click on "Add a new field" icon next to "100" field
          QuickMarcEditor.addEmptyFields(testData.indexes.for100);

          QuickMarcEditor.verifyTagValue(testData.indexes.for100, testData.tags.field100);
          QuickMarcEditor.verifyTagValue(testData.indexes.for100 + 1, '');
          QuickMarcEditor.verifyTagValue(testData.indexes.for100 + 2, testData.tags.field999);
        },
      );
    });
  });
});
