import { MARC_AUTHORITY_BROWSE_OPTIONS } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        tag008: '008',
        tag110: '110',
        tag245: '245',
        tag700: '700',
        bibTitle: `AT_C360550_MarcBibInstance_${randomPostfix}`,
        // Long and not matching any record: only the two authorities below sort next to it
        longQuery: `AT_C360550_MarcAuthority_Instituto de Ciencias Sociales (Fundacion de Cultura Universitaria Test) ${randomPostfix} B`,
        authorityBeforeQuery: `AT_C360550_MarcAuthority_Instituto de Ciencias Sociales (Fundacion de Cultura Universitaria Test) ${randomPostfix} A`,
        authorityAfterQuery: `AT_C360550_MarcAuthority_Instituto de Ciencias Sociales (Fundacion de Cultura Universitaria Test) ${randomPostfix} C`,
        browseOption: MARC_AUTHORITY_BROWSE_OPTIONS.CORPORATE_CONFERENCE_NAME,
      };
      const authData = {
        prefix: getRandomLetters(15),
        startsWithNumber: 1,
      };
      const createdAuthorityIds = [];
      let createdInstanceId;
      let user;

      before('Create user and test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C360550_');

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((userProperties) => {
          user = userProperties;

          cy.then(() => {
            [testData.authorityBeforeQuery, testData.authorityAfterQuery].forEach(
              (heading, index) => {
                MarcAuthorities.createMarcAuthorityViaAPI(
                  authData.prefix,
                  `${authData.startsWithNumber + index}`,
                  [{ tag: testData.tag110, content: `$a ${heading}`, indicators: ['2', '\\'] }],
                ).then((createdRecordId) => {
                  createdAuthorityIds.push(createdRecordId);
                });
              },
            );

            cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, [
              { tag: testData.tag008, content: QuickMarcEditor.defaultValid008Values },
              {
                tag: testData.tag245,
                content: `$a ${testData.bibTitle}`,
                indicators: ['1', '1'],
              },
              {
                tag: testData.tag700,
                content: `$a AT_C360550_Contributor_${randomPostfix}`,
                indicators: ['1', '\\'],
              },
            ]).then((instanceId) => {
              createdInstanceId = instanceId;
            });
          }).then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(user.username, user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000);
          });
        });
      });

      after('Delete user and test data', () => {
        cy.getAdminToken(false);
        Users.deleteViaApi(user.userId);
        if (createdInstanceId) InventoryInstance.deleteInstanceViaApi(createdInstanceId);
        createdAuthorityIds.forEach((id) => MarcAuthority.deleteViaAPI(id, true));
      });

      it(
        "C360550 MARC Authority plug-in | Browse: Verify that long query doesn't cut off in the not-exact match placeholder (promin)",
        { tags: ['extendedPath', 'promin', 'C360550'] },
        () => {
          // Preconditions: plug-in opened from the "Link to MARC Authority record" icon, "Browse"
          InventoryInstances.searchByTitle(createdInstanceId);
          InventoryInstances.selectInstanceById(createdInstanceId);
          InventoryInstance.waitLoading();
          InventoryInstance.editMarcBibliographicRecord();
          InventoryInstance.verifyAndClickLinkIcon(testData.tag700);
          MarcAuthorities.verifyBrowseTabIsOpened();

          // Steps 1-2: select a browse option, enter the long query - "Search" is enabled
          MarcAuthorityBrowse.selectOptionAndQueryAndCheck(
            testData.browseOption,
            testData.longQuery,
          );

          // Step 3: search - records around the query are shown, the whole query is inside the
          // not-exact match placeholder, fits the cell and is aligned by the left edge
          MarcAuthorities.searchButtonClick();
          MarcAuthorities.checkRowByContent(testData.authorityBeforeQuery);
          MarcAuthorities.checkRowByContent(testData.authorityAfterQuery);
          MarcAuthorityBrowse.checkResultWithNoValue(testData.longQuery);
          MarcAuthorityBrowse.verifyNotExactMatchPlaceholderLayout(testData.longQuery);
        },
      );
    });
  });
});
