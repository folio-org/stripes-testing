import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../../support/constants';
import Permissions from '../../../../../support/dictionary/permissions';
import DataImport from '../../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../../support/fragments/topMenu';
import Users from '../../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Bibliographic', () => {
    describe('Edit MARC bib', () => {
      describe('Automated linking', () => {
        let userData = {};

        const testData = {
          searchOption: 'Identifier (all)',
          searchValue: 'n 2008052406',
          new31RowValue: '$a C388512Lesbian authors $z Jamaica $v Biography. $0 sh96007532',
          new32RowValue: '$a C388512Lesbian activists $z Jamaica $v Biography.',
          searchAuthorityQueries: [
            'C388512Authors, Jamaican',
            'C388512Lesbian authors',
            'C388512Lesbian activists',
            'C388512*',
          ],
          rowsToUnlink: [27, 30, 31],
          rowsAbleToLink: [16, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 40, 41, 42, 43, 44],
          field100Values: [
            16,
            '100',
            '1',
            '\\',
            '$a Chin, Staceyann, $d 1972- $e author. $0 n2008052406',
          ],
          field600AfterManualLinking: [
            27,
            '600',
            '1',
            '0',
            '$a C388512Chin, Staceyann, $d 1972-',
            '$x Childhood and youth.',
            '$0 http://id.loc.gov/authorities/names/n2008052406',
            '',
          ],
          calloutMessage: 'Field 600 and 650 has been linked to MARC authority record(s).',
        };

        const linkedTags = [
          [
            27,
            '600',
            '1',
            '0',
            '$a C388512Chin, Staceyann, $d 1972- $t Crossfire. $h Spoken word',
            '$x Childhood and youth.',
            '$0 http://id.loc.gov/authorities/names/no2021056179',
            '',
          ],
          [
            29,
            '650',
            '\\',
            '0',
            '$a C388512Authors, Jamaican',
            '$y 21st century $v Biography.',
            '$0 http://id.loc.gov/authorities/subjects/sh85009934',
            '',
          ],
          [
            30,
            '650',
            '\\',
            '0',
            '$a C388512Lesbian authors',
            '$z Jamaica $v Biography.',
            '$0 http://id.loc.gov/authorities/subjects/sh99014709',
            '',
          ],
          [
            31,
            '650',
            '\\',
            '0',
            '$a C388512Lesbian activists',
            '$z Jamaica $v Biography.',
            '$0 http://id.loc.gov/authorities/subjects/sh96007531',
            '',
          ],
        ];

        const marcFiles = [
          {
            marc: 'marcBibFileForC388512.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthFileForC388512_1.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388512_2.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388512_3.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388512_4.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthFileForC388512_5.mrc',
            fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            propertyName: 'authority',
          },
        ];

        const linkableFields = [
          100, 110, 111, 130, 240, 600, 610, 611, 630, 650, 651, 655, 700, 710, 711, 730, 800, 810,
          811, 830,
        ];

        const createdRecordIDs = [];

        before(() => {
          cy.createTempUser([
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          ]).then((createdUserProperties) => {
            userData = createdUserProperties;

            InventoryInstances.deleteInstanceByTitleViaApi(
              'The other side of paradise (test delete eligible for linking field and use autolinking)',
            );
            testData.searchAuthorityQueries.forEach((query) => {
              MarcAuthorities.deleteMarcAuthorityByTitleViaAPI(query);
            });

            cy.getAdminToken();
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

            linkableFields.forEach((tag) => {
              QuickMarcEditor.setRulesForField(tag, true);
            });

            cy.login(userData.username, userData.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
          });
        });

        after('Deleting created users, Instances', () => {
          cy.getAdminToken();
          Users.deleteViaApi(userData.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });

        it(
          'C388512 Delete one eligible for linking field >> click on "Link headings" button when edit "MARC bib" (spitfire) (TaaS)',
          { tags: ['extendedPath', 'spitfire', 'C388512'] },
          () => {
            InventoryInstances.searchByTitle(createdRecordIDs[0]);
            InventoryInstances.selectInstance();

            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.checkLinkHeadingsButton();

            QuickMarcEditor.deleteFieldByTagAndCheck('100');
            QuickMarcEditor.afterDeleteNotification('100');

            QuickMarcEditor.clickLinkHeadingsButton();
            QuickMarcEditor.checkCallout(testData.calloutMessage);
            QuickMarcEditor.verifyDisabledLinkHeadingsButton();

            linkedTags.forEach((field) => {
              QuickMarcEditor.verifyTagFieldAfterLinking(...field);
            });

            testData.rowsToUnlink.forEach((rowIndex) => {
              QuickMarcEditor.clickUnlinkIconInTagField(rowIndex);
              QuickMarcEditor.confirmUnlinkingField();
              cy.wait(500);
              QuickMarcEditor.verifyIconsAfterUnlinking(rowIndex);
            });
            QuickMarcEditor.verifyEnabledLinkHeadingsButton();

            QuickMarcEditor.clickLinkIconInTagField(27);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.searchResultsWithOption(testData.searchOption, testData.searchValue);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyTagFieldAfterLinking(...testData.field600AfterManualLinking);

            QuickMarcEditor.updateExistingFieldContent(30, testData.new31RowValue);
            QuickMarcEditor.updateExistingFieldContent(31, testData.new32RowValue);

            QuickMarcEditor.undoDelete();
            QuickMarcEditor.verifyTagFieldNotLinked(...testData.field100Values);
            QuickMarcEditor.clickSaveAndKeepEditing();
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(27);
            QuickMarcEditor.verifyUnlinkAndViewAuthorityButtons(29);
            testData.rowsAbleToLink.forEach((rowIndex) => {
              QuickMarcEditor.checkLinkButtonExistByRowIndex(rowIndex);
            });
          },
        );
      });
    });
  });
});
