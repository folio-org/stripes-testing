import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import InventorySearchAndFilter from '../../../../support/fragments/inventory/inventorySearchAndFilter';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const recordTitle = `C423528 Create a new MARC authority record with Local authority file autotest ${getRandomPostfix()}`;
      const randomPostfix = getRandomPostfix();
      const tag001 = '001';
      const headerText = /New .*MARC authority record/;
      const authSourceAccordionName = 'Authority source';
      let createdAuthorityId;
      const newField = {
        previousFieldTag: '008',
        tag: '100',
        content: `$a ${recordTitle}`,
      };
      const localAuthFile = {
        name: `C423528 auth source file active ${randomPostfix}`,
        prefix: getRandomLetters(8),
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C423528 ');
        cy.getAuthoritySourceFileDataViaAPI('C423528 *').then(() => {
          Cypress.env('authoritySourceFiles').forEach((sourceFile) => {
            ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFile.name);
            cy.deleteAuthoritySourceFileViaAPI(sourceFile.id, true);
          });
        });
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ])
          .then((userProperties) => {
            users.userProperties = userProperties;
          })
          .then(() => {
            cy.createAuthoritySourceFileUsingAPI(
              localAuthFile.prefix,
              localAuthFile.startWithNumber,
              localAuthFile.name,
              localAuthFile.isActive,
            ).then((sourceId) => {
              localAuthFile.id = sourceId;
              cy.wait(70_000);

              ManageAuthorityFiles.setAllDefaultFOLIOFilesToActiveViaAPI();
            });
          })
          .then(() => {
            cy.login(users.userProperties.username, users.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
      });

      after('Delete users, data', () => {
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
        MarcAuthority.deleteViaAPI(createdAuthorityId, true);
        ManageAuthorityFiles.unsetAllDefaultFOLIOFilesAsActiveViaAPI();
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C423528 Create a new MARC authority record with "Local" authority file selected (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C423528'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          MarcAuthority.selectSourceFile(localAuthFile.name);

          QuickMarcEditor.checkContentByTag(
            tag001,
            `${localAuthFile.prefix}${localAuthFile.startWithNumber}`,
          );

          MarcAuthority.addNewFieldAfterExistingByTag(
            newField.previousFieldTag,
            newField.tag,
            newField.content,
          );
          QuickMarcEditor.checkContentByTag(newField.tag, newField.content);

          QuickMarcEditor.pressSaveAndClose();
          MarcAuthority.verifyAfterSaveAndClose();
          QuickMarcEditor.verifyPaneheaderWithContentAbsent(headerText);
          MarcAuthorities.verifyViewPaneContentExists();
          MarcAuthority.getId().then((id) => {
            createdAuthorityId = id;

            MarcAuthority.contains(tag001);
            MarcAuthority.contains(`${localAuthFile.prefix}${localAuthFile.startWithNumber}`);
            MarcAuthority.contains(newField.tag);
            MarcAuthority.contains(newField.content);

            MarcAuthorities.closeMarcViewPane();
            MarcAuthorities.verifyMarcViewPaneIsOpened(false);

            InventorySearchAndFilter.verifyAccordionByNameExpanded(authSourceAccordionName);
            MarcAuthorities.clickAuthoritySourceAccordion();
            InventorySearchAndFilter.verifyAccordionByNameExpanded(authSourceAccordionName, false);
            MarcAuthorities.clickAuthoritySourceAccordion();
            InventorySearchAndFilter.verifyAccordionByNameExpanded(authSourceAccordionName);

            MarcAuthorities.clickMultiSelectToggleButtonInAccordion(authSourceAccordionName);
            MarcAuthorities.checkAuthoritySourceDropdownHasOption(localAuthFile.name);

            MarcAuthorities.chooseAuthoritySourceOption(localAuthFile.name);
            MarcAuthorities.checkSelectedAuthoritySource(localAuthFile.name);
            MarcAuthorities.checkAfterSearch('Authorized', recordTitle);
            MarcAuthorities.selectAuthorityById(createdAuthorityId);
            MarcAuthorities.checkRecordDetailPageMarkedValue(recordTitle);
          });
        },
      );
    });
  });
});
