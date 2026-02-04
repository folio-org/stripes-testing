import Permissions from '../../../support/dictionary/permissions';
import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import { DEFAULT_FOLIO_AUTHORITY_FILES } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';

describe('Data Export', () => {
  describe('Export of Local MARC authority record', () => {
    const LC_NAME_AUTHORITY_FILE = DEFAULT_FOLIO_AUTHORITY_FILES.LC_NAME_AUTHORITY_FILE;
    const userPermissionSet = [
      Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
      Permissions.uiQuickMarcQuickMarcAuthorityCreate.gui,
      Permissions.uiMarcAuthoritiesAuthorityRecordCreate.gui,
    ];
    let users = {};
    const authorityIdentifier = 'n96055058';
    const newFields = [
      { previousFieldTag: '008', tag: '010', content: `$a ${authorityIdentifier}` },
      { previousFieldTag: '010', tag: '035', content: '$a 794564', ind1: '1', ind2: '2' },
      {
        previousFieldTag: '035',
        tag: '100',
        content: '$a C436900John Doe $c Sir, $d 1909-1965 $l eng',
      },
      {
        previousFieldTag: '100',
        tag: '400',
        content: '$a C436900Huan Doe $c Senior, $d 1909-1965 $l eng',
      },
      { previousFieldTag: '400', tag: '500', content: '$a C436900La familia' },
    ];
    const exportedInstanceFileName = `C436900 exportedMarcAuthFile${getRandomPostfix()}.mrc`;
    const rawMrcFileData = [
      'an  96055058',
      '12a794564',
      'aC436900John DoecSir,d1909-1965leng',
      'aC436900Huan DoecSenior,d1909-1965leng',
      'aC436900La familia',
    ];

    before('Create users, data', () => {
      cy.getAdminToken();
      cy.withinTenant(Affiliations.College, () => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(authorityIdentifier);
      });

      MarcAuthorities.setAuthoritySourceFileActivityViaAPI(LC_NAME_AUTHORITY_FILE);
      cy.createTempUser(userPermissionSet).then((userProperties) => {
        users = userProperties;

        cy.affiliateUserToTenant({
          tenantId: Affiliations.College,
          userId: users.userId,
          permissions: userPermissionSet,
        });

        cy.resetTenant();
        cy.login(users.username, users.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        }).then(() => {
          cy.waitForAuthRefresh(() => {
            ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
            ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.college);
          });
        });
      });
    });

    after('Delete users, data', () => {
      cy.withinTenant(Affiliations.Consortia, () => {
        cy.getAdminToken();
        if (users?.userId) Users.deleteViaApi(users.userId);
      });
      cy.withinTenant(Affiliations.College, () => {
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(authorityIdentifier);
        FileManager.deleteFileFromDownloadsByMask('QuickAuthorityExport*');
        FileManager.deleteFileFromDownloadsByMask(exportedInstanceFileName);
        FileManager.deleteFile(`cypress/fixtures/${exportedInstanceFileName}`);
      });
    });

    it(
      'C436900 Export of created Local MARC authority record from Member tenant (consortia) (spitfire)',
      { tags: ['criticalPathECS', 'spitfire', 'C436900'] },
      () => {
        MarcAuthorities.clickActionsAndNewAuthorityButton();
        QuickMarcEditor.checkPaneheaderContains('Create a new local MARC authority record');
        MarcAuthority.checkSourceFileSelectShown();
        MarcAuthority.selectSourceFile(LC_NAME_AUTHORITY_FILE);
        MarcAuthority.setValid008DropdownValues();

        newFields.forEach((newField) => {
          MarcAuthority.addNewFieldAfterExistingByTag(
            newField.previousFieldTag,
            newField.tag,
            newField.content,
            newField.ind1 || '\\',
            newField.ind2 || '\\',
          );
        });
        QuickMarcEditor.checkContentByTag('001', authorityIdentifier);
        QuickMarcEditor.pressSaveAndClose();
        MarcAuthority.verifyAfterSaveAndClose();

        MarcAuthorities.closeMarcViewPane();
        MarcAuthorities.searchBy('Keyword', authorityIdentifier);

        cy.intercept('/data-export/quick-export').as('getHrid');
        MarcAuthorities.checkSelectAuthorityRecordCheckbox('C436900La familia');
        MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('1 record selected');
        MarcAuthorities.exportSelected();

        cy.withinTenant(Affiliations.College, () => {
          cy.wait('@getHrid', 10_000).then(
            ({
              response: {
                body: { jobExecutionHrId },
              },
            }) => {
              ExportFile.downloadExportedMarcFileWithRecordHrid(
                jobExecutionHrId,
                exportedInstanceFileName,
              );
              ExportFile.verifyFileIncludes(exportedInstanceFileName, rawMrcFileData);
            },
          );
        });
      },
    );
  });
});
