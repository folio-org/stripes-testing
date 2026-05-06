import { DEFAULT_JOB_PROFILE_NAMES, APPLICATION_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import TopMenuNavigation from '../../../../../support/fragments/topMenuNavigation';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData = {};
        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];
        const createdRecordIDs = [];
        const naturalIds = ['n2008052404', 'sh96007532', 'sh99014708', 'sh85009933'];

        const marcFiles = [
          {
            marc: 'C388503MarcBib.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'C388503MarcAuth1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388503MarcAuth2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388503MarcAuth3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'C388503MarcAuth4.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numOfRecords: 1,
            propertyName: 'authority',
          },
        ];

        const testData = {
          searchQuery: 'C388503 The other side of paradise (test add/edit/delete',
          field100: {
            tag: '100',
            rowIndex: 16,
            contentWithValid$0$9:
              '$a C388503 Chin, Staceyann, $d 1972- $e author. $0 n2008052404 $9 acc6b9cb-c607-4a4f-8505-a0f1a4492295',
          },
          field600: {
            tag: '600',
            rowIndex: 27,
            contentWithInvalid$0$9:
              '$a C388503 Chin, Staceyann, $d 1972- $x Childhood and youth. $0 tst557766 $9 tst300',
          },
          field650AuthorsJamaican: {
            tag: '650',
            rowIndex: 29,
            originalContent:
              '$a C388503 Authors, Jamaican $y 21st century $v Biography. sh 85009922',
            editedContent:
              '$a C388503 Authors, Jamaican $y 21st century $v Biography. $0 sh85009933',
            linkedBoxFourth: '$a C388503 Authors, Jamaican',
            linkedBoxFifth: '$y 21st century $v Biography.',
            linkedBoxSixth: '$0 http://id.loc.gov/authorities/subjects/sh85009933',
          },
          field650LesbianAuthors: {
            tag: '650',
            rowIndex: 30,
            editedContent: '$a C388503 Lesbian authors $z Jamaica $v Biography. $0 sh 99014711',
          },
          field650LesbianActivists: {
            tag: '650',
            rowIndex: 31,
            deletedContent: '$a C388503 Lesbian activists $z Jamaica $v Biography.',
          },
          successCallout: 'Field 100 and 650 has been linked to MARC authority record(s).',
          errorCallout: 'Field 600 and 650 must be set manually by selecting the link icon.',
          authoritySearchValue: 'C388503 Authors, Jamaican',
        };

        before('Create test data', () => {
          cy.getAdminToken();
          naturalIds.forEach((id) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 200,
              query: `naturalId="${id}*" and authRefType=="Authorized"`,
            }).then((records) => {
              records.forEach((record) => {
                MarcAuthority.deleteViaAPI(record.id, true);
              });
            });
          });

          marcFiles.forEach((marcFile) => {
            DataImport.uploadFileViaApi(
              marcFile.marc,
              marcFile.fileName,
              marcFile.jobProfileToRun,
            ).then((response) => {
              response.forEach((record) => {
                createdRecordIDs.push(record[marcFile.propertyName].id);
              });
            });
          });

          cy.getAdminToken();
          linkableFields.forEach((tag) => {
            QuickMarcEditor.setRulesForField(tag, true);
          });

          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
          });
        });

        after('Delete test data', () => {
          cy.getAdminToken().then(() => {
            Users.deleteViaApi(userData.userId);
            createdRecordIDs.forEach((id, index) => {
              if (index === 0) InventoryInstance.deleteInstanceViaApi(id);
              else MarcAuthority.deleteViaAPI(id, true);
            });
          });
        });

        it(
          'C388503 Add/Edit/Delete subfield "$0" in the field before clicking on "Link headings" button when edit "MARC bib" (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388503'] },
          () => {
            InventoryInstances.searchByTitle(testData.searchQuery);
            InventoryInstances.selectInstance();
            InventoryInstance.waitLoading();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.waitLoading();
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            // Add valid $0 and $9 to field 100
            QuickMarcEditor.updateExistingFieldContent(
              testData.field100.rowIndex,
              testData.field100.contentWithValid$0$9,
            );
            QuickMarcEditor.checkContent(
              testData.field100.contentWithValid$0$9,
              testData.field100.rowIndex,
            );

            // Add invalid $0 and $9 to field 600
            QuickMarcEditor.updateExistingFieldContent(
              testData.field600.rowIndex,
              testData.field600.contentWithInvalid$0$9,
            );
            QuickMarcEditor.checkContent(
              testData.field600.contentWithInvalid$0$9,
              testData.field600.rowIndex,
            );

            // Edit $0 to match authority
            QuickMarcEditor.updateExistingFieldContent(
              testData.field650AuthorsJamaican.rowIndex,
              testData.field650AuthorsJamaican.editedContent,
            );
            QuickMarcEditor.checkContent(
              testData.field650AuthorsJamaican.editedContent,
              testData.field650AuthorsJamaican.rowIndex,
            );

            // Edit $0 to NOT match
            QuickMarcEditor.updateExistingFieldContent(
              testData.field650LesbianAuthors.rowIndex,
              testData.field650LesbianAuthors.editedContent,
            );
            QuickMarcEditor.checkContent(
              testData.field650LesbianAuthors.editedContent,
              testData.field650LesbianAuthors.rowIndex,
            );

            // Delete $0
            QuickMarcEditor.updateExistingFieldContent(
              testData.field650LesbianActivists.rowIndex,
              testData.field650LesbianActivists.deletedContent,
            );
            QuickMarcEditor.checkContent(
              testData.field650LesbianActivists.deletedContent,
              testData.field650LesbianActivists.rowIndex,
            );

            QuickMarcEditor.clickLinkHeadingsButton();
            cy.wait(1500);

            QuickMarcEditor.checkCallout(testData.successCallout);
            QuickMarcEditor.checkCallout(testData.errorCallout);

            QuickMarcEditor.verifyRowLinked(testData.field100.rowIndex, true);
            QuickMarcEditor.verifyTagFieldAfterLinking(
              testData.field650AuthorsJamaican.rowIndex,
              testData.field650AuthorsJamaican.tag,
              '\\',
              '0',
              testData.field650AuthorsJamaican.linkedBoxFourth,
              testData.field650AuthorsJamaican.linkedBoxFifth,
              testData.field650AuthorsJamaican.linkedBoxSixth,
              '',
            );

            QuickMarcEditor.verifyRowLinked(testData.field600.rowIndex, false);
            QuickMarcEditor.verifyRowLinked(testData.field650LesbianAuthors.rowIndex, false);
            QuickMarcEditor.verifyRowLinked(testData.field650LesbianActivists.rowIndex, false);
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();

            InventoryInstance.viewSource();
            InventoryViewSource.verifyLinkedToAuthorityIconIsPresent(true);
            InventoryViewSource.contains(`Linked to MARC authority\n\t${testData.field100.tag}`);
            InventoryViewSource.contains('C388503 Authors, Jamaican');

            TopMenuNavigation.navigateToApp(APPLICATION_NAMES.MARC_AUTHORITY);
            MarcAuthorities.waitLoading();

            MarcAuthorities.searchBy('Keyword', testData.authoritySearchValue);
            MarcAuthorities.selectTitle(testData.authoritySearchValue);
            MarcAuthority.waitLoading();

            cy.go('back');
            MarcAuthorities.verifyNumberOfTitlesForRowWithValue(testData.authoritySearchValue, '1');

            MarcAuthorities.clickNumberOfTitlesByHeading(testData.authoritySearchValue);
            InventoryInstance.waitInstanceRecordViewOpened(testData.searchQuery);
          },
        );
      });
    });
  });
});
