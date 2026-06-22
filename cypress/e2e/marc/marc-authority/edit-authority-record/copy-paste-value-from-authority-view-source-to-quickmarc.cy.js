import getRandomPostfix from '../../../../support/utils/stringTools';
import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      headingPrefix: `AT_C422158_MarcAuthority_${randomPostfix}`,
      tag400Content: `$a AT_C422158_Field400_${randomPostfix}`,
      tags: {
        tag008: '008',
        tag100: '100',
        tag400: '400',
      },
      userProperties: {},
    };

    const authorityHeadings = Array.from(
      { length: 2 },
      (_, i) => `${testData.headingPrefix} ${i + 1}`,
    );

    const marcAuthorityAFields = [
      {
        tag: testData.tags.tag100,
        content: `$a ${authorityHeadings[0]}`,
        indicators: ['1', '1'],
      },
      {
        tag: testData.tags.tag400,
        content: testData.tag400Content,
        indicators: ['\\', '\\'],
      },
    ];

    const marcAuthorityBFields = [
      {
        tag: testData.tags.tag100,
        content: `$a ${authorityHeadings[1]}`,
        indicators: ['1', '1'],
      },
    ];

    const createdAuthorityIds = [];

    before('Create test data and login', () => {
      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        cy.then(() => {
          [marcAuthorityAFields, marcAuthorityBFields].forEach((fields) => {
            MarcAuthorities.createMarcAuthorityViaAPI(testData.naturalId, '', fields).then((id) => {
              createdAuthorityIds.push(id);
            });
          });
        }).then(() => {
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userProperties.userId);
      createdAuthorityIds.forEach((id) => {
        MarcAuthority.deleteViaAPI(id, true);
      });
    });

    it(
      'C422158 Copy and paste from the MARC source view of the record to editing window of "MARC authority" record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C422158'] },
      () => {
        let textFromSource;

        MarcAuthorities.searchBeats(authorityHeadings[0]);
        MarcAuthorities.selectItem(authorityHeadings[0]);
        MarcAuthority.waitLoading();

        MarcAuthority.contains(testData.tag400Content);

        InventoryViewSource.getContentFromRow(5).then((copiedText) => {
          textFromSource = `$${copiedText.split('$')[1]}`;

          InventoryViewSource.close();

          MarcAuthorities.searchBeats(authorityHeadings[1]);
          MarcAuthorities.selectItem(authorityHeadings[1]);
          MarcAuthority.waitLoading();
          MarcAuthority.contains(authorityHeadings[1]);
          MarcAuthority.edit();

          QuickMarcEditor.addNewField(testData.tags.tag400, textFromSource, 4);
          QuickMarcEditor.checkContentByTag(testData.tags.tag400, textFromSource);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkAfterSaveAndKeepEditing();
          QuickMarcEditor.checkContentByTag(testData.tags.tag400, textFromSource);
        });
      },
    );
  });
});
