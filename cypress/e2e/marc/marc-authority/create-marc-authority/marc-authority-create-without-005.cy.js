import moment from 'moment';
import { including } from '@interactors/html';
import Permissions from '../../../../support/dictionary/permissions';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../../support/constants';
import ManageAuthorityFiles from '../../../../support/fragments/settings/marc-authority/manageAuthorityFiles';
import getRandomPostfix, { randomNDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Create MARC Authority', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = randomNDigitNumber(15);
      const sourceFieName = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
      const authorityHeading = `AT_C916259_MarcAuthority_${randomPostfix}`;
      const naturalId = `n916259${randomDigits}`;
      const tags = {
        tagLdr: 'LDR',
        tag005: '005',
        tag008: '008',
        tag010: '010',
        tag100: '100',
        tag333: '333',
      };
      const tag005rowIndex = 2;
      let userProperties;

      before('Create user and login', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
        ]).then((createdUser) => {
          userProperties = createdUser;
          ManageAuthorityFiles.setAuthorityFileToActiveViaApi(sourceFieName);
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Delete user and record', () => {
        cy.getAdminToken();
        ManageAuthorityFiles.unsetAuthorityFileAsActiveViaApi(sourceFieName);
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C916259_');
        Users.deleteViaApi(userProperties.userId);
      });

      it(
        'C916259 Create MARC authority record without "005" field (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'nonParallel', 'C916259'] },
        () => {
          MarcAuthorities.clickActionsAndNewAuthorityButton();
          QuickMarcEditor.checkRecordStatusNew();
          MarcAuthority.setValid008DropdownValues();
          QuickMarcEditor.checkSomeDropdownsMarkedAsInvalid(tags.tag008, false);

          MarcAuthority.selectSourceFile(sourceFieName);

          QuickMarcEditor.addNewField(tags.tag010, `$a ${naturalId}`, 3);
          QuickMarcEditor.checkContentByTag(tags.tag010, `$a ${naturalId}`);
          QuickMarcEditor.addNewField(tags.tag100, `$a ${authorityHeading}`, 4);
          QuickMarcEditor.checkContentByTag(tags.tag100, `$a ${authorityHeading}`);

          QuickMarcEditor.updateExistingTagName(tags.tag005, tags.tag333);
          QuickMarcEditor.verifyTagValue(tag005rowIndex, tags.tag333);
          QuickMarcEditor.checkDeleteButtonExist(tag005rowIndex);
          cy.wait(500);

          QuickMarcEditor.deleteFieldByTagAndCheck(tags.tag333);
          QuickMarcEditor.afterDeleteNotification(tags.tag333);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.checkDeleteModal(1);
          QuickMarcEditor.confirmDelete();
          cy.wait(2000);

          QuickMarcEditor.checkContentByTag(tags.tag005, including(moment().format('YYYYMMDD')));
        },
      );
    });
  });
});
