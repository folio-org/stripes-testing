import Permissions from '../../../../support/dictionary/permissions';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix from '../../../../support/utils/stringTools';
import DateTools from '../../../../support/utils/dateTools';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import TopMenu from '../../../../support/fragments/topMenu';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', { retries: { runMode: 1 } }, () => {
      const randomPostfix = getRandomPostfix();
      const testData = {
        authorityHeading: `AT_C663332_MarcAuthority_${randomPostfix}`,
        date: DateTools.getFormattedDateWithSlashes({ date: new Date() }),
        createdRecordId: null,
        userProperties: null,
        searchOption: 'Keyword',
        prefix: 'n',
        startWithNumber: '97000000',
        fieldsToUpdate: [
          { tag: '010', content: '$a testUpdate010', action: 'Edited' },
          { tag: '024', content: '$a testUpdate024', action: 'Edited' },
          { tag: '035', content: '$a testUpdate035', action: 'Edited' },
          { tag: '040', content: '$a testUpdate040', action: 'Edited' },
          { tag: '046', content: '$f testUpdate046', action: 'Edited' },
          //   { tag: '100', content: '$a testUpdate100', action: 'Edited' },
          { tag: '336', content: '$a testUpdate336', action: 'Edited' },
          { tag: '368', content: '$a testUpdate368', action: 'Edited' },
          { tag: '370', content: '$e testUpdate370', action: 'Edited' },
          { tag: '372', content: '$a testUpdate372', action: 'Edited' },
          { tag: '373', content: '$a testUpdate373', action: 'Edited' },
          { tag: '374', content: '$a testUpdate374', action: 'Edited' },
          { tag: '375', content: '$a testUpdate375', action: 'Edited' },
          { tag: '377', content: '$a testUpdate377', action: 'Edited' },
          { tag: '378', content: '$q testUpdate378', action: 'Edited' },
          { tag: '380', content: '$a testUpdate380', action: 'Edited' },
          { tag: '381', content: '$a testUpdate381', action: 'Edited' },
          { tag: '382', content: '$a testUpdate382', action: 'Edited' },
          { tag: '500', content: '$a testUpdate500', action: 'Edited' },
          { tag: '510', content: '$a testUpdate510', action: 'Edited' },
          { tag: '667', content: '$a testUpdate667', action: 'Edited' },
          { tag: '670', content: '$a testUpdate670', action: 'Edited' },
          { tag: '700', content: '$a testUpdate700', action: 'Edited' },
        ],
        repeatableFieldsToAdd: [
          { tag: '400', content: '$a testRepeatable400_22', action: 'Added' },
          { tag: '400', content: '$a testRepeatable400_23', action: 'Removed' },
          { tag: '400', content: '$a testRepeatable400_24', action: 'Edited' },
        ],
        ldrRegExp: /^\d{5}[a-zA-Z]{2}.{2}[a-zA-Z0-9]{9}.{2}4500$/,
      };

      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];

      const marcAuthorityFields = [
        {
          tag: '100',
          content: `$a ${testData.authorityHeading}`,
          indicators: ['1', '\\'],
        },
        {
          tag: '010',
          content: '$a original010',
          indicators: ['\\', '\\'],
        },
        {
          tag: '024',
          content: '$a original024',
          indicators: ['7', '\\'],
        },
        {
          tag: '035',
          content: '$a original035',
          indicators: ['\\', '\\'],
        },
        {
          tag: '040',
          content: '$a original040',
          indicators: ['\\', '\\'],
        },
        {
          tag: '046',
          content: '$f original046',
          indicators: ['\\', '\\'],
        },
        {
          tag: '336',
          content: '$a original336',
          indicators: ['\\', '\\'],
        },
        {
          tag: '368',
          content: '$a original368',
          indicators: ['\\', '\\'],
        },
        {
          tag: '370',
          content: '$e original370',
          indicators: ['\\', '\\'],
        },
        {
          tag: '372',
          content: '$a original372',
          indicators: ['\\', '\\'],
        },
        {
          tag: '373',
          content: '$a original373',
          indicators: ['\\', '\\'],
        },
        {
          tag: '374',
          content: '$a original374',
          indicators: ['\\', '\\'],
        },
        {
          tag: '375',
          content: '$a original375',
          indicators: ['\\', '\\'],
        },
        {
          tag: '377',
          content: '$a original377',
          indicators: ['\\', '\\'],
        },
        {
          tag: '378',
          content: '$q original378',
          indicators: ['\\', '\\'],
        },
        {
          tag: '380',
          content: '$a original380',
          indicators: ['\\', '\\'],
        },
        {
          tag: '381',
          content: '$a original381',
          indicators: ['\\', '\\'],
        },
        {
          tag: '382',
          content: '$a original382',
          indicators: ['\\', '0'],
        },
        {
          tag: '400',
          content: '$a original400_1',
          indicators: ['1', '\\'],
        },
        {
          tag: '400',
          content: '$a original400_2',
          indicators: ['1', '\\'],
        },
        {
          tag: '400',
          content: '$a original400_3',
          indicators: ['1', '\\'],
        },
        {
          tag: '500',
          content: '$a original500',
          indicators: ['1', '\\'],
        },
        {
          tag: '510',
          content: '$a original510',
          indicators: ['2', '\\'],
        },
        {
          tag: '667',
          content: '$a original667',
          indicators: ['\\', '\\'],
        },
        {
          tag: '670',
          content: '$a original670',
          indicators: ['\\', '\\'],
        },
        {
          tag: '700',
          content: '$a original700',
          indicators: ['1', '\\'],
        },
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C663332*');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(
            testData.prefix,
            testData.startWithNumber,
            marcAuthorityFields,
          ).then((createdRecordId) => {
            testData.createdRecordId = createdRecordId;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
            MarcAuthorities.searchBy(testData.searchOption, testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthority.deleteViaAPI(testData.createdRecordId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C663332 Check "Version history" pane after Update of 20 unique fields of "MARC authority" record via "quickmarc" (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C663332'] },
        () => {
          MarcAuthority.edit();
          QuickMarcEditor.waitLoading();

          testData.fieldsToUpdate.forEach((field) => {
            QuickMarcEditor.updateExistingField(field.tag, field.content);
            cy.wait(100);
          });

          testData.repeatableFieldsToAdd.forEach((field) => {
            const rowIndex = parseInt(field.content.match(/\d+$/)[0], 10);
            QuickMarcEditor.updateExistingFieldContent(rowIndex, field.content);
            cy.wait(100);
          });

          cy.wait(3000);
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkAfterSaveAndCloseAuthority();

          MarcAuthority.waitLoading();
          MarcAuthority.contains(testData.authorityHeading);

          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();
          VersionHistorySection.verifyVersionHistoryPane(2);

          VersionHistorySection.verifyVersionHistoryCard(
            0,
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
            false,
            true,
          );

          testData.fieldsToUpdate.forEach((field) => {
            VersionHistorySection.checkChangeByTag(field.tag, field.action);
          });

          testData.repeatableFieldsToAdd.slice(0, 2).forEach((field) => {
            VersionHistorySection.checkChangeByTag(field.tag, field.action);
          });

          VersionHistorySection.openChangesForCard(0);
          VersionHistorySection.verifyChangesModal(
            testData.date,
            testData.userProperties.firstName,
            testData.userProperties.lastName,
          );

          testData.fieldsToUpdate.forEach((field) => {
            const originalField = marcAuthorityFields.find((f) => f.tag === field.tag);
            const fromContent = originalField ? originalField.content : undefined;
            const toContent = field.content;

            VersionHistorySection.checkChangeInModalWithIndicators(
              field.action,
              field.tag,
              originalField.indicators,
              fromContent,
              toContent,
            );
          });

          VersionHistorySection.verifyModalScrollbar();
          VersionHistorySection.closeChangesModal();
          VersionHistorySection.clickCloseButton();
        },
      );
    });
  });
});
