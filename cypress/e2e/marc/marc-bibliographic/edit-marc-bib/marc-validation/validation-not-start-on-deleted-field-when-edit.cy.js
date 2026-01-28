import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import getRandomPostfix from '../../../../../support/utils/stringTools';
import Users from '../../../../../support/fragments/users/users';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    const marcFile = {
      marc: 'marcBibFileForC552450.mrc',
      fileName: `C552450testMarcFile${getRandomPostfix()}.mrc`,
      jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
      numOfRecords: 1,
      propertyName: 'authority',
      queryValue: 'DC Talk (Musical group). Jesus freaks. Afrikaans 2',
    };
    const testData = {
      createdRecordIDs: [],
      userProperties: {},
    };

    const fields = {
      '110_1': {
        index: 8,
        newValue: '$a Updated Title',
        message: 'Fail: Field 1XX is non-repeatable and required.Help',
      },
      '110_2': { index: 9 },
      900: { index: 12 },
    };

    before(() => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C552450');
      cy.getSpecificationIds().then((specifications) => {
        specifications.forEach(({ id }) => {
          cy.syncSpecifications(id);
        });
      });

      cy.createTempUser([
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        DataImport.uploadFileViaApi(
          marcFile.marc,
          marcFile.fileName,
          marcFile.jobProfileToRun,
        ).then((response) => {
          response.forEach((record) => {
            testData.createdRecordIDs.push(record[marcFile.propertyName].id);
          });
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.marcAuthorities,
          waiter: MarcAuthorities.waitLoading,
        });
      });
    });

    after(() => {
      cy.getAdminToken();
      testData.createdRecordIDs.forEach((id) => {
        MarcAuthorities.deleteViaAPI(id);
      });
      Users.deleteViaApi(testData.userProperties.userId);
    });

    describe('Edit MARC bib', () => {
      it(
        "C552450 MARC validation doesn't start on deleted field during editing of MARC authority record (spitfire)",
        { tags: ['criticalPath', 'spitfire', 'C552450'] },
        () => {
          MarcAuthorities.searchBy('Keyword', marcFile.queryValue);
          MarcAuthorities.selectFirst(marcFile.queryValue);
          MarcAuthority.edit();

          MarcAuthority.updateDataByRowIndex(fields['110_1'].index, fields['110_1'].newValue);
          QuickMarcEditor.pressSaveAndCloseButton();

          QuickMarcEditor.checkErrorMessageForField(fields['110_1'].index, fields['110_1'].message);

          QuickMarcEditor.updateExistingTagValue(fields['110_2'].index, ' ');
          QuickMarcEditor.deleteField(fields['110_2'].index);
          QuickMarcEditor.deleteField(fields['900'].index);

          QuickMarcEditor.clickSaveAndKeepEditingButton();
          QuickMarcEditor.confirmDelete();
          QuickMarcEditor.verifyAndDismissRecordUpdatedCallout();
        },
      );
    });
  });
});
