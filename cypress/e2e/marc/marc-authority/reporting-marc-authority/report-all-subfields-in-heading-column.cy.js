import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import ExportManagerSearchPane from '../../../../support/fragments/exportManager/exportManagerSearchPane';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import DateTools from '../../../../support/utils/dateTools';
import getRandomPostfix from '../../../../support/utils/stringTools';
import TopMenuNavigation from '../../../../support/fragments/topMenuNavigation';
import FileManager from '../../../../support/utils/fileManager';
import InteractorsTools from '../../../../support/utils/interactorsTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Reporting | MARC authority', () => {
      const postfix = getRandomPostfix();
      const authorityFile = 'marcAuthFileC494105.mrc';
      const jobProfile = DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY;
      const createdAuthorityIDs = [];
      let user;

      const personalName = {
        tag: '100',
        updatedFieldValue:
          '$a AT_C494105 Personal name 100 Elizabeth $b II, $c Queen of Great Britain, $d 1926- $g subg $q subq $k subk $v Musical settings $x Literary style $x Stage history $y 1950-UPD $z England',
        originalHeading:
          'AT_C494105 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq--Musical settings--Literary style--Stage history--1950---England',
        newHeading:
          'AT_C494105 Personal name 100 Elizabeth II, Queen of Great Britain, 1926- subg subq--Musical settings--Literary style--Stage history--1950-UPD--England',
      };
      const corporateName = {
        tag: '110',
        updatedFieldValue:
          '$a AT_C494105 Corporate name 110 Apple & Honey Productions $b subb $c subc $d subd $g subg $n subn $k subk $v subv $x subx $y subyUPD $z subz',
        originalHeading:
          'AT_C494105 Corporate name 110 Apple & Honey Productions subb subc subd subg subn--subv--subx--suby--subz',
        newHeading:
          'AT_C494105 Corporate name 110 Apple & Honey Productions subb subc subd subg subn--subv--subx--subyUPD--subz',
      };
      const conferenceName = {
        tag: '111',
        updatedFieldValue:
          '$a AT_C494105 Conference Name 111 Western Region Agricultural Education Research Meeting $c subc $d subd $n subn $q subq $g subg $s subk $v subv $x subx $y subyUPD $z subz',
        originalHeading:
          'AT_C494105 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg--subv--subx--suby--subz',
        newHeading:
          'AT_C494105 Conference Name 111 Western Region Agricultural Education Research Meeting subc subd subn subq subg--subv--subx--subyUPD--subz',
      };

      before('Create user, import authority file', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C494105');
        DataImport.uploadFileViaApi(
          authorityFile,
          `${authorityFile.split('.')[0]}.${postfix}.mrc`,
          jobProfile,
        ).then((response) => {
          response.forEach((record) => {
            createdAuthorityIDs.push(record.authority.id);
          });
        });

        cy.createTempUser([
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.inventoryAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.exportManagerAll.gui,
        ]).then((createdUserProperties) => {
          user = createdUserProperties;
          cy.login(user.username, user.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
            authRefresh: true,
          });
        });
      });

      after('Delete user, data', () => {
        cy.getAdminToken();
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        createdAuthorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id, true);
        });
        Users.deleteViaApi(user.userId);
      });

      it(
        'C494105 Verify that data from all valid subfields displays in "heading" column of "MARC authority headings updates (CSV)" report (spitfire)',
        { tags: ['criticalPath', 'C494105', 'spitfire'] },
        () => {
          const today = DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD');
          const tomorrow = DateTools.getTomorrowDayDateForFiscalYear();

          // Update Personal Name record
          MarcAuthorities.searchBeats(personalName.originalHeading);
          MarcAuthorities.selectFirst();
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(personalName.tag, personalName.updatedFieldValue);
          QuickMarcEditor.checkContentByTag(personalName.tag, personalName.updatedFieldValue);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          InteractorsTools.closeAllVisibleCallouts();
          MarcAuthorities.clickResetAndCheck(personalName.originalHeading);

          // Update Corporate Name record
          MarcAuthorities.searchBeats(corporateName.originalHeading);
          MarcAuthorities.selectFirst();
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(corporateName.tag, corporateName.updatedFieldValue);
          QuickMarcEditor.checkContentByTag(corporateName.tag, corporateName.updatedFieldValue);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();
          InteractorsTools.closeAllVisibleCallouts();
          MarcAuthorities.clickResetAndCheck(corporateName.originalHeading);

          // Update Conference Name record
          MarcAuthorities.searchBeats(conferenceName.originalHeading);
          MarcAuthorities.selectFirst();
          MarcAuthority.edit();
          QuickMarcEditor.updateExistingField(conferenceName.tag, conferenceName.updatedFieldValue);
          QuickMarcEditor.checkContentByTag(conferenceName.tag, conferenceName.updatedFieldValue);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          // Generate report
          MarcAuthorities.clickActionsAndReportsButtons();
          MarcAuthorities.fillReportModal(today, tomorrow);

          cy.intercept('POST', '/data-export-spring/jobs').as('getId');
          MarcAuthorities.clickExportButton();
          cy.wait('@getId', { timeout: 10000 }).then((item) => {
            MarcAuthorities.checkCalloutAfterExport(item.response.body.name);
            // Verify report in Export Manager
            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.EXPORT_MANAGER);
            ExportManagerSearchPane.waitLoading();
            ExportManagerSearchPane.searchByAuthorityControl();
            ExportManagerSearchPane.downloadLastCreatedJob(item.response.body.name);
            // Waiter needed for the job file to be downloaded.
            cy.wait(1000);

            const downloadedReportDate = DateTools.getFormattedDate({ date: new Date() });
            const fileNameMask = `${downloadedReportDate}*`;
            FileManager.verifyFile(
              MarcAuthorities.verifyMARCAuthorityFileName,
              fileNameMask,
              MarcAuthorities.verifyContentOfExportFile,
              [
                personalName.originalHeading,
                personalName.newHeading,
                corporateName.originalHeading,
                corporateName.newHeading,
                conferenceName.originalHeading,
                conferenceName.newHeading,
              ],
            );
          });
        },
      );
    });
  });
});
