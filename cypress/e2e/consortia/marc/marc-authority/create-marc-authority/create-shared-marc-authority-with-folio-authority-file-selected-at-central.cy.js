import { Permissions } from '../../../../../support/dictionary';
import { calloutTypes } from '../../../../../../interactors';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import Affiliations, { tenantNames } from '../../../../../support/dictionary/affiliations';
import ConsortiumManager from '../../../../../support/fragments/settings/consortium-manager/consortium-manager';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import InteractorsTools from '../../../../../support/utils/interactorsTools';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority ', () => {
      const users = {};
      const field001 = '001';
      const newField100 = {
        rowIndex: 4,
        tag: '100',
        content: `$a Create a new Shared MARC authority record with FOLIO authority file test${getRandomPostfix()}`,
      };
      const newField010 = {
        rowIndex: 5,
        tag: '010',
        content: '$a n001342523',
      };
      const defaultAthorityFile = 'LC Name Authority file (LCNAF)';
      const createdRecordTitle = newField100.content.substring(3);
      const paneHeaderCreateNewSharedMarcAuthorityRecord =
        'Create a new shared MARC authority record';
      before('Create user, data', () => {
        cy.getAdminToken();

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
        ]).then((createdUserProperties) => {
          users.userProperties = createdUserProperties;

          cy.assignAffiliationToUser(Affiliations.College, users.userProperties.userId);
          cy.setTenant(Affiliations.College);
          cy.assignPermissionsToExistingUser(users.userProperties.userId, [
            Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          ]);

          cy.resetTenant();
          cy.login(users.userProperties.username, users.userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          }).then(() => {
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
          });
        });
      });

      after('Delete test data', () => {
        cy.resetTenant();
        cy.getAdminToken();
        Users.deleteViaApi(users.userProperties.userId);
      });

      it(
        'C423569 Create a new shared MARC authority record with "FOLIO" authority file selected at Central tenant (consortia) (spitfire)',
        { tags: ['criticalPathECS', 'spitfire'] },
        () => {
          // 1 Click on "Actions" button in second pane >> Select "+ New" option
          MarcAuthorities.clickNewAuthorityButton();
          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateNewSharedMarcAuthorityRecord);
          QuickMarcEditor.verifyAuthorityLookUpButton();

          // 2 Click on "Authority file look-up" hyperlink
          QuickMarcEditor.clickAuthorityLookUpButton();

          // 3 Click on the "Select authority file" placeholder in "Authority file name" dropdown and select any default "FOLIO" option
          QuickMarcEditor.selectAuthorityFile(defaultAthorityFile);
          QuickMarcEditor.verifyAuthorityFileSelected(defaultAthorityFile);

          // 4 Click on the "Save & close" button
          QuickMarcEditor.clickSaveAndCloseInModal();
          QuickMarcEditor.checkContentByTag(field001, '');

          // 5 Add 1 new field by clicking on "+" icon and fill it as specified:
          // 100 \\ "$a Create a new Shared MARC authority record with FOLIO authority file test"

          QuickMarcEditor.addNewField(newField100.tag, newField100.content, newField100.rowIndex);
          QuickMarcEditor.checkContentByTag(newField100.tag, newField100.content);

          // 6 Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          InteractorsTools.checkCalloutMessage(
            'Record cannot be saved without 010 field.',
            calloutTypes.error,
          );
          QuickMarcEditor.checkPaneheaderContains(paneHeaderCreateNewSharedMarcAuthorityRecord);

          // 7 Add 1 new field by clicking on "+" icon and fill it as specified:
          // 010 \\ "$a <prefix value of selected default authority file><identifier value> Example: "n001342523"
          QuickMarcEditor.addNewField(newField010.tag, newField010.content, newField010.rowIndex);
          QuickMarcEditor.checkContentByTag(newField010.tag, newField010.content);

          // 8 Click on the "Save & close" button
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(
            'This record has successfully saved and is in process. Changes may not appear immediately.',
          );
          MarcAuthorities.checkFieldAndContentExistence(newField010.tag, newField010.content);
          MarcAuthorities.checkFieldAndContentExistence(field001, newField010.content);

          // 9 Switch active affiliation to Member tenant
          ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          MarcAuthorities.waitLoading();

          // 10 Run search which will find created Shared MARC authority record:
          // Fill in the search box with identifier value of created record ("010 $a"), ex.: "n001342523"
          // Click on the "Search" button.
          MarcAuthorities.searchBeats(newField010.content);
          MarcAuthorities.verifyResultsRowContent(createdRecordTitle);
          MarcAuthorities.checkFieldAndContentExistence(newField010.tag, newField010.content);
          MarcAuthorities.checkFieldAndContentExistence(field001, newField010.content);

          // 11 Click on the "Authority source" multi select element in "Authority source" accordion placed on "Search & filter"
          // pane and select default authority file to which created record should be assigned (according to the prefix from "010" field)
          MarcAuthorities.chooseAuthoritySourceOption(defaultAthorityFile);
          MarcAuthorities.verifyResultsRowContent(createdRecordTitle);
          MarcAuthorities.checkFieldAndContentExistence(newField010.tag, newField010.content);
          MarcAuthorities.checkFieldAndContentExistence(field001, newField010.content);

          // 12 Click on the "Actions" in the third pane >> Select "Edit" option.
          MarcAuthority.edit();
          QuickMarcEditor.checkPaneheaderContains('Edit shared MARC authority record');
          QuickMarcEditor.checkContentByTag(newField010.tag, newField010.content);
          QuickMarcEditor.checkContentByTag(newField100.tag, newField100.content);
        },
      );
    });
  });
});
