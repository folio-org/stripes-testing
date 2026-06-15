import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import getRandomPostfix, { getRandomLetters } from '../../../../support/utils/stringTools';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const tag001 = '001';
      const headerText = /New .*MARC authority record/;
      const newField = {
        previousFieldTag: '008',
        tag: '111',
        content: `$a AT_C423559_MarcAuthority Record with Local authority file which includes default prefix in it ${randomPostfix}`,
      };
      const recordTitle = `AT_C423559_MarcAuthority Record with Local authority file which includes default prefix in it ${randomPostfix}`;
      const localAuthFile = {
        name: `AT_C423559_AuthoritySourceFile active ${randomPostfix}`,
        prefix: `na${getRandomLetters(22)}`,
        startWithNumber: '1',
        isActive: true,
      };
      const users = {};
      let createdAuthorityId;

      before('Create users, data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C423559_');
        cy.getAuthoritySourceFileDataViaAPI('AT_C423559_*').then(() => {
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
              cy.wait(70_000); // waiting for the file to be processed
              cy.getAdminToken();
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
        cy.deleteAuthoritySourceFileViaAPI(localAuthFile.id, true);
      });

      it(
        'C423559 Create a new MARC authority record with "Local" authority file selected which includes default prefix in it (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'shiftLeft', 'C423559'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(headerText);
          MarcAuthority.checkSourceFileSelectShown();
          MarcAuthority.setValid008DropdownValues();

          MarcAuthority.selectSourceFile(localAuthFile.name);

          QuickMarcEditor.checkFourthBoxEditable(1, false);
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

            MarcAuthorities.waitLoading();
            cy.wait(6000); // wait for source file assignment to be registered in the system

            MarcAuthorities.clickMultiSelectToggleButtonInAccordion('Authority source');
            MarcAuthorities.checkAuthoritySourceDropdownHasOption(localAuthFile.name);

            MarcAuthorities.chooseAuthoritySourceOption(localAuthFile.name);
            MarcAuthorities.checkSelectedAuthoritySource(localAuthFile.name);
            MarcAuthorities.checkAfterSearch('Authorized', recordTitle);
            MarcAuthorities.selectAuthorityById(createdAuthorityId);
            MarcAuthority.waitLoading();
            MarcAuthority.contains(recordTitle);
          });
        },
      );
    });
  });
});
